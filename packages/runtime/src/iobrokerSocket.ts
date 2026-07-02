import { appendDiagnostic } from "./diagnostics";

export interface IoBrokerCommandResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface IoBrokerSocketLike {
  readFile?(
    adapterName: string | null,
    path: string,
    base64OrCallback?:
      boolean | ((errorOrResponse?: unknown, data?: unknown, mimeType?: string) => void),
  ): Promise<unknown> | void;
  sendTo?(
    instance: string,
    command: string,
    payload: unknown,
    callback?: (response: unknown) => void,
  ): Promise<unknown> | void;
  writeFile?(
    adapterName: string | null,
    path: string,
    data: string,
    callback?: (errorOrResponse?: unknown) => void,
  ): Promise<unknown> | void;
  writeFile64?(
    adapterName: string,
    path: string,
    data: ArrayBuffer | string,
  ): Promise<unknown> | void;
  emit(event: string, ...args: unknown[]): void;
}

type IoBrokerSocketFactory = {
  (url?: string, options?: Record<string, unknown>): IoBrokerSocketLike;
  connect?: (url?: string, options?: Record<string, unknown>) => IoBrokerSocketLike;
};

type IoBrokerWindow = Window & {
  io?: IoBrokerSocketFactory;
  socket?: IoBrokerSocketLike;
  adapterInstance?: number;
};

declare global {
  interface Window {
    io?: IoBrokerSocketFactory;
    socket?: IoBrokerSocketLike;
    adapterInstance?: number;
  }
}

let socketPromise: Promise<IoBrokerSocketLike | undefined> | undefined;

export async function sendIoBrokerCommand<T>(
  adapterName: string,
  command: string,
  payload: unknown,
): Promise<T | undefined> {
  const socket = await resolveIoBrokerSocket();
  if (!socket) {
    appendDiagnostic("warn", `sendTo ${command} skipped: no ioBroker socket`);
    return undefined;
  }

  const instance = `${adapterName}.${readIoBrokerAdapterInstance(adapterName) ?? 0}`;
  appendDiagnostic(
    "info",
    `sendTo ${command} start target=${instance} capabilities=${describeIoBrokerSocket(socket)}`,
  );
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      settled = true;
      appendDiagnostic("error", `sendTo ${command} failed: timeout target=${instance}`);
      reject(new Error(`Command ${command} timed out.`));
    }, 8000);

    const done = (response: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      const normalized = normalizeResponse<T>(response);
      if (!normalized.ok) {
        appendDiagnostic(
          "error",
          `sendTo ${command} failed: ${normalized.error ?? "ioBroker command failed"}`,
        );
        reject(new Error(normalized.error ?? `Command ${command} failed.`));
        return;
      }
      appendDiagnostic("info", `sendTo ${command} ok`);
      resolve(normalized.data);
    };

    try {
      if (typeof socket.sendTo === "function") {
        appendDiagnostic("info", `sendTo ${command} using socket.sendTo`);
        const result = socket.sendTo(instance, command, payload, done);
        if (result && typeof result.then === "function") {
          result
            .then((response: unknown) => {
              if (response !== undefined) {
                done(response);
              }
            })
            .catch((error: unknown) => {
              if (settled) {
                return;
              }
              settled = true;
              window.clearTimeout(timeout);
              reject(error instanceof Error ? error : new Error(String(error)));
            });
        }
        return;
      }

      appendDiagnostic("info", `sendTo ${command} using raw socket.emit`);
      socket.emit("sendTo", instance, command, payload, done);
    } catch (error) {
      settled = true;
      window.clearTimeout(timeout);
      appendDiagnostic("error", `sendTo ${command} failed: ${readError(error)}`);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function resolveIoBrokerSocket(): Promise<IoBrokerSocketLike | undefined> {
  const existing = readExistingSocket();
  if (existing) {
    window.socket = existing;
    appendDiagnostic("info", `ioBroker socket resolved: ${describeIoBrokerSocket(existing)}`);
    return existing;
  }

  socketPromise ??= createSocket();
  const socket = await socketPromise;
  appendDiagnostic(
    socket ? "info" : "warn",
    socket
      ? `ioBroker socket created: ${describeIoBrokerSocket(socket)}`
      : "ioBroker socket not available",
  );
  return socket;
}

export function readIoBrokerAdapterInstance(adapterName: string): number | undefined {
  return parseIoBrokerAdapterInstance(window.location.href, window.location.search, adapterName);
}

export function parseIoBrokerAdapterInstance(
  href: string,
  search: string,
  adapterName: string,
): number | undefined {
  const params = new URLSearchParams(search);
  const explicit = params.get("instance") ?? params.get("adapterInstance");
  const parsedExplicit = parseInstanceNumber(explicit);
  if (parsedExplicit !== undefined) {
    return parsedExplicit;
  }

  const adapterMatch = href.match(new RegExp(`${escapeRegExp(adapterName)}\\.(\\d+)`));
  const parsedAdapterMatch = parseInstanceNumber(adapterMatch?.[1]);
  if (parsedAdapterMatch !== undefined) {
    return parsedAdapterMatch;
  }

  const rawSearch = search.replace(/^\?/, "").split("&")[0];
  return parseInstanceNumber(rawSearch);
}

function readExistingSocket(): IoBrokerSocketLike | undefined {
  return readWindowValue((candidate) => {
    const socket = candidate.socket;
    if (socket && isUsableSocket(socket)) {
      return socket;
    }
    return undefined;
  });
}

async function createSocket(): Promise<IoBrokerSocketLike | undefined> {
  appendDiagnostic("info", "Loading /socket.io/socket.io.js for ioBroker socket fallback");
  await ensureSocketIoScript();
  const factory = readWindowValue((candidate) => candidate.io);
  if (!factory) {
    appendDiagnostic("warn", "No ioBroker socket factory found after socket.io script load");
    return undefined;
  }

  const socket = factory.connect ? factory.connect() : factory();
  window.socket = socket;
  return socket;
}

export function describeIoBrokerSocket(socket: IoBrokerSocketLike): string {
  const methods = [
    ["sendTo", socket.sendTo],
    ["readFile", socket.readFile],
    ["writeFile", socket.writeFile],
    ["writeFile64", socket.writeFile64],
    ["emit", socket.emit],
  ]
    .filter(([, value]) => typeof value === "function")
    .map(([name]) => name);
  return methods.length ? methods.join(",") : "no-known-methods";
}

function isUsableSocket(socket: IoBrokerSocketLike): boolean {
  return (
    typeof socket.sendTo === "function" ||
    typeof socket.readFile === "function" ||
    typeof socket.writeFile === "function" ||
    typeof socket.writeFile64 === "function" ||
    typeof socket.emit === "function"
  );
}

function normalizeResponse<T>(response: unknown): IoBrokerCommandResponse<T> {
  if (isRecord(response) && "ok" in response) {
    if (response.ok) {
      return { ok: true, data: response.data as T };
    }
    return { ok: false, error: String(response.error ?? "ioBroker command failed.") };
  }

  if (isRecord(response) && "error" in response) {
    return { ok: false, error: String(response.error ?? "ioBroker command failed.") };
  }

  return { ok: true, data: response as T };
}

async function ensureSocketIoScript(): Promise<void> {
  if (readWindowValue((candidate) => candidate.io)) {
    return;
  }

  await new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "/socket.io/socket.io.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function readWindowValue<T>(reader: (candidate: IoBrokerWindow) => T | undefined): T | undefined {
  const candidates = [window, safeWindow(() => window.parent), safeWindow(() => window.top)];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    try {
      const value = reader(candidate as IoBrokerWindow);
      if (value) {
        return value;
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

function safeWindow(read: () => Window | null): Window | undefined {
  try {
    return read() ?? undefined;
  } catch {
    return undefined;
  }
}

function parseInstanceNumber(value: string | null | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

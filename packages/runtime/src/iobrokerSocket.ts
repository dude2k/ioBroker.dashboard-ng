export interface IoBrokerCommandResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface IoBrokerSocketLike {
  sendTo?(
    instance: string,
    command: string,
    payload: unknown,
    callback?: (response: unknown) => void,
  ): Promise<unknown> | void;
  emit(
    event: "sendTo",
    instance: string,
    command: string,
    payload: unknown,
    callback: (response: IoBrokerCommandResponse<unknown>) => void,
  ): void;
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
    return undefined;
  }

  const instance = `${adapterName}.${readIoBrokerAdapterInstance(adapterName) ?? 0}`;
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(`Command ${command} timed out.`));
    }, 8000);

    const done = (response: unknown) => {
      window.clearTimeout(timeout);
      const normalized = normalizeResponse<T>(response);
      if (!normalized.ok) {
        reject(new Error(normalized.error ?? `Command ${command} failed.`));
        return;
      }
      resolve(normalized.data);
    };

    try {
      if (typeof socket.sendTo === "function") {
        const result = socket.sendTo(instance, command, payload, done);
        if (result && typeof result.then === "function") {
          result.then(done).catch((error: unknown) => {
            window.clearTimeout(timeout);
            reject(error instanceof Error ? error : new Error(String(error)));
          });
        }
        return;
      }

      socket.emit("sendTo", instance, command, payload, done);
    } catch (error) {
      window.clearTimeout(timeout);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function resolveIoBrokerSocket(): Promise<IoBrokerSocketLike | undefined> {
  const existing = readExistingSocket();
  if (existing) {
    window.socket = existing;
    return existing;
  }

  socketPromise ??= createSocket();
  return socketPromise;
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
    if (socket && (typeof socket.sendTo === "function" || typeof socket.emit === "function")) {
      return socket;
    }
    return undefined;
  });
}

async function createSocket(): Promise<IoBrokerSocketLike | undefined> {
  await ensureSocketIoScript();
  const factory = readWindowValue((candidate) => candidate.io);
  if (!factory) {
    return undefined;
  }

  const socket = factory.connect ? factory.connect() : factory();
  window.socket = socket;
  return socket;
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

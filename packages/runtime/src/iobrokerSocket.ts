import { AdminConnection, type ConnectionProps } from "@iobroker/socket-client";
import { appendDiagnostic, describeDiagnosticValue } from "./diagnostics";

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
  emit?(event: string, ...args: unknown[]): void;
}

export interface IoBrokerCommandOptions {
  traceId?: string;
  timeoutMs?: number;
}

type IoBrokerSocketFactory = {
  (url?: string, options?: Record<string, unknown>): unknown;
  connect?: (url?: string, options?: Record<string, unknown>) => unknown;
};

type IoBrokerWindow = Window & {
  io?: IoBrokerSocketFactory;
  iob?: IoBrokerSocketFactory;
  socket?: IoBrokerSocketLike;
  dashboardNgConnection?: IoBrokerSocketLike;
  adapterInstance?: number;
};

declare global {
  interface Window {
    io?: IoBrokerSocketFactory;
    iob?: IoBrokerSocketFactory;
    socket?: IoBrokerSocketLike;
    dashboardNgConnection?: IoBrokerSocketLike;
    socketPath?: string;
    adapterInstance?: number;
  }
}

let socketPromise: Promise<IoBrokerSocketLike | undefined> | undefined;

export async function sendIoBrokerCommand<T>(
  adapterName: string,
  command: string,
  payload: unknown,
  options: IoBrokerCommandOptions = {},
): Promise<T | undefined> {
  const traceId = options.traceId ?? command;
  const socket = await resolveIoBrokerSocket(traceId);
  if (!socket) {
    appendDiagnostic("warn", `[${traceId}] sendTo ${command} skipped: no ioBroker socket`);
    return undefined;
  }

  const instance = `${adapterName}.${readIoBrokerAdapterInstance(adapterName) ?? 0}`;
  appendDiagnostic("info", `[${traceId}] sendTo ${command} start`, {
    target: instance,
    capabilities: describeIoBrokerSocket(socket),
    payload: summarizeCommandPayload(payload),
  });
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      settled = true;
      appendDiagnostic("error", `[${traceId}] sendTo ${command} failed`, {
        reason: "timeout",
        target: instance,
        timeoutMs: options.timeoutMs ?? 8000,
      });
      reject(new Error(`Command ${command} timed out.`));
    }, options.timeoutMs ?? 8000);

    const done = (response: unknown) => {
      if (settled) {
        appendDiagnostic("warn", `[${traceId}] sendTo ${command} ignored late response`, {
          response: describeDiagnosticValue(response),
        });
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      appendDiagnostic("info", `[${traceId}] sendTo ${command} response received`, {
        response: describeDiagnosticValue(response),
      });
      const normalized = normalizeResponse<T>(response);
      if (!normalized.ok) {
        appendDiagnostic("error", `[${traceId}] sendTo ${command} failed`, {
          error: normalized.error ?? "ioBroker command failed",
        });
        reject(new Error(normalized.error ?? `Command ${command} failed.`));
        return;
      }
      appendDiagnostic("info", `[${traceId}] sendTo ${command} ok`, {
        data: describeDiagnosticValue(normalized.data),
      });
      resolve(normalized.data);
    };

    try {
      if (typeof socket.sendTo === "function") {
        appendDiagnostic("info", `[${traceId}] sendTo ${command} using socket.sendTo`);
        const result = socket.sendTo(instance, command, payload, done);
        if (result && typeof result.then === "function") {
          appendDiagnostic("info", `[${traceId}] sendTo ${command} returned promise`);
          result
            .then((response: unknown) => {
              appendDiagnostic("info", `[${traceId}] sendTo ${command} promise resolved`, {
                response: describeDiagnosticValue(response),
              });
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
              appendDiagnostic("error", `[${traceId}] sendTo ${command} promise rejected`, {
                error: readError(error),
              });
              reject(error instanceof Error ? error : new Error(String(error)));
            });
        } else {
          appendDiagnostic("info", `[${traceId}] sendTo ${command} waiting for callback`);
        }
        return;
      }

      if (typeof socket.emit !== "function") {
        throw new Error(`Socket has no sendTo or emit method for command ${command}.`);
      }
      appendDiagnostic("info", `[${traceId}] sendTo ${command} using raw socket.emit`);
      socket.emit("sendTo", instance, command, payload, done);
    } catch (error) {
      settled = true;
      window.clearTimeout(timeout);
      appendDiagnostic("error", `[${traceId}] sendTo ${command} failed`, {
        error: readError(error),
      });
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function resolveIoBrokerSocket(
  traceId = "socket",
): Promise<IoBrokerSocketLike | undefined> {
  const existing = readExistingSocket();
  if (existing) {
    window.socket = existing;
    appendDiagnostic("info", `[${traceId}] ioBroker socket resolved`, {
      capabilities: describeIoBrokerSocket(existing),
      source: "existing-window",
      location: window.location.href,
    });
    return existing;
  }

  socketPromise ??= createSocket(traceId);
  const socket = await socketPromise;
  appendDiagnostic(
    socket ? "info" : "warn",
    socket ? `[${traceId}] ioBroker socket created` : `[${traceId}] ioBroker socket not available`,
    socket
      ? { capabilities: describeIoBrokerSocket(socket) }
      : { location: window.location.href, search: window.location.search },
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
    const dashboardConnection = candidate.dashboardNgConnection;
    if (dashboardConnection && isUsableSocket(dashboardConnection)) {
      return dashboardConnection;
    }
    const socket = candidate.socket;
    if (socket && isUsableSocket(socket)) {
      return socket;
    }
    if (socket && typeof socket.emit === "function") {
      appendDiagnostic("warn", "Ignoring emit-only socket without ioBroker helper methods", {
        capabilities: describeIoBrokerSocket(socket),
      });
    }
    return undefined;
  });
}

async function createSocket(traceId: string): Promise<IoBrokerSocketLike | undefined> {
  appendDiagnostic("info", `[${traceId}] Loading /socket.io/socket.io.js for AdminConnection`);
  await ensureSocketIoScript();
  const factory = readWindowValue((candidate) => candidate.io ?? candidate.iob);
  if (!factory) {
    appendDiagnostic("warn", `[${traceId}] No socket factory found after script load`);
    return undefined;
  }

  appendDiagnostic("info", `[${traceId}] Socket factory found for AdminConnection`, {
    hasConnect: typeof factory.connect === "function",
  });
  const socket = await createAdminConnection(traceId, factory);
  window.dashboardNgConnection = socket;
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
    typeof socket.writeFile64 === "function"
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
  if (readWindowValue((candidate) => candidate.io ?? candidate.iob)) {
    return;
  }

  if (typeof document === "undefined") {
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

async function createAdminConnection(
  traceId: string,
  factory: IoBrokerSocketFactory,
): Promise<IoBrokerSocketLike> {
  type SocketConnect = NonNullable<ConnectionProps["connect"]>;
  const connect: SocketConnect = (url, options) => {
    const nextOptions = {
      ...options,
      path: readRootSocketPath(options),
    };
    appendDiagnostic("info", `[${traceId}] AdminConnection connect`, {
      url,
      path: nextOptions.path,
      name: nextOptions.name,
      transports: Array.isArray(nextOptions.transports) ? nextOptions.transports.join(",") : "",
    });
    const connectFunction = factory.connect ?? factory;
    return connectFunction(url, nextOptions) as ReturnType<SocketConnect>;
  };

  const connection = new AdminConnection({
    name: "dashboard-ng",
    protocol: readConnectionProtocol(),
    host: window.location.hostname,
    port: window.location.port || "",
    admin5only: false,
    autoSubscribes: [],
    autoSubscribeLog: false,
    doNotLoadACL: true,
    doNotLoadAllObjects: true,
    cmdTimeout: 10000,
    ioTimeout: 20000,
    connect,
    onError: (error: unknown) => {
      appendDiagnostic("error", `[${traceId}] AdminConnection error`, {
        error: readError(error),
      });
    },
    onProgress: (progress) => {
      appendDiagnostic("info", `[${traceId}] AdminConnection progress`, { progress });
    },
  });

  await withTimeout(
    connection.waitForFirstConnection(),
    15000,
    () => new Error("AdminConnection did not become ready within 15000 ms."),
  );
  appendDiagnostic("info", `[${traceId}] AdminConnection ready`, {
    capabilities: describeIoBrokerSocket(connection as unknown as IoBrokerSocketLike),
  });
  return connection as unknown as IoBrokerSocketLike;
}

function readConnectionProtocol(): NonNullable<ConnectionProps["protocol"]> {
  return window.location.protocol === "https:" ? "https:" : "http:";
}

function readRootSocketPath(options: Record<string, unknown>): string {
  if (typeof window.socketPath === "string" && window.socketPath) {
    return window.socketPath.endsWith("/socket.io")
      ? window.socketPath
      : `${window.socketPath.replace(/\/$/, "")}/socket.io`;
  }
  if (typeof options.path === "string" && options.path === "/socket.io") {
    return options.path;
  }
  return "/socket.io";
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  createError: () => Error,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(createError()), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
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

function summarizeCommandPayload(payload: unknown): string {
  if (!isRecord(payload)) {
    return describeDiagnosticValue(payload);
  }
  if (isRecord(payload.dashboard)) {
    const dashboard = payload.dashboard;
    return describeDiagnosticValue({
      dashboardId: payload.dashboardId,
      debugTraceId: payload.debugTraceId,
      projectId: dashboard.projectId,
      schemaVersion: dashboard.schemaVersion,
      pages: Array.isArray(dashboard.pages) ? dashboard.pages.length : undefined,
      components: Array.isArray(dashboard.components) ? dashboard.components.length : undefined,
      bindings: Array.isArray(dashboard.bindings) ? dashboard.bindings.length : undefined,
      updatedAt: dashboard.updatedAt,
    });
  }
  return describeDiagnosticValue(payload);
}

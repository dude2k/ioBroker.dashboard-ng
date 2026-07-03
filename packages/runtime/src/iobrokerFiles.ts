import { appendDiagnostic, describeDiagnosticValue } from "./diagnostics";
import { describeIoBrokerSocket, resolveIoBrokerSocket } from "./iobrokerSocket";

interface FileReadResult {
  ok: boolean;
  data?: string;
  error?: string;
}

export interface IoBrokerFileOptions {
  traceId?: string;
  timeoutMs?: number;
}

export async function readIoBrokerFile(
  adapterName: string,
  path: string,
  options: IoBrokerFileOptions = {},
): Promise<string | undefined> {
  const traceId = options.traceId ?? `read:${path}`;
  const socket = await resolveIoBrokerSocket(traceId);
  if (!socket) {
    logFileOperation(
      traceId,
      "read",
      adapterName,
      path,
      "skipped",
      "ioBroker socket is not available",
    );
    return undefined;
  }

  logFileOperation(
    traceId,
    "read",
    adapterName,
    path,
    "start",
    `socket=${describeIoBrokerSocket(socket)}`,
  );
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      settled = true;
      logFileOperation(traceId, "read", adapterName, path, "failed", "timeout");
      reject(new Error(`Reading ${adapterName}/${path} timed out.`));
    }, options.timeoutMs ?? 5000);

    const done = (errorOrResponse?: unknown, data?: unknown) => {
      if (settled) {
        appendDiagnostic("warn", `[${traceId}] readFile ignored late response`, {
          errorOrResponse: describeDiagnosticValue(errorOrResponse),
          data: describeDiagnosticValue(data),
        });
        return;
      }
      appendDiagnostic("info", `[${traceId}] readFile callback/promise response`, {
        errorOrResponse: describeDiagnosticValue(errorOrResponse),
        data: describeDiagnosticValue(data),
      });
      const result = normalizeReadResult(errorOrResponse, data);
      if (!result.ok && !result.error) {
        appendDiagnostic("warn", `[${traceId}] readFile response not usable yet`, {
          errorOrResponse: describeDiagnosticValue(errorOrResponse),
          data: describeDiagnosticValue(data),
        });
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      if (!result.ok) {
        logFileOperation(traceId, "read", adapterName, path, "failed", result.error);
        reject(new Error(result.error ?? `Cannot read ${adapterName}/${path}.`));
        return;
      }
      logFileOperation(
        traceId,
        "read",
        adapterName,
        path,
        "ok",
        `${result.data?.length ?? 0} bytes`,
      );
      resolve(result.data);
    };

    try {
      if (typeof socket.readFile === "function") {
        let result: Promise<unknown> | void;
        try {
          appendDiagnostic("info", `[${traceId}] trying socket.readFile promise signature`, {
            adapterName,
            path,
            base64: false,
          });
          result = socket.readFile(adapterName, path, false);
        } catch (error) {
          appendDiagnostic("warn", `[${traceId}] socket.readFile promise signature threw`, {
            error: readError(error) ?? String(error),
          });
          result = undefined;
        }
        if (handlePromiseResult(traceId, result, (response) => done(response))) {
          return;
        }
        appendDiagnostic("info", `[${traceId}] trying socket.readFile callback signature`, {
          adapterName,
          path,
        });
        const callbackResult = socket.readFile(adapterName, path, done);
        handlePromiseResult(traceId, callbackResult, (response) => done(response));
        return;
      }
      if (typeof socket.emit !== "function") {
        throw new Error(`Socket has no readFile or emit method for ${adapterName}/${path}.`);
      }
      appendDiagnostic("info", `[${traceId}] trying raw socket.emit readFile`, {
        adapterName,
        path,
      });
      socket.emit("readFile", adapterName, path, done);
    } catch (error) {
      settled = true;
      window.clearTimeout(timeout);
      logFileOperation(
        traceId,
        "read",
        adapterName,
        path,
        "failed",
        readError(error) ?? String(error),
      );
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function writeIoBrokerFile(
  adapterName: string,
  path: string,
  data: string,
  options: IoBrokerFileOptions = {},
): Promise<void> {
  const traceId = options.traceId ?? `write:${path}`;
  const socket = await resolveIoBrokerSocket(traceId);
  if (!socket) {
    logFileOperation(
      traceId,
      "write",
      adapterName,
      path,
      "failed",
      "ioBroker socket is not available",
    );
    throw new Error("ioBroker socket is not available.");
  }

  logFileOperation(
    traceId,
    "write",
    adapterName,
    path,
    "start",
    `${data.length} bytes socket=${describeIoBrokerSocket(socket)}`,
  );
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      settled = true;
      logFileOperation(traceId, "write", adapterName, path, "failed", "timeout");
      reject(new Error(`Writing ${adapterName}/${path} timed out.`));
    }, options.timeoutMs ?? 5000);

    const done = (errorOrResponse?: unknown) => {
      if (settled) {
        appendDiagnostic("warn", `[${traceId}] writeFile ignored late response`, {
          response: describeDiagnosticValue(errorOrResponse),
        });
        return;
      }
      appendDiagnostic("info", `[${traceId}] writeFile callback/promise response`, {
        response: describeDiagnosticValue(errorOrResponse),
      });
      const error = readError(errorOrResponse);
      settled = true;
      window.clearTimeout(timeout);
      if (error) {
        logFileOperation(traceId, "write", adapterName, path, "failed", error);
        reject(new Error(error));
        return;
      }
      logFileOperation(traceId, "write", adapterName, path, "ok", `${data.length} bytes`);
      resolve();
    };

    try {
      if (typeof socket.writeFile64 === "function") {
        const encoded = new TextEncoder().encode(data);
        appendDiagnostic("info", `[${traceId}] trying socket.writeFile64`, {
          adapterName,
          path,
          bytes: encoded.byteLength,
          encoding: "utf-8-arraybuffer",
        });
        const result = socket.writeFile64(adapterName, path, encoded.buffer);
        if (handlePromiseResult(traceId, result, done, true)) {
          return;
        }
      }
      if (typeof socket.writeFile === "function") {
        appendDiagnostic("info", `[${traceId}] trying socket.writeFile callback signature`, {
          adapterName,
          path,
          bytes: data.length,
        });
        const result = socket.writeFile(adapterName, path, data, done);
        if (handlePromiseResult(traceId, result, done, true)) {
          return;
        }
      }
      if (typeof socket.emit !== "function") {
        throw new Error(
          `Socket has no writeFile/writeFile64/emit method for ${adapterName}/${path}.`,
        );
      }
      appendDiagnostic("info", `[${traceId}] trying raw socket.emit writeFile`, {
        adapterName,
        path,
        bytes: data.length,
      });
      socket.emit("writeFile", adapterName, path, data, done);
    } catch (error) {
      settled = true;
      window.clearTimeout(timeout);
      logFileOperation(
        traceId,
        "write",
        adapterName,
        path,
        "failed",
        readError(error) ?? String(error),
      );
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function handlePromiseResult(
  traceId: string,
  result: Promise<unknown> | void,
  done: (response?: unknown) => void,
  resolveUndefined = false,
): boolean {
  if (!result || typeof result.then !== "function") {
    return false;
  }
  appendDiagnostic("info", `[${traceId}] file API returned promise`);
  result.then((response) => {
    if (response !== undefined || resolveUndefined) {
      done(response);
    }
  }, done);
  return true;
}

function normalizeReadResult(errorOrResponse: unknown, data: unknown): FileReadResult {
  const error = readError(errorOrResponse);
  if (error) {
    return { ok: false, error };
  }

  if (data !== undefined) {
    return normalizeReadData(data);
  }

  if (errorOrResponse === null || errorOrResponse === undefined) {
    return { ok: false };
  }

  return normalizeReadData(errorOrResponse);
}

function normalizeReadData(value: unknown): FileReadResult {
  const content = fileContentToString(value);
  if (content === undefined) {
    return { ok: false };
  }
  return { ok: true, data: content };
}

function fileContentToString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new TextDecoder().decode(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new TextDecoder().decode(value);
  }
  if (isRecord(value)) {
    if (value.file !== undefined) {
      return fileContentToString(value.file);
    }
    if (value.data !== undefined) {
      return fileContentToString(value.data);
    }
  }
  return undefined;
}

function readError(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Error) {
    return value.message;
  }
  if (isRecord(value) && value.error) {
    return String(value.error);
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function logFileOperation(
  traceId: string,
  operation: "read" | "write",
  adapterName: string,
  path: string,
  status: "start" | "skipped" | "failed" | "ok",
  detail?: string,
): void {
  const suffix = detail ? `: ${detail}` : "";
  appendDiagnostic(
    status === "failed" ? "error" : status === "skipped" ? "warn" : "info",
    `[${traceId}] ${operation} ${adapterName}/${path} ${status}${suffix}`,
  );
}

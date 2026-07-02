import { resolveIoBrokerSocket } from "./iobrokerSocket";

interface FileReadResult {
  ok: boolean;
  data?: string;
  error?: string;
}

export async function readIoBrokerFile(
  adapterName: string,
  path: string,
): Promise<string | undefined> {
  const socket = await resolveIoBrokerSocket();
  if (!socket) {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      settled = true;
      reject(new Error(`Reading ${adapterName}/${path} timed out.`));
    }, 5000);

    const done = (errorOrResponse?: unknown, data?: unknown) => {
      if (settled) {
        return;
      }
      const result = normalizeReadResult(errorOrResponse, data);
      if (!result.ok && !result.error) {
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      if (!result.ok) {
        reject(new Error(result.error ?? `Cannot read ${adapterName}/${path}.`));
        return;
      }
      resolve(result.data);
    };

    try {
      if (typeof socket.readFile === "function") {
        const result = socket.readFile(adapterName, path, done);
        handlePromiseResult(result, (response) => done(response));
        return;
      }
      socket.emit("readFile", adapterName, path, done);
    } catch (error) {
      settled = true;
      window.clearTimeout(timeout);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function writeIoBrokerFile(
  adapterName: string,
  path: string,
  data: string,
): Promise<void> {
  const socket = await resolveIoBrokerSocket();
  if (!socket) {
    throw new Error("ioBroker socket is not available.");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      settled = true;
      reject(new Error(`Writing ${adapterName}/${path} timed out.`));
    }, 5000);

    const done = (errorOrResponse?: unknown) => {
      if (settled) {
        return;
      }
      const error = readError(errorOrResponse);
      settled = true;
      window.clearTimeout(timeout);
      if (error) {
        reject(new Error(error));
        return;
      }
      resolve();
    };

    try {
      if (typeof socket.writeFile === "function") {
        const result = socket.writeFile(adapterName, path, data, done);
        handlePromiseResult(result, done, true);
        return;
      }
      socket.emit("writeFile", adapterName, path, data, done);
    } catch (error) {
      settled = true;
      window.clearTimeout(timeout);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function handlePromiseResult(
  result: Promise<unknown> | void,
  done: (response?: unknown) => void,
  resolveUndefined = false,
): void {
  if (!result || typeof result.then !== "function") {
    return;
  }
  result.then((response) => {
    if (response !== undefined || resolveUndefined) {
      done(response);
    }
  }, done);
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

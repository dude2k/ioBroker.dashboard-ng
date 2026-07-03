export type DiagnosticLevel = "info" | "warn" | "error";

export interface DiagnosticEntry {
  timestamp: string;
  level: DiagnosticLevel;
  message: string;
}

const MAX_ENTRIES = 200;
const MAX_DETAIL_LENGTH = 900;
const EVENT_NAME = "dashboard-ng:diagnostic";
const GLOBAL_KEY = "__dashboardNgDiagnostics";
const fallbackStore: DiagnosticEntry[] = [];

type DiagnosticWindow = Window & {
  [GLOBAL_KEY]?: DiagnosticEntry[];
};

export function appendDiagnostic(
  level: DiagnosticLevel,
  message: string,
  details?: Record<string, unknown>,
): void {
  const detailText = details ? ` ${formatDiagnosticDetails(details)}` : "";
  const entry: DiagnosticEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: `${message}${detailText}`,
  };
  const store = readStore();
  store.push(entry);
  if (store.length > MAX_ENTRIES) {
    store.splice(0, store.length - MAX_ENTRIES);
  }
  writeConsole(entry);
  dispatchDiagnosticEvent(entry);
}

export function clearDiagnostics(): void {
  readStore().splice(0);
  dispatchDiagnosticEvent();
}

export function diagnosticEventName(): string {
  return EVENT_NAME;
}

export function getDiagnostics(): DiagnosticEntry[] {
  return [...readStore()];
}

export function createDiagnosticTrace(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function describeDiagnosticValue(value: unknown): string {
  return trimDetail(describeValue(value, 0));
}

function readStore(): DiagnosticEntry[] {
  if (typeof window === "undefined") {
    return fallbackStore;
  }
  const target = window as DiagnosticWindow;
  target[GLOBAL_KEY] ??= [];
  return target[GLOBAL_KEY];
}

function writeConsole(entry: DiagnosticEntry): void {
  const line = `[Dashboard-NG] ${entry.message}`;
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

function formatDiagnosticDetails(details: Record<string, unknown>): string {
  const pairs = Object.entries(details).map(
    ([key, value]) => `${key}=${describeDiagnosticValue(value)}`,
  );
  return trimDetail(pairs.join(" "));
}

function describeValue(value: unknown, depth: number): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    return JSON.stringify(trimDetail(value));
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Error) {
    return `Error(${value.message})`;
  }
  if (value instanceof ArrayBuffer) {
    return `ArrayBuffer(${value.byteLength})`;
  }
  if (ArrayBuffer.isView(value)) {
    return `${value.constructor.name}(${value.byteLength})`;
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (typeof value === "object") {
    if (depth >= 1) {
      return objectSummary(value);
    }
    return describeObject(value as Record<string, unknown>, depth);
  }
  if (typeof value === "function") {
    return "function";
  }
  return String(value);
}

function describeObject(value: Record<string, unknown>, depth: number): string {
  const keys = Object.keys(value);
  const known = keys
    .slice(0, 8)
    .map((key) => `${key}:${describeValue(value[key], depth + 1)}`)
    .join(",");
  const suffix = keys.length > 8 ? `,+${keys.length - 8}` : "";
  return `{${known}${suffix}}`;
}

function objectSummary(value: object): string {
  const name = value.constructor?.name;
  const keys = Object.keys(value);
  return `${name && name !== "Object" ? name : "Object"}(${keys.join(",")})`;
}

function trimDetail(value: string): string {
  if (value.length <= MAX_DETAIL_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_DETAIL_LENGTH)}...`;
}

function dispatchDiagnosticEvent(entry?: DiagnosticEntry): void {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof CustomEvent !== "function"
  ) {
    return;
  }
  window.dispatchEvent(new CustomEvent<DiagnosticEntry | undefined>(EVENT_NAME, { detail: entry }));
}

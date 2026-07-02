export type DiagnosticLevel = "info" | "warn" | "error";

export interface DiagnosticEntry {
  timestamp: string;
  level: DiagnosticLevel;
  message: string;
}

const MAX_ENTRIES = 200;
const EVENT_NAME = "dashboard-ng:diagnostic";
const GLOBAL_KEY = "__dashboardNgDiagnostics";
const fallbackStore: DiagnosticEntry[] = [];

type DiagnosticWindow = Window & {
  [GLOBAL_KEY]?: DiagnosticEntry[];
};

export function appendDiagnostic(level: DiagnosticLevel, message: string): void {
  const entry: DiagnosticEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
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

import {
  createDefaultDashboard,
  type DashboardProject,
  type StatePrimitive,
  type StateSnapshot,
} from "@dashboard-ng/shared";
import { createDashboardFileUrl } from "./dashboardFile";

interface CommandResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface SocketLike {
  emit(
    event: "sendTo",
    instance: string,
    command: string,
    payload: unknown,
    callback: (response: CommandResponse<unknown>) => void,
  ): void;
}

type SocketFactory = {
  (url?: string, options?: Record<string, unknown>): SocketLike;
  connect?: (url?: string, options?: Record<string, unknown>) => SocketLike;
};

declare global {
  interface Window {
    io?: SocketFactory;
    socket?: SocketLike;
    adapterInstance?: number;
  }
}

const PROJECT_KEY = "dashboard-ng.editor.project";
const STATE_KEY = "dashboard-ng.editor.states";
const DEFAULT_DASHBOARD_ID = "default";
let socketPromise: Promise<SocketLike | undefined> | undefined;

export const viewerClient = {
  async loadDashboard(): Promise<DashboardProject> {
    const response = await sendTo<DashboardProject>("dashboard.load", {
      dashboardId: DEFAULT_DASHBOARD_ID,
    });
    if (response) {
      return response;
    }

    const fileDashboard = await loadDashboardFile(DEFAULT_DASHBOARD_ID);
    if (fileDashboard) {
      window.localStorage.setItem(PROJECT_KEY, JSON.stringify(fileDashboard));
      return fileDashboard;
    }

    const stored = window.localStorage.getItem(PROJECT_KEY);
    if (stored) {
      return JSON.parse(stored) as DashboardProject;
    }
    return createDefaultDashboard();
  },

  async readStates(stateIds: string[]): Promise<StateSnapshot[]> {
    const response = await sendTo<StateSnapshot[]>("states.read", { stateIds });
    if (response) {
      return response;
    }

    const values = readMockStates();
    return stateIds.map((id) => ({
      id,
      value: values[id] ?? null,
      missing: !(id in values),
      ack: true,
      ts: Date.now(),
      lc: Date.now(),
    }));
  },

  async writeState(stateId: string, value: StatePrimitive): Promise<void> {
    const response = await sendTo<StateSnapshot>("state.write", { stateId, value });
    if (response) {
      return;
    }

    const values = readMockStates();
    values[stateId] = value;
    window.localStorage.setItem(STATE_KEY, JSON.stringify(values));
  },
};

async function sendTo<T>(command: string, payload: unknown): Promise<T | undefined> {
  const socket = await resolveSocket();
  if (!socket) {
    return undefined;
  }

  const instance = `dashboard-ng.${window.adapterInstance ?? readInstanceFromQuery() ?? 0}`;
  return new Promise((resolve, reject) => {
    socket.emit("sendTo", instance, command, payload, (response) => {
      if (!response?.ok) {
        reject(new Error(response?.error ?? `Command ${command} failed.`));
        return;
      }
      resolve(response.data as T);
    });
  });
}

async function resolveSocket(): Promise<SocketLike | undefined> {
  if (window.socket) {
    return window.socket;
  }

  socketPromise ??= createSocket();
  return socketPromise;
}

async function createSocket(): Promise<SocketLike | undefined> {
  await ensureSocketIoScript();
  const factory = window.io;
  if (!factory) {
    return undefined;
  }

  const socket = factory.connect ? factory.connect() : factory();
  window.socket = socket;
  return socket;
}

async function ensureSocketIoScript(): Promise<void> {
  if (window.io) {
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

async function loadDashboardFile(dashboardId: string): Promise<DashboardProject | undefined> {
  try {
    const url = createDashboardFileUrl(dashboardId, window.location.href, Date.now());
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return undefined;
    }
    return (await response.json()) as DashboardProject;
  } catch {
    return undefined;
  }
}

function readInstanceFromQuery(): number | undefined {
  const value = new URLSearchParams(window.location.search).get("instance");
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function readMockStates(): Record<string, StatePrimitive> {
  const stored = window.localStorage.getItem(STATE_KEY);
  if (stored) {
    return JSON.parse(stored) as Record<string, StatePrimitive>;
  }
  return {
    "alias.0.living.light": false,
    "alias.0.living.temperature": 21.4,
    "alias.0.scene.evening": false,
  };
}

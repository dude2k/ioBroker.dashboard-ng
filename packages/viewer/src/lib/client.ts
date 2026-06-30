import {
  createDefaultDashboard,
  type DashboardProject,
  type StatePrimitive,
  type StateSnapshot,
} from "@dashboard-ng/shared";

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

declare global {
  interface Window {
    socket?: SocketLike;
    adapterInstance?: number;
  }
}

const PROJECT_KEY = "dashboard-ng.editor.project";
const STATE_KEY = "dashboard-ng.editor.states";

export const viewerClient = {
  async loadDashboard(): Promise<DashboardProject> {
    const response = await sendTo<DashboardProject>("dashboard.load", { dashboardId: "default" });
    if (response) {
      return response;
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
  const socket = window.socket;
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

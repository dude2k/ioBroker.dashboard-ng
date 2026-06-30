import {
  createDefaultDashboard,
  type DashboardProject,
  type StateOption,
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

const STORAGE_KEY = "dashboard-ng.editor.project";
const STATE_KEY = "dashboard-ng.editor.states";

export const dashboardClient = {
  async loadDashboard(): Promise<DashboardProject> {
    const response = await sendTo<DashboardProject>("dashboard.load", { dashboardId: "default" });
    if (response) {
      return response;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as DashboardProject;
    }
    const dashboard = createDefaultDashboard();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboard));
    return dashboard;
  },

  async saveDashboard(dashboard: DashboardProject): Promise<DashboardProject> {
    const response = await sendTo<DashboardProject>("dashboard.save", {
      dashboardId: dashboard.projectId,
      dashboard,
    });
    if (response) {
      return response;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboard));
    return dashboard;
  },

  async searchObjects(query: string): Promise<StateOption[]> {
    const response = await sendTo<StateOption[]>("objects.search", { query, limit: 80 });
    if (response) {
      return response;
    }

    const demoStates = createDemoStates();
    const normalized = query.trim().toLowerCase();
    return demoStates.filter((state) => {
      const text =
        `${state.id} ${state.name} ${state.role ?? ""} ${state.unit ?? ""}`.toLowerCase();
      return !normalized || text.includes(normalized);
    });
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

  async writeState(stateId: string, value: StatePrimitive): Promise<StateSnapshot> {
    const response = await sendTo<StateSnapshot>("state.write", { stateId, value });
    if (response) {
      return response;
    }

    const values = readMockStates();
    values[stateId] = value;
    window.localStorage.setItem(STATE_KEY, JSON.stringify(values));
    return {
      id: stateId,
      value,
      missing: false,
      ack: false,
      ts: Date.now(),
      lc: Date.now(),
    };
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
  if (!stored) {
    const defaults: Record<string, StatePrimitive> = {
      "alias.0.living.light": false,
      "alias.0.living.temperature": 21.4,
      "alias.0.scene.evening": false,
      "alias.0.energy.consumption": 430,
      "alias.0.living.humidity": 43,
    };
    window.localStorage.setItem(STATE_KEY, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(stored) as Record<string, StatePrimitive>;
}

function createDemoStates(): StateOption[] {
  return [
    {
      id: "alias.0.living.light",
      name: "Living Light",
      type: "boolean",
      role: "switch.light",
      read: true,
      write: true,
    },
    {
      id: "alias.0.living.temperature",
      name: "Living Temperature",
      type: "number",
      role: "value.temperature",
      unit: "C",
      read: true,
      write: false,
    },
    {
      id: "alias.0.living.humidity",
      name: "Living Humidity",
      type: "number",
      role: "value.humidity",
      unit: "%",
      read: true,
      write: false,
    },
    {
      id: "alias.0.scene.evening",
      name: "Evening Scene",
      type: "boolean",
      role: "button",
      read: true,
      write: true,
    },
    {
      id: "alias.0.energy.consumption",
      name: "Power Consumption",
      type: "number",
      role: "value.power",
      unit: "W",
      read: true,
      write: false,
    },
  ];
}

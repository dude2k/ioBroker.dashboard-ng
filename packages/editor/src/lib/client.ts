import {
  createDefaultDashboard,
  type DashboardProject,
  type StateOption,
  type StatePrimitive,
  type StateSnapshot,
} from "@dashboard-ng/shared";
import { sendIoBrokerCommand } from "@dashboard-ng/runtime";

const STORAGE_KEY = "dashboard-ng.editor.project";
const STATE_KEY = "dashboard-ng.editor.states";
const ADAPTER_NAME = "dashboard-ng";
const DEFAULT_DASHBOARD_ID = "default";

export const dashboardClient = {
  async loadDashboard(): Promise<DashboardProject> {
    const response = await sendTo<DashboardProject>("dashboard.load", {
      dashboardId: DEFAULT_DASHBOARD_ID,
    });
    if (response) {
      const local = readStoredDashboard();
      const selected = chooseMostRecentDashboard(response, local);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      return selected;
    }

    if (!isDemoFallbackAllowed()) {
      throw new Error("Cannot reach ioBroker adapter. Dashboard was not loaded from adapter.");
    }

    const stored = readStoredDashboard();
    if (stored) {
      return stored;
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
      return response;
    }

    if (!isDemoFallbackAllowed()) {
      throw new Error("Cannot reach ioBroker adapter. Dashboard was not saved to adapter.");
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

function sendTo<T>(command: string, payload: unknown): Promise<T | undefined> {
  return sendIoBrokerCommand<T>(ADAPTER_NAME, command, payload);
}

function readStoredDashboard(): DashboardProject | undefined {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored ? (JSON.parse(stored) as DashboardProject) : undefined;
}

function chooseMostRecentDashboard(
  adapterDashboard: DashboardProject,
  localDashboard: DashboardProject | undefined,
): DashboardProject {
  if (!localDashboard || localDashboard.projectId !== adapterDashboard.projectId) {
    return adapterDashboard;
  }

  const localUpdatedAt = Date.parse(localDashboard.updatedAt);
  const adapterUpdatedAt = Date.parse(adapterDashboard.updatedAt);
  if (Number.isFinite(localUpdatedAt) && Number.isFinite(adapterUpdatedAt)) {
    return localUpdatedAt > adapterUpdatedAt ? localDashboard : adapterDashboard;
  }

  return adapterDashboard;
}

function isDemoFallbackAllowed(): boolean {
  return (
    import.meta.env.DEV ||
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname) ||
    !window.location.pathname.includes("/adapter/")
  );
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

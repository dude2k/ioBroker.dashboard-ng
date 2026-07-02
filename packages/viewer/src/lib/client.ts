import {
  createDefaultDashboard,
  type DashboardProject,
  type StatePrimitive,
  type StateSnapshot,
} from "@dashboard-ng/shared";
import { sendIoBrokerCommand } from "@dashboard-ng/runtime";
import { createDashboardFileUrl } from "./dashboardFile";

const PROJECT_KEY = "dashboard-ng.editor.project";
const STATE_KEY = "dashboard-ng.editor.states";
const ADAPTER_NAME = "dashboard-ng";
const DEFAULT_DASHBOARD_ID = "default";

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
  try {
    return await sendIoBrokerCommand<T>(ADAPTER_NAME, command, payload);
  } catch {
    return undefined;
  }
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

import {
  createDefaultDashboard,
  migrateDashboardProject,
  sanitizeDashboardFilePart,
  validateDashboardProject,
  type DashboardProject,
  type StateOption,
  type StatePrimitive,
  type StateSnapshot,
} from "@dashboard-ng/shared";
import {
  appendDiagnostic,
  readIoBrokerFile,
  sendIoBrokerCommand,
  writeIoBrokerFile,
} from "@dashboard-ng/runtime";

const STORAGE_KEY = "dashboard-ng.editor.project";
const STATE_KEY = "dashboard-ng.editor.states";
const ADAPTER_NAME = "dashboard-ng";
const DEFAULT_DASHBOARD_ID = "default";

export const dashboardClient = {
  async loadDashboard(): Promise<DashboardProject> {
    logClient("dashboard.load", "start", `dashboardId=${DEFAULT_DASHBOARD_ID}`);
    const fileDashboard = await loadDashboardFile(DEFAULT_DASHBOARD_ID);
    if (fileDashboard) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fileDashboard));
      logClient(
        "dashboard.load",
        "ok",
        `source=file components=${fileDashboard.components.length}`,
      );
      return fileDashboard;
    }

    const response = await sendToSilently<DashboardProject>("dashboard.load", {
      dashboardId: DEFAULT_DASHBOARD_ID,
    });
    if (response) {
      const selected = isDemoFallbackAllowed()
        ? chooseMostRecentDashboard(response, readStoredDashboard())
        : response;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      logClient("dashboard.load", "ok", `source=sendTo components=${selected.components.length}`);
      return selected;
    }

    if (!isDemoFallbackAllowed()) {
      const dashboard = createDefaultDashboard({ projectId: DEFAULT_DASHBOARD_ID });
      try {
        const saved = await saveDashboardFile(DEFAULT_DASHBOARD_ID, dashboard);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        logClient("dashboard.load", "ok", "source=created-default");
        return saved;
      } catch (error) {
        logClient("dashboard.load", "failed", readError(error));
        throw new Error("Cannot load dashboard from ioBroker adapter storage.");
      }
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
    logClient(
      "dashboard.save",
      "start",
      `components=${dashboard.components.length} bindings=${dashboard.bindings.length}`,
    );
    let fileError: unknown;
    try {
      const saved = await saveDashboardFile(DEFAULT_DASHBOARD_ID, dashboard);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      logClient("dashboard.save", "ok", "target=file");
      return saved;
    } catch (error) {
      fileError = error;
      logClient("dashboard.save", "failed", `target=file ${readError(error)}`);
    }

    const response = await sendToSilently<DashboardProject>("dashboard.save", {
      dashboardId: DEFAULT_DASHBOARD_ID,
      dashboard,
    });
    if (response) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
      logClient("dashboard.save", "ok", "target=sendTo");
      return response;
    }

    if (!isDemoFallbackAllowed()) {
      logClient("dashboard.save", "failed", "sendTo fallback did not confirm save");
      throw new Error(`Dashboard was not saved to adapter storage: ${readError(fileError)}`);
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboard));
    return dashboard;
  },

  async searchObjects(query: string): Promise<StateOption[]> {
    const response = await sendToSilently<StateOption[]>("objects.search", { query, limit: 80 });
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
    const response = await sendToSilently<StateSnapshot[]>("states.read", { stateIds });
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
    const response = await sendToSilently<StateSnapshot>("state.write", { stateId, value });
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

async function sendToSilently<T>(command: string, payload: unknown): Promise<T | undefined> {
  try {
    return await sendTo<T>(command, payload);
  } catch (error) {
    logClient(command, "failed", `sendTo ${readError(error)}`);
    return undefined;
  }
}

async function loadDashboardFile(dashboardId: string): Promise<DashboardProject | undefined> {
  try {
    const raw = await readIoBrokerFile(ADAPTER_NAME, dashboardFileName(dashboardId));
    if (!raw) {
      logClient("dashboard.file.load", "failed", "empty response");
      return undefined;
    }
    return migrateDashboardProject(JSON.parse(raw)).project;
  } catch (error) {
    logClient("dashboard.file.load", "failed", readError(error));
    return undefined;
  }
}

async function saveDashboardFile(
  dashboardId: string,
  dashboard: DashboardProject,
): Promise<DashboardProject> {
  const next: DashboardProject = {
    ...dashboard,
    projectId: dashboard.projectId || dashboardId,
    updatedAt: new Date().toISOString(),
  };
  const validation = validateDashboardProject(next);
  if (!validation.valid) {
    throw new Error(
      `Dashboard validation failed: ${validation.issues.map((issue) => issue.message).join("; ")}`,
    );
  }
  await writeIoBrokerFile(
    ADAPTER_NAME,
    dashboardFileName(dashboardId),
    `${JSON.stringify(next, null, 2)}\n`,
  );
  return next;
}

function dashboardFileName(dashboardId: string): string {
  return `dashboards/${sanitizeDashboardFilePart(dashboardId)}.json`;
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logClient(operation: string, status: "start" | "ok" | "failed", detail?: string): void {
  const suffix = detail ? `: ${detail}` : "";
  appendDiagnostic(status === "failed" ? "error" : "info", `${operation} ${status}${suffix}`);
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
  return import.meta.env.DEV || new URLSearchParams(window.location.search).get("demo") === "1";
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

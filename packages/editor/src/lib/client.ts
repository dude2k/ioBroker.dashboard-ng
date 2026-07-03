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
  createDiagnosticTrace,
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
    const traceId = createDiagnosticTrace("load");
    logClient(traceId, "dashboard.load", "start", {
      dashboardId: DEFAULT_DASHBOARD_ID,
      environment: readEnvironmentSummary(),
    });
    const fileDashboard = await loadDashboardFile(DEFAULT_DASHBOARD_ID, traceId);
    if (fileDashboard) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fileDashboard));
      logClient(traceId, "dashboard.load", "ok", {
        source: "file",
        dashboard: summarizeDashboard(fileDashboard),
      });
      return fileDashboard;
    }

    const response = await sendToSilently<DashboardProject>(
      "dashboard.load",
      {
        dashboardId: DEFAULT_DASHBOARD_ID,
      },
      traceId,
    );
    if (response) {
      const selected = isDemoFallbackAllowed()
        ? chooseMostRecentDashboard(response, readStoredDashboard())
        : response;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      logClient(traceId, "dashboard.load", "ok", {
        source: "sendTo",
        dashboard: summarizeDashboard(selected),
      });
      return selected;
    }

    if (!isDemoFallbackAllowed()) {
      const dashboard = createDefaultDashboard({ projectId: DEFAULT_DASHBOARD_ID });
      try {
        const saved = await saveDashboardFile(DEFAULT_DASHBOARD_ID, dashboard, traceId);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        logClient(traceId, "dashboard.load", "ok", {
          source: "created-default",
          dashboard: summarizeDashboard(saved),
        });
        return saved;
      } catch (error) {
        logClient(traceId, "dashboard.load", "failed", { error: readError(error) });
        throw new Error("Cannot load dashboard from ioBroker adapter storage.");
      }
    }

    const stored = readStoredDashboard();
    if (stored) {
      logClient(traceId, "dashboard.load", "ok", {
        source: "localStorage-dev",
        dashboard: summarizeDashboard(stored),
      });
      return stored;
    }
    const dashboard = createDefaultDashboard();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboard));
    logClient(traceId, "dashboard.load", "ok", {
      source: "demo-default",
      dashboard: summarizeDashboard(dashboard),
    });
    return dashboard;
  },

  async saveDashboard(dashboard: DashboardProject): Promise<DashboardProject> {
    const traceId = createDiagnosticTrace("save");
    logClient(traceId, "dashboard.save", "start", {
      dashboard: summarizeDashboard(dashboard),
      environment: readEnvironmentSummary(),
    });
    let fileError: unknown;
    try {
      const saved = await saveDashboardFile(DEFAULT_DASHBOARD_ID, dashboard, traceId);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      logClient(traceId, "dashboard.save", "ok", {
        target: "file",
        dashboard: summarizeDashboard(saved),
      });
      return saved;
    } catch (error) {
      fileError = error;
      logClient(traceId, "dashboard.save", "failed", {
        target: "file",
        error: readError(error),
      });
    }

    const response = await sendToSilently<DashboardProject>(
      "dashboard.save",
      {
        dashboardId: DEFAULT_DASHBOARD_ID,
        dashboard,
      },
      traceId,
    );
    if (response) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
      logClient(traceId, "dashboard.save", "ok", {
        target: "sendTo",
        dashboard: summarizeDashboard(response),
      });
      return response;
    }

    if (!isDemoFallbackAllowed()) {
      logClient(traceId, "dashboard.save", "failed", {
        target: "sendTo",
        error: "sendTo fallback did not confirm save",
      });
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

function sendTo<T>(command: string, payload: unknown, traceId = command): Promise<T | undefined> {
  return sendIoBrokerCommand<T>(ADAPTER_NAME, command, addDebugTrace(payload, traceId), {
    traceId,
  });
}

async function sendToSilently<T>(
  command: string,
  payload: unknown,
  traceId = command,
): Promise<T | undefined> {
  try {
    return await sendTo<T>(command, payload, traceId);
  } catch (error) {
    logClient(traceId, command, "failed", { transport: "sendTo", error: readError(error) });
    return undefined;
  }
}

async function loadDashboardFile(
  dashboardId: string,
  traceId: string,
): Promise<DashboardProject | undefined> {
  const fileName = dashboardFileName(dashboardId);
  try {
    logClient(traceId, "dashboard.file.load", "start", { fileName });
    const raw = await readIoBrokerFile(ADAPTER_NAME, fileName, { traceId });
    if (!raw) {
      logClient(traceId, "dashboard.file.load", "failed", { error: "empty response", fileName });
      return undefined;
    }
    logClient(traceId, "dashboard.file.load", "ok", { fileName, bytes: raw.length });
    const migration = migrateDashboardProject(JSON.parse(raw));
    logClient(traceId, "dashboard.file.migrate", "ok", {
      migrated: migration.migrated,
      validation: summarizeValidation(migration.validation),
      dashboard: summarizeDashboard(migration.project),
    });
    return migration.project;
  } catch (error) {
    logClient(traceId, "dashboard.file.load", "failed", { fileName, error: readError(error) });
    return undefined;
  }
}

async function saveDashboardFile(
  dashboardId: string,
  dashboard: DashboardProject,
  traceId: string,
): Promise<DashboardProject> {
  const next: DashboardProject = {
    ...dashboard,
    projectId: dashboard.projectId || dashboardId,
    updatedAt: new Date().toISOString(),
  };
  const fileName = dashboardFileName(dashboardId);
  logClient(traceId, "dashboard.file.prepare", "start", {
    fileName,
    dashboard: summarizeDashboard(next),
  });
  const validation = validateDashboardProject(next);
  if (!validation.valid) {
    logClient(traceId, "dashboard.file.validate", "failed", {
      validation: summarizeValidation(validation),
    });
    throw new Error(
      `Dashboard validation failed: ${validation.issues.map((issue) => issue.message).join("; ")}`,
    );
  }
  logClient(traceId, "dashboard.file.validate", "ok", {
    validation: summarizeValidation(validation),
  });
  const serialized = `${JSON.stringify(next, null, 2)}\n`;
  logClient(traceId, "dashboard.file.write", "start", { fileName, bytes: serialized.length });
  await writeIoBrokerFile(ADAPTER_NAME, fileName, serialized, { traceId });
  logClient(traceId, "dashboard.file.write", "ok", { fileName, bytes: serialized.length });
  await verifySavedDashboard(dashboardId, next, traceId);
  return next;
}

function dashboardFileName(dashboardId: string): string {
  return `dashboards/${sanitizeDashboardFilePart(dashboardId)}.json`;
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logClient(
  traceId: string,
  operation: string,
  status: "start" | "ok" | "failed",
  detail?: Record<string, unknown>,
): void {
  appendDiagnostic(
    status === "failed" ? "error" : "info",
    `[${traceId}] ${operation} ${status}`,
    detail,
  );
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

async function verifySavedDashboard(
  dashboardId: string,
  expected: DashboardProject,
  traceId: string,
): Promise<void> {
  const verifyTraceId = `${traceId}:verify`;
  const fileName = dashboardFileName(dashboardId);
  try {
    const raw = await readIoBrokerFile(ADAPTER_NAME, fileName, { traceId: verifyTraceId });
    if (!raw) {
      logClient(traceId, "dashboard.file.verify", "failed", {
        fileName,
        error: "empty read after write",
      });
      return;
    }
    const verified = migrateDashboardProject(JSON.parse(raw)).project;
    const matches =
      verified.projectId === expected.projectId &&
      verified.updatedAt === expected.updatedAt &&
      verified.components.length === expected.components.length;
    logClient(traceId, "dashboard.file.verify", matches ? "ok" : "failed", {
      fileName,
      bytes: raw.length,
      expected: summarizeDashboard(expected),
      actual: summarizeDashboard(verified),
    });
  } catch (error) {
    logClient(traceId, "dashboard.file.verify", "failed", {
      fileName,
      error: readError(error),
    });
  }
}

function addDebugTrace(payload: unknown, traceId: string): unknown {
  if (!isRecord(payload)) {
    return payload;
  }
  return { ...payload, debugTraceId: traceId };
}

function summarizeDashboard(dashboard: DashboardProject): Record<string, unknown> {
  return {
    projectId: dashboard.projectId,
    schemaVersion: dashboard.schemaVersion,
    pages: dashboard.pages.length,
    components: dashboard.components.length,
    bindings: dashboard.bindings.length,
    actions: dashboard.actions.length,
    layouts: Object.keys(dashboard.layouts).length,
    updatedAt: dashboard.updatedAt,
  };
}

function summarizeValidation(validation: ReturnType<typeof validateDashboardProject>): string {
  if (validation.valid) {
    return "valid";
  }
  return validation.issues
    .slice(0, 6)
    .map((issue) => `${issue.path}:${issue.message}`)
    .join(" | ");
}

function readEnvironmentSummary(): Record<string, unknown> {
  return {
    href: window.location.href,
    search: window.location.search,
    adapterInstance: window.adapterInstance,
    hasWindowSocket: Boolean(window.socket),
    localStorageDashboardBytes: window.localStorage.getItem(STORAGE_KEY)?.length ?? 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
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

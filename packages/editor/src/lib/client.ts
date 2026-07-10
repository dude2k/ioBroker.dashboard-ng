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
let stateOptionsPromise: Promise<StateOption[]> | undefined;

export const dashboardClient = {
  async loadDashboard(): Promise<DashboardProject> {
    const traceId = createDiagnosticTrace("load");
    const stored = readStoredDashboard(traceId);
    logClient(traceId, "dashboard.load", "start", {
      dashboardId: DEFAULT_DASHBOARD_ID,
      environment: readEnvironmentSummary(),
    });

    const response = await sendToSilently<DashboardProject>(
      "dashboard.load",
      {
        dashboardId: DEFAULT_DASHBOARD_ID,
      },
      traceId,
    );
    if (response) {
      let selected = chooseMostRecentDashboard(response, stored);
      const usedLocalDashboard = selected === stored;
      if (usedLocalDashboard) {
        selected =
          (await recoverLocalDashboard(DEFAULT_DASHBOARD_ID, selected, traceId, "sendTo-older")) ??
          selected;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      logClient(traceId, "dashboard.load", "ok", {
        source: usedLocalDashboard ? "localStorage-newer-than-sendTo" : "sendTo",
        dashboard: summarizeDashboard(selected),
      });
      return selected;
    }

    const fileDashboard = await loadDashboardFile(DEFAULT_DASHBOARD_ID, traceId);
    if (fileDashboard) {
      let selected = chooseMostRecentDashboard(fileDashboard, stored);
      const usedLocalDashboard = selected === stored;
      if (usedLocalDashboard) {
        selected =
          (await recoverLocalDashboard(DEFAULT_DASHBOARD_ID, selected, traceId, "file-older")) ??
          selected;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      logClient(traceId, "dashboard.load", "ok", {
        source: usedLocalDashboard ? "localStorage-newer-than-file" : "file",
        dashboard: summarizeDashboard(selected),
      });
      return selected;
    }

    if (stored) {
      const recovered = await recoverLocalDashboard(
        DEFAULT_DASHBOARD_ID,
        stored,
        traceId,
        "adapter-load-failed",
      );
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recovered ?? stored));
      logClient(traceId, "dashboard.load", "ok", {
        source: recovered ? "localStorage-recovered-to-adapter" : "localStorage-recovery",
        dashboard: summarizeDashboard(recovered ?? stored),
      });
      return recovered ?? stored;
    }

    if (!isDemoFallbackAllowed()) {
      const dashboard = createDefaultDashboard({ projectId: DEFAULT_DASHBOARD_ID });
      try {
        const saved = await saveDashboardViaSendTo(DEFAULT_DASHBOARD_ID, dashboard, traceId);
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
    let sendToError: unknown;
    try {
      const saved = await saveDashboardViaSendTo(DEFAULT_DASHBOARD_ID, dashboard, traceId);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      logClient(traceId, "dashboard.save", "ok", {
        target: "sendTo",
        dashboard: summarizeDashboard(saved),
      });
      return saved;
    } catch (error) {
      sendToError = error;
      logClient(traceId, "dashboard.save", "failed", {
        target: "sendTo",
        error: readError(error),
      });
    }

    try {
      const saved = await saveDashboardFile(DEFAULT_DASHBOARD_ID, dashboard, traceId);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      logClient(traceId, "dashboard.save", "ok", {
        target: "file-fallback",
        dashboard: summarizeDashboard(saved),
      });
      return saved;
    } catch (error) {
      logClient(traceId, "dashboard.save", "failed", {
        target: "file-fallback",
        error: readError(error),
      });
    }

    if (!isDemoFallbackAllowed()) {
      logClient(traceId, "dashboard.save", "failed", {
        target: "sendTo",
        error: "sendTo fallback did not confirm save",
      });
      throw new Error(`Dashboard was not saved to adapter storage: ${readError(sendToError)}`);
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboard));
    return dashboard;
  },

  async searchObjects(query = "", limit = 2500, refresh = false): Promise<StateOption[]> {
    if (!query.trim()) {
      if (refresh) {
        stateOptionsPromise = undefined;
      }
      stateOptionsPromise ??= loadStateOptions("", limit);
      return stateOptionsPromise;
    }
    return loadStateOptions(query, limit);
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

async function loadStateOptions(query: string, limit: number): Promise<StateOption[]> {
  const response = await sendToSilently<StateOption[]>("objects.search", { query, limit });
  if (response) {
    return response;
  }

  const normalized = query.trim().toLowerCase();
  return createDemoStates().filter((state) => {
    const text = [
      state.id,
      state.name,
      ...(state.names ?? []),
      state.role,
      state.type,
      state.unit,
      state.room,
      ...(state.rooms ?? []),
      state.function,
      ...(state.functions ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !normalized || text.includes(normalized);
  });
}

function sendTo<T>(command: string, payload: unknown, traceId = command): Promise<T | undefined> {
  return sendIoBrokerCommand<T>(ADAPTER_NAME, command, addDebugTrace(payload, traceId), {
    traceId,
  });
}

async function saveDashboardViaSendTo(
  dashboardId: string,
  dashboard: DashboardProject,
  traceId: string,
): Promise<DashboardProject> {
  const next = prepareDashboardForSave(dashboardId, dashboard);
  validateOrThrow(next, traceId, "dashboard.sendTo.validate");
  logClient(traceId, "dashboard.sendTo.save", "start", {
    dashboardId,
    dashboard: summarizeDashboard(next),
  });
  const response = await sendTo<DashboardProject>(
    "dashboard.save",
    {
      dashboardId,
      dashboard: next,
    },
    traceId,
  );
  if (!response) {
    throw new Error("Adapter did not return a saved dashboard.");
  }
  await verifySavedDashboard(dashboardId, response, traceId);
  return response;
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
    ...prepareDashboardForSave(dashboardId, dashboard),
  };
  const fileName = dashboardFileName(dashboardId);
  logClient(traceId, "dashboard.file.prepare", "start", {
    fileName,
    dashboard: summarizeDashboard(next),
  });
  validateOrThrow(next, traceId, "dashboard.file.validate");
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

function readStoredDashboard(traceId: string): DashboardProject | undefined {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return undefined;
  }
  try {
    const dashboard = migrateDashboardProject(JSON.parse(stored)).project;
    logClient(traceId, "dashboard.localStorage.load", "ok", {
      bytes: stored.length,
      dashboard: summarizeDashboard(dashboard),
    });
    return dashboard;
  } catch (error) {
    logClient(traceId, "dashboard.localStorage.load", "failed", { error: readError(error) });
    return undefined;
  }
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
      throw new Error(`Saved dashboard verification failed: ${fileName} is empty.`);
    }
    const verified = migrateDashboardProject(JSON.parse(raw)).project;
    const matches = JSON.stringify(verified) === JSON.stringify(expected);
    logClient(traceId, "dashboard.file.verify", matches ? "ok" : "failed", {
      fileName,
      bytes: raw.length,
      expected: summarizeDashboard(expected),
      actual: summarizeDashboard(verified),
    });
    if (!matches) {
      throw new Error(`Saved dashboard verification failed: ${fileName} differs after write.`);
    }
  } catch (error) {
    logClient(traceId, "dashboard.file.verify", "failed", {
      fileName,
      error: readError(error),
    });
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function recoverLocalDashboard(
  dashboardId: string,
  dashboard: DashboardProject,
  traceId: string,
  reason: string,
): Promise<DashboardProject | undefined> {
  try {
    logClient(traceId, "dashboard.localStorage.recover", "start", {
      reason,
      dashboard: summarizeDashboard(dashboard),
    });
    const saved = await saveDashboardViaSendTo(dashboardId, dashboard, traceId);
    logClient(traceId, "dashboard.localStorage.recover", "ok", {
      reason,
      dashboard: summarizeDashboard(saved),
    });
    return saved;
  } catch (error) {
    logClient(traceId, "dashboard.localStorage.recover", "failed", {
      reason,
      error: readError(error),
    });
    return undefined;
  }
}

function prepareDashboardForSave(
  dashboardId: string,
  dashboard: DashboardProject,
): DashboardProject {
  return {
    ...dashboard,
    projectId: dashboard.projectId || dashboardId,
    updatedAt: new Date().toISOString(),
  };
}

function validateOrThrow(dashboard: DashboardProject, traceId: string, operation: string): void {
  const validation = validateDashboardProject(dashboard);
  if (!validation.valid) {
    logClient(traceId, operation, "failed", {
      validation: summarizeValidation(validation),
    });
    throw new Error(
      `Dashboard validation failed: ${validation.issues.map((issue) => issue.message).join("; ")}`,
    );
  }
  logClient(traceId, operation, "ok", {
    validation: summarizeValidation(validation),
  });
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
      names: ["Living Light", "Wohnzimmerlicht"],
      parentId: "alias.0.living",
      type: "boolean",
      role: "switch.light",
      read: true,
      write: true,
      room: "Living room",
      function: "Lighting",
      alias: true,
      aliasTarget: "zigbee.0.living.light.state",
      value: false,
      ack: true,
      q: 0,
      ts: Date.now(),
      lc: Date.now(),
      missing: false,
    },
    {
      id: "alias.0.living.temperature",
      name: "Living Temperature",
      parentId: "alias.0.living",
      type: "number",
      role: "value.temperature",
      unit: "C",
      read: true,
      write: false,
      room: "Living room",
      function: "Climate",
      value: 21.4,
      ack: true,
      q: 0,
      ts: Date.now(),
      lc: Date.now(),
      missing: false,
    },
    {
      id: "alias.0.living.humidity",
      name: "Living Humidity",
      parentId: "alias.0.living",
      type: "number",
      role: "value.humidity",
      unit: "%",
      read: true,
      write: false,
      room: "Living room",
      function: "Climate",
    },
    {
      id: "alias.0.scene.evening",
      name: "Evening Scene",
      parentId: "alias.0.scene",
      type: "boolean",
      role: "button",
      read: true,
      write: true,
    },
    {
      id: "alias.0.energy.consumption",
      name: "Power Consumption",
      parentId: "alias.0.energy",
      type: "number",
      role: "value.power",
      unit: "W",
      read: true,
      write: false,
    },
  ];
}

import {
  createDefaultDashboard,
  migrateDashboardProject,
  type DashboardProject,
  type StatePrimitive,
  type StateSnapshot,
} from "@dashboard-ng/shared";
import {
  appendDiagnostic,
  createDiagnosticTrace,
  sendIoBrokerCommand,
} from "@dashboard-ng/runtime";
import { createDashboardFileUrl } from "./dashboardFile";

const PROJECT_KEY = "dashboard-ng.editor.project";
const STATE_KEY = "dashboard-ng.editor.states";
const ADAPTER_NAME = "dashboard-ng";
const DEFAULT_DASHBOARD_ID = "default";

export const viewerClient = {
  async loadDashboard(): Promise<DashboardProject> {
    const traceId = createDiagnosticTrace("viewer-load");
    logViewer(traceId, "dashboard.load", "start", {
      dashboardId: DEFAULT_DASHBOARD_ID,
      environment: readEnvironmentSummary(),
    });

    const response = await sendTo<DashboardProject>(
      "dashboard.load",
      {
        dashboardId: DEFAULT_DASHBOARD_ID,
      },
      traceId,
    );
    if (response) {
      window.localStorage.setItem(PROJECT_KEY, JSON.stringify(response));
      logViewer(traceId, "dashboard.load", "ok", {
        source: "sendTo",
        dashboard: summarizeDashboard(response),
      });
      return response;
    }

    const fileDashboard = await loadDashboardFile(DEFAULT_DASHBOARD_ID, traceId);
    if (fileDashboard) {
      window.localStorage.setItem(PROJECT_KEY, JSON.stringify(fileDashboard));
      logViewer(traceId, "dashboard.load", "ok", {
        source: "file",
        dashboard: summarizeDashboard(fileDashboard),
      });
      return fileDashboard;
    }

    if (isDemoFallbackAllowed()) {
      const stored = window.localStorage.getItem(PROJECT_KEY);
      if (stored) {
        const dashboard = migrateDashboardProject(JSON.parse(stored)).project;
        logViewer(traceId, "dashboard.load", "ok", {
          source: "localStorage-demo",
          dashboard: summarizeDashboard(dashboard),
        });
        return dashboard;
      }
      const dashboard = createDefaultDashboard();
      logViewer(traceId, "dashboard.load", "ok", {
        source: "default-demo",
        dashboard: summarizeDashboard(dashboard),
      });
      return dashboard;
    }

    logViewer(traceId, "dashboard.load", "failed", {
      error: "Cannot load dashboard from adapter storage.",
    });
    throw new Error("Cannot load dashboard from adapter storage.");
  },

  async readStates(stateIds: string[]): Promise<StateSnapshot[]> {
    const response = await sendTo<StateSnapshot[]>(
      "states.read",
      { stateIds },
      "viewer-states.read",
    );
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
    const response = await sendTo<StateSnapshot>(
      "state.write",
      { stateId, value },
      "viewer-state.write",
    );
    if (response) {
      return;
    }

    const values = readMockStates();
    values[stateId] = value;
    window.localStorage.setItem(STATE_KEY, JSON.stringify(values));
  },
};

async function sendTo<T>(
  command: string,
  payload: unknown,
  traceId = command,
): Promise<T | undefined> {
  try {
    return await sendIoBrokerCommand<T>(ADAPTER_NAME, command, addDebugTrace(payload, traceId), {
      traceId,
    });
  } catch (error) {
    logViewer(traceId, command, "failed", {
      transport: "sendTo",
      error: readError(error),
    });
    return undefined;
  }
}

async function loadDashboardFile(
  dashboardId: string,
  traceId: string,
): Promise<DashboardProject | undefined> {
  const url = createDashboardFileUrl(dashboardId, window.location.href, Date.now());
  try {
    logViewer(traceId, "dashboard.file.load", "start", { url });
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      logViewer(traceId, "dashboard.file.load", "failed", {
        url,
        status: response.status,
        statusText: response.statusText,
      });
      return undefined;
    }
    const raw = await response.text();
    const migration = migrateDashboardProject(JSON.parse(raw));
    logViewer(traceId, "dashboard.file.load", "ok", {
      url,
      bytes: raw.length,
      migrated: migration.migrated,
      dashboard: summarizeDashboard(migration.project),
    });
    return migration.project;
  } catch (error) {
    logViewer(traceId, "dashboard.file.load", "failed", { url, error: readError(error) });
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

function isDemoFallbackAllowed(): boolean {
  return import.meta.env.DEV || new URLSearchParams(window.location.search).get("demo") === "1";
}

function logViewer(
  traceId: string,
  operation: string,
  status: "start" | "ok" | "failed",
  detail?: Record<string, unknown>,
): void {
  appendDiagnostic(
    status === "failed" ? "error" : "info",
    `[${traceId}] viewer.${operation} ${status}`,
    detail,
  );
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

function readEnvironmentSummary(): Record<string, unknown> {
  return {
    href: window.location.href,
    search: window.location.search,
    adapterInstance: window.adapterInstance,
    hasWindowSocket: Boolean(window.socket),
    localStorageDashboardBytes: window.localStorage.getItem(PROJECT_KEY)?.length ?? 0,
  };
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

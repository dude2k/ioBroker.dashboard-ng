import * as utils from "@iobroker/adapter-core";
import type {
  ImportDashboardPayload,
  LoadDashboardPayload,
  ReadStatesPayload,
  SaveDashboardPayload,
  SearchObjectsPayload,
  WriteStatePayload,
} from "./types/messages";
import { DashboardStorageService, type AdapterFileApi } from "./storage/dashboard-storage.service";
import { ImportExportService } from "./services/import-export.service";
import { StateBindingService, type AdapterStateApi } from "./services/state-binding.service";

class DashboardNgAdapter extends utils.Adapter {
  private storage: DashboardStorageService | undefined;
  private stateBinding: StateBindingService | undefined;
  private importExport = new ImportExportService();

  public constructor(options: Partial<utils.AdapterOptions> = {}) {
    super({
      ...options,
      name: "dashboard-ng",
    });

    this.on("ready", this.onReady.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.on("message", this.onMessage.bind(this));
  }

  private async onReady(): Promise<void> {
    this.storage = new DashboardStorageService(this as unknown as AdapterFileApi);
    this.stateBinding = new StateBindingService(this as unknown as AdapterStateApi);

    await this.setStateAsync("info.connection", true, true);
    const config = this.config as { defaultDashboardId?: string };
    const dashboardId = config.defaultDashboardId || "default";
    const traceId = createTraceId("ready");
    this.logTrace("info", traceId, "adapter ready start", {
      dashboardId,
      namespace: this.namespace,
      adapterName: this.name,
    });
    try {
      await this.storage.loadDashboard(dashboardId, traceId);
      this.logTrace("info", traceId, "adapter ready ok", { dashboardId });
    } catch (error) {
      this.logTrace("warn", traceId, "adapter ready dashboard load failed", {
        dashboardId,
        error: readError(error),
      });
    }
  }

  private onUnload(callback: () => void): void {
    void this.setStateAsync("info.connection", false, true).finally(callback);
  }

  private async onMessage(message: ioBroker.Message): Promise<void> {
    if (!message || typeof message.command !== "string" || !message.callback) {
      this.log.debug("Ignored adapter message without command or callback.");
      return;
    }

    const traceId = readTraceId(message.command, message.message);
    try {
      this.logTrace("info", traceId, "message received", {
        command: message.command,
        from: message.from,
        payload: summarizePayload(message.message),
      });
      const data = await this.handleCommand(message.command, message.message, traceId);
      this.logTrace("info", traceId, "message completed", {
        command: message.command,
        result: summarizeResult(data),
      });
      this.sendTo(message.from, message.command, { ok: true, data }, message.callback);
      this.logTrace("info", traceId, "message response sent", {
        command: message.command,
        ok: true,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logTrace("warn", traceId, "message failed", {
        command: message.command,
        error: errorMessage,
      });
      this.sendTo(
        message.from,
        message.command,
        { ok: false, error: errorMessage },
        message.callback,
      );
      this.logTrace("warn", traceId, "message error response sent", {
        command: message.command,
        ok: false,
      });
    }
  }

  private async handleCommand(
    command: string,
    payload: unknown,
    traceId: string,
  ): Promise<unknown> {
    switch (command) {
      case "dashboard.load": {
        const typedPayload = payload as LoadDashboardPayload | undefined;
        const dashboardId = typedPayload?.dashboardId ?? "default";
        this.logTrace("info", traceId, "dashboard.load command", { dashboardId });
        const stored = await this.requireStorage().loadDashboard(dashboardId, traceId);
        return stored.dashboard;
      }
      case "dashboard.save": {
        const typedPayload = payload as SaveDashboardPayload;
        if (!typedPayload?.dashboard) {
          throw new Error("Missing dashboard payload.");
        }
        const dashboardId = typedPayload.dashboardId ?? typedPayload.dashboard.projectId;
        this.logTrace("info", traceId, "dashboard.save command", {
          dashboardId,
          dashboard: summarizeDashboard(typedPayload.dashboard),
        });
        return this.requireStorage().saveDashboard(dashboardId, typedPayload.dashboard, traceId);
      }
      case "dashboard.export": {
        const typedPayload = payload as LoadDashboardPayload | undefined;
        const stored = await this.requireStorage().loadDashboard(
          typedPayload?.dashboardId ?? "default",
          traceId,
        );
        return this.importExport.createExportBundle(stored.dashboard);
      }
      case "dashboard.import": {
        const typedPayload = payload as ImportDashboardPayload;
        const dashboard = this.importExport.readImportPayload(typedPayload?.bundle);
        return this.requireStorage().saveDashboard(
          typedPayload?.dashboardId ?? dashboard.projectId,
          dashboard,
          traceId,
        );
      }
      case "objects.search": {
        const typedPayload = payload as SearchObjectsPayload | undefined;
        return this.requireStateBinding().searchObjects(typedPayload?.query, typedPayload?.limit);
      }
      case "states.read": {
        const typedPayload = payload as ReadStatesPayload;
        return this.requireStateBinding().readStates(typedPayload?.stateIds ?? []);
      }
      case "state.write": {
        const typedPayload = payload as WriteStatePayload;
        if (!typedPayload?.stateId) {
          throw new Error("Missing stateId.");
        }
        return this.requireStateBinding().writeState(typedPayload.stateId, typedPayload.value);
      }
      default:
        throw new Error(`Unsupported command ${command}.`);
    }
  }

  private requireStorage(): DashboardStorageService {
    if (!this.storage) {
      throw new Error("Storage service is not ready.");
    }
    return this.storage;
  }

  private requireStateBinding(): StateBindingService {
    if (!this.stateBinding) {
      throw new Error("State binding service is not ready.");
    }
    return this.stateBinding;
  }

  private logTrace(
    level: "debug" | "info" | "warn" | "error",
    traceId: string,
    message: string,
    details?: Record<string, unknown>,
  ): void {
    const suffix = details ? ` ${formatDetails(details)}` : "";
    const line = `[${traceId}] adapter ${message}${suffix}`;
    this.log[level](line);
    if (level !== "debug") {
      void this.setStateAsync("info.lastDebugLog", trimDebugLine(line), true).catch((error) =>
        this.log.debug(`Could not update info.lastDebugLog: ${readError(error)}`),
      );
    }
  }
}

if (require.main !== module) {
  module.exports = (options: Partial<utils.AdapterOptions> | undefined) =>
    new DashboardNgAdapter(options);
} else {
  new DashboardNgAdapter();
}

function createTraceId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readTraceId(command: string, payload: unknown): string {
  if (isRecord(payload) && typeof payload.debugTraceId === "string") {
    return payload.debugTraceId;
  }
  return createTraceId(command.replace(/[^a-z0-9]+/gi, "-").toLowerCase());
}

function summarizePayload(payload: unknown): string {
  if (!isRecord(payload)) {
    return formatDetailValue(payload);
  }
  if (isRecord(payload.dashboard)) {
    return formatDetailValue({
      dashboardId: payload.dashboardId,
      debugTraceId: payload.debugTraceId,
      dashboard: summarizeDashboard(payload.dashboard),
    });
  }
  if (Array.isArray(payload.stateIds)) {
    return formatDetailValue({
      debugTraceId: payload.debugTraceId,
      stateIds: payload.stateIds.length,
    });
  }
  return formatDetailValue(payload);
}

function summarizeResult(result: unknown): string {
  if (isDashboardProject(result)) {
    return summarizeDashboard(result);
  }
  if (Array.isArray(result)) {
    return `Array(${result.length})`;
  }
  return formatDetailValue(result);
}

function summarizeDashboard(value: unknown): string {
  const dashboard = isRecord(value) ? value : {};
  return [
    `projectId=${String(dashboard.projectId ?? "")}`,
    `schema=${String(dashboard.schemaVersion ?? "")}`,
    `pages=${Array.isArray(dashboard.pages) ? dashboard.pages.length : "?"}`,
    `components=${Array.isArray(dashboard.components) ? dashboard.components.length : "?"}`,
    `bindings=${Array.isArray(dashboard.bindings) ? dashboard.bindings.length : "?"}`,
    `actions=${Array.isArray(dashboard.actions) ? dashboard.actions.length : "?"}`,
    `updatedAt=${String(dashboard.updatedAt ?? "")}`,
  ].join(",");
}

function isDashboardProject(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    Array.isArray(value.pages) &&
    Array.isArray(value.components) &&
    Array.isArray(value.bindings)
  );
}

function formatDetails(details: Record<string, unknown>): string {
  return Object.entries(details)
    .map(([key, value]) => `${key}=${formatDetailValue(value)}`)
    .join(" ");
}

function formatDetailValue(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify(value.message);
  }
  if (typeof value === "string") {
    return JSON.stringify(trimDebugLine(value));
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value);
    const inner = keys
      .slice(0, 8)
      .map((key) => `${key}:${formatDetailValue(value[key])}`)
      .join(",");
    const suffix = keys.length > 8 ? `,+${keys.length - 8}` : "";
    return `{${inner}${suffix}}`;
  }
  return JSON.stringify(trimDebugLine(String(value)));
}

function trimDebugLine(value: string): string {
  return value.length <= 1000 ? value : `${value.slice(0, 1000)}...`;
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

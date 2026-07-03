"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("@iobroker/adapter-core"));
const dashboard_storage_service_1 = require("./storage/dashboard-storage.service");
const import_export_service_1 = require("./services/import-export.service");
const state_binding_service_1 = require("./services/state-binding.service");
class DashboardNgAdapter extends utils.Adapter {
    storage;
    stateBinding;
    importExport = new import_export_service_1.ImportExportService();
    constructor(options = {}) {
        super({
            ...options,
            name: "dashboard-ng",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("unload", this.onUnload.bind(this));
        this.on("message", this.onMessage.bind(this));
    }
    async onReady() {
        this.storage = new dashboard_storage_service_1.DashboardStorageService(this);
        this.stateBinding = new state_binding_service_1.StateBindingService(this);
        await this.setStateAsync("info.connection", true, true);
        const config = this.config;
        const dashboardId = config.defaultDashboardId || "default";
        const traceId = createTraceId("ready");
        this.logTrace("info", traceId, "adapter ready start", {
            dashboardId,
            namespace: this.namespace,
            adapterName: this.name,
        });
        await this.storage.loadDashboard(dashboardId, traceId);
        this.logTrace("info", traceId, "adapter ready ok", { dashboardId });
    }
    onUnload(callback) {
        void this.setStateAsync("info.connection", false, true).finally(callback);
    }
    async onMessage(message) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logTrace("warn", traceId, "message failed", {
                command: message.command,
                error: errorMessage,
            });
            this.sendTo(message.from, message.command, { ok: false, error: errorMessage }, message.callback);
            this.logTrace("warn", traceId, "message error response sent", {
                command: message.command,
                ok: false,
            });
        }
    }
    async handleCommand(command, payload, traceId) {
        switch (command) {
            case "dashboard.load": {
                const typedPayload = payload;
                const dashboardId = typedPayload?.dashboardId ?? "default";
                this.logTrace("info", traceId, "dashboard.load command", { dashboardId });
                const stored = await this.requireStorage().loadDashboard(dashboardId, traceId);
                return stored.dashboard;
            }
            case "dashboard.save": {
                const typedPayload = payload;
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
                const typedPayload = payload;
                const stored = await this.requireStorage().loadDashboard(typedPayload?.dashboardId ?? "default", traceId);
                return this.importExport.createExportBundle(stored.dashboard);
            }
            case "dashboard.import": {
                const typedPayload = payload;
                const dashboard = this.importExport.readImportPayload(typedPayload?.bundle);
                return this.requireStorage().saveDashboard(typedPayload?.dashboardId ?? dashboard.projectId, dashboard, traceId);
            }
            case "objects.search": {
                const typedPayload = payload;
                return this.requireStateBinding().searchObjects(typedPayload?.query, typedPayload?.limit);
            }
            case "states.read": {
                const typedPayload = payload;
                return this.requireStateBinding().readStates(typedPayload?.stateIds ?? []);
            }
            case "state.write": {
                const typedPayload = payload;
                if (!typedPayload?.stateId) {
                    throw new Error("Missing stateId.");
                }
                return this.requireStateBinding().writeState(typedPayload.stateId, typedPayload.value);
            }
            default:
                throw new Error(`Unsupported command ${command}.`);
        }
    }
    requireStorage() {
        if (!this.storage) {
            throw new Error("Storage service is not ready.");
        }
        return this.storage;
    }
    requireStateBinding() {
        if (!this.stateBinding) {
            throw new Error("State binding service is not ready.");
        }
        return this.stateBinding;
    }
    logTrace(level, traceId, message, details) {
        const suffix = details ? ` ${formatDetails(details)}` : "";
        const line = `[${traceId}] adapter ${message}${suffix}`;
        this.log[level](line);
        if (level !== "debug") {
            void this.setStateAsync("info.lastDebugLog", trimDebugLine(line), true).catch((error) => this.log.debug(`Could not update info.lastDebugLog: ${readError(error)}`));
        }
    }
}
if (require.main !== module) {
    module.exports = (options) => new DashboardNgAdapter(options);
}
else {
    new DashboardNgAdapter();
}
function createTraceId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function readTraceId(command, payload) {
    if (isRecord(payload) && typeof payload.debugTraceId === "string") {
        return payload.debugTraceId;
    }
    return createTraceId(command.replace(/[^a-z0-9]+/gi, "-").toLowerCase());
}
function summarizePayload(payload) {
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
function summarizeResult(result) {
    if (isDashboardProject(result)) {
        return summarizeDashboard(result);
    }
    if (Array.isArray(result)) {
        return `Array(${result.length})`;
    }
    return formatDetailValue(result);
}
function summarizeDashboard(value) {
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
function isDashboardProject(value) {
    return (isRecord(value) &&
        Array.isArray(value.pages) &&
        Array.isArray(value.components) &&
        Array.isArray(value.bindings));
}
function formatDetails(details) {
    return Object.entries(details)
        .map(([key, value]) => `${key}=${formatDetailValue(value)}`)
        .join(" ");
}
function formatDetailValue(value) {
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
function trimDebugLine(value) {
    return value.length <= 1000 ? value : `${value.slice(0, 1000)}...`;
}
function readError(error) {
    return error instanceof Error ? error.message : String(error);
}
function isRecord(value) {
    return Boolean(value) && typeof value === "object";
}
//# sourceMappingURL=main.js.map
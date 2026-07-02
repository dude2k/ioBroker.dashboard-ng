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
        await this.storage.loadDashboard(dashboardId);
        this.log.info(`Dashboard-NG adapter started with default dashboard "${dashboardId}".`);
    }
    onUnload(callback) {
        void this.setStateAsync("info.connection", false, true).finally(callback);
    }
    async onMessage(message) {
        if (!message || typeof message.command !== "string" || !message.callback) {
            this.log.debug("Ignored adapter message without command or callback.");
            return;
        }
        try {
            this.log.debug(`Received command ${message.command} from ${message.from}.`);
            const data = await this.handleCommand(message.command, message.message);
            this.log.debug(`Command ${message.command} completed.`);
            this.sendTo(message.from, message.command, { ok: true, data }, message.callback);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.log.warn(`Command ${message.command} failed: ${errorMessage}`);
            this.sendTo(message.from, message.command, { ok: false, error: errorMessage }, message.callback);
        }
    }
    async handleCommand(command, payload) {
        switch (command) {
            case "dashboard.load": {
                const typedPayload = payload;
                const dashboardId = typedPayload?.dashboardId ?? "default";
                this.log.info(`Loading dashboard "${dashboardId}" via sendTo command.`);
                const stored = await this.requireStorage().loadDashboard(dashboardId);
                return stored.dashboard;
            }
            case "dashboard.save": {
                const typedPayload = payload;
                if (!typedPayload?.dashboard) {
                    throw new Error("Missing dashboard payload.");
                }
                const dashboardId = typedPayload.dashboardId ?? typedPayload.dashboard.projectId;
                this.log.info(`Saving dashboard "${dashboardId}" via sendTo command with ${typedPayload.dashboard.components.length} components.`);
                return this.requireStorage().saveDashboard(dashboardId, typedPayload.dashboard);
            }
            case "dashboard.export": {
                const typedPayload = payload;
                const stored = await this.requireStorage().loadDashboard(typedPayload?.dashboardId ?? "default");
                return this.importExport.createExportBundle(stored.dashboard);
            }
            case "dashboard.import": {
                const typedPayload = payload;
                const dashboard = this.importExport.readImportPayload(typedPayload?.bundle);
                return this.requireStorage().saveDashboard(typedPayload?.dashboardId ?? dashboard.projectId, dashboard);
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
}
if (require.main !== module) {
    module.exports = (options) => new DashboardNgAdapter(options);
}
else {
    new DashboardNgAdapter();
}
//# sourceMappingURL=main.js.map
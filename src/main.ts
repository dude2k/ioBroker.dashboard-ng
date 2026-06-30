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
    await this.storage.loadDashboard(config.defaultDashboardId || "default");
    this.log.info("Dashboard-NG adapter started.");
  }

  private onUnload(callback: () => void): void {
    void this.setStateAsync("info.connection", false, true).finally(callback);
  }

  private async onMessage(message: ioBroker.Message): Promise<void> {
    if (!message || typeof message.command !== "string" || !message.callback) {
      return;
    }

    try {
      const data = await this.handleCommand(message.command, message.message);
      this.sendTo(message.from, message.command, { ok: true, data }, message.callback);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.warn(`Command ${message.command} failed: ${errorMessage}`);
      this.sendTo(
        message.from,
        message.command,
        { ok: false, error: errorMessage },
        message.callback,
      );
    }
  }

  private async handleCommand(command: string, payload: unknown): Promise<unknown> {
    switch (command) {
      case "dashboard.load": {
        const typedPayload = payload as LoadDashboardPayload | undefined;
        const stored = await this.requireStorage().loadDashboard(
          typedPayload?.dashboardId ?? "default",
        );
        return stored.dashboard;
      }
      case "dashboard.save": {
        const typedPayload = payload as SaveDashboardPayload;
        if (!typedPayload?.dashboard) {
          throw new Error("Missing dashboard payload.");
        }
        return this.requireStorage().saveDashboard(
          typedPayload.dashboardId ?? typedPayload.dashboard.projectId,
          typedPayload.dashboard,
        );
      }
      case "dashboard.export": {
        const typedPayload = payload as LoadDashboardPayload | undefined;
        const stored = await this.requireStorage().loadDashboard(
          typedPayload?.dashboardId ?? "default",
        );
        return this.importExport.createExportBundle(stored.dashboard);
      }
      case "dashboard.import": {
        const typedPayload = payload as ImportDashboardPayload;
        const dashboard = this.importExport.readImportPayload(typedPayload?.bundle);
        return this.requireStorage().saveDashboard(
          typedPayload?.dashboardId ?? dashboard.projectId,
          dashboard,
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
}

if (require.main !== module) {
  module.exports = (options: Partial<utils.AdapterOptions> | undefined) =>
    new DashboardNgAdapter(options);
} else {
  new DashboardNgAdapter();
}

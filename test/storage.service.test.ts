import { describe, expect, it } from "vitest";
import {
  DashboardStorageService,
  type AdapterFileApi,
} from "../src/storage/dashboard-storage.service";

describe("dashboard storage service", () => {
  it("creates the default dashboard when ioBroker reports a missing file", async () => {
    const writes: Array<{ fileName: string; data: Buffer | string }> = [];
    const adapter: AdapterFileApi = {
      name: "dashboard-ng",
      namespace: "dashboard-ng.0",
      log: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
      readFileAsync: async () => {
        throw new Error("Not exists");
      },
      writeFileAsync: async (_adapterName, fileName, data) => {
        writes.push({ fileName, data });
      },
      mkdirAsync: async () => undefined,
      setStateAsync: async () => undefined,
    };

    const stored = await new DashboardStorageService(adapter).loadDashboard("default");

    expect(stored.dashboard.projectId).toBe("default");
    expect(stored.validation.valid).toBe(true);
    expect(writes.some((write) => write.fileName === "dashboards/default.json")).toBe(true);
  });

  it("loads dashboard content returned in ioBroker file wrapper objects", async () => {
    const dashboard = {
      schemaVersion: 1,
      projectId: "wrapped",
      name: "Wrapped Dashboard",
      pages: [],
      layouts: {},
      components: [],
      bindings: [],
      actions: [],
      themes: [],
      assets: [],
      templates: [],
      settings: {
        activeThemeId: "modern-dark",
        activePageId: "page-home",
        kiosk: true,
        burnInProtection: true,
        wakeLock: true,
        advancedMode: false,
      },
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      migrationHistory: [],
    };
    const adapter: AdapterFileApi = {
      name: "dashboard-ng",
      namespace: "dashboard-ng.0",
      log: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
      readFileAsync: async () => ({ file: JSON.stringify(dashboard) }),
      writeFileAsync: async () => undefined,
      mkdirAsync: async () => undefined,
      setStateAsync: async () => undefined,
    };

    const stored = await new DashboardStorageService(adapter).loadDashboard("wrapped");

    expect(stored.dashboard.projectId).toBe("wrapped");
    expect(stored.validation.valid).toBe(true);
  });
});

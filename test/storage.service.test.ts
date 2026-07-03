import { describe, expect, it } from "vitest";
import {
  DashboardStorageService,
  type AdapterFileApi,
} from "../src/storage/dashboard-storage.service";
import { createDefaultDashboard } from "../packages/shared/src";

describe("dashboard storage service", () => {
  it("creates the default dashboard when ioBroker reports a missing file", async () => {
    const writes: Array<{ fileName: string; data: Buffer | string }> = [];
    let storedFile: Buffer | string | undefined;
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
        if (storedFile === undefined) {
          throw new Error("Not exists");
        }
        return storedFile;
      },
      writeFileAsync: async (_adapterName, fileName, data) => {
        writes.push({ fileName, data });
        storedFile = data;
      },
      mkdirAsync: async () => undefined,
      setStateAsync: async () => undefined,
    };

    const stored = await new DashboardStorageService(adapter).loadDashboard("default");

    expect(stored.dashboard.projectId).toBe("default");
    expect(stored.validation.valid).toBe(true);
    expect(writes.some((write) => write.fileName === "dashboards/default.json")).toBe(true);
  });

  it("verifies saved dashboard content by reading it back", async () => {
    let storedFile = "";
    const adapter: AdapterFileApi = {
      name: "dashboard-ng",
      namespace: "dashboard-ng.0",
      log: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
      readFileAsync: async () => storedFile,
      writeFileAsync: async (_adapterName, _fileName, data) => {
        storedFile = String(data);
      },
      mkdirAsync: async () => undefined,
      setStateAsync: async () => undefined,
    };

    const saved = await new DashboardStorageService(adapter).saveDashboard(
      "default",
      createDefaultDashboard({ projectId: "default" }),
      "test-save",
    );

    expect(JSON.parse(storedFile).updatedAt).toBe(saved.updatedAt);
  });

  it("rejects saves that cannot be verified from adapter storage", async () => {
    const adapter: AdapterFileApi = {
      name: "dashboard-ng",
      namespace: "dashboard-ng.0",
      log: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
      readFileAsync: async () => "not json",
      writeFileAsync: async () => undefined,
      mkdirAsync: async () => undefined,
      setStateAsync: async () => undefined,
    };

    await expect(
      new DashboardStorageService(adapter).saveDashboard(
        "default",
        createDefaultDashboard({ projectId: "default" }),
        "test-save",
      ),
    ).rejects.toThrow();
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

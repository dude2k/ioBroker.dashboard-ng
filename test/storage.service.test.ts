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
    const dashboard = structuredClone(
      createDefaultDashboard({ projectId: "wrapped", name: "Wrapped Dashboard" }),
    ) as unknown as Record<string, unknown>;
    dashboard.schemaVersion = 1;
    delete (dashboard.settings as Record<string, unknown>).reconnectIntervalMs;
    let storedFile = JSON.stringify(dashboard);
    const adapter: AdapterFileApi = {
      name: "dashboard-ng",
      namespace: "dashboard-ng.0",
      log: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
      readFileAsync: async () => ({ file: storedFile }),
      writeFileAsync: async (_adapterName, fileName, data) => {
        if (fileName === "dashboards/wrapped.json") {
          storedFile = String(data);
        }
      },
      mkdirAsync: async () => undefined,
      setStateAsync: async () => undefined,
    };

    const stored = await new DashboardStorageService(adapter).loadDashboard("wrapped");

    expect(stored.dashboard.projectId).toBe("wrapped");
    expect(stored.validation.valid).toBe(true);
    expect(stored.migrated).toBe(true);
    expect(stored.backupFile).toContain("dashboards/backups/wrapped-");
  });

  it("restores the original dashboard when migration verification fails", async () => {
    const v1 = structuredClone(
      createDefaultDashboard({ projectId: "restore" }),
    ) as unknown as Record<string, unknown>;
    v1.schemaVersion = 1;
    delete (v1.settings as Record<string, unknown>).reconnectIntervalMs;
    const original = JSON.stringify(v1);
    let storedFile = original;
    let dashboardWrites = 0;
    const writes: string[] = [];
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
      writeFileAsync: async (_adapterName, fileName, data) => {
        writes.push(fileName);
        if (fileName === "dashboards/restore.json") {
          dashboardWrites += 1;
          storedFile = dashboardWrites === 1 ? "corrupt" : String(data);
        }
      },
      mkdirAsync: async () => undefined,
    };

    await expect(
      new DashboardStorageService(adapter).loadDashboard("restore", "test-migration-restore"),
    ).rejects.toThrow("original dashboard restored");

    expect(JSON.parse(storedFile)).toEqual(JSON.parse(original));
    expect(writes[0]).toContain("dashboards/backups/restore-");
    expect(writes.filter((fileName) => fileName === "dashboards/restore.json")).toHaveLength(2);
  });
});

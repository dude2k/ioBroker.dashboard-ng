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
});

import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  createDefaultDashboard,
  DashboardMigrationError,
  migrateDashboardProject,
  validateDashboardProject,
} from "@dashboard-ng/shared";

describe("dashboard migrations", () => {
  it("keeps a valid current dashboard unchanged", () => {
    const dashboard = createDefaultDashboard({ now: "2026-06-30T00:00:00.000Z" });
    const result = migrateDashboardProject(dashboard);

    expect(result.migrated).toBe(false);
    expect(result.project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.validation.valid).toBe(true);
  });

  it("migrates unversioned dashboards to schema v1", () => {
    const result = migrateDashboardProject({
      projectId: "legacy",
      name: "Legacy Dashboard",
      pages: [],
    });

    expect(result.migrated).toBe(true);
    expect(result.backup).toBeDefined();
    expect(result.project.schemaVersion).toBe(1);
    expect(result.project.projectId).toBe("legacy");
    expect(result.project.name).toBe("Legacy Dashboard");
    expect(result.project.migrationHistory).toHaveLength(1);
    expect(validateDashboardProject(result.project).valid).toBe(true);
  });

  it("rejects dashboards from a newer future schema", () => {
    expect(() =>
      migrateDashboardProject({
        ...createDefaultDashboard(),
        schemaVersion: CURRENT_SCHEMA_VERSION + 1,
      }),
    ).toThrow(DashboardMigrationError);
  });
});

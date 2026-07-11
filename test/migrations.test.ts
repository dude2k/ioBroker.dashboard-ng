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

  it("migrates unversioned dashboards through every schema version", () => {
    const result = migrateDashboardProject(
      { projectId: "legacy", name: "Legacy Dashboard", pages: [] },
      { now: "2026-07-11T00:00:00.000Z" },
    );

    expect(result.migrated).toBe(true);
    expect(result.backup).toBeDefined();
    expect(result.project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.project.projectId).toBe("legacy");
    expect(result.project.name).toBe("Legacy Dashboard");
    expect(result.project.migrationHistory.map((entry) => entry.toVersion)).toEqual([1, 2]);
    expect(validateDashboardProject(result.project).valid).toBe(true);
  });

  it("migrates schema v1 additively and preserves the original backup", () => {
    const v1 = structuredClone(
      createDefaultDashboard({ now: "2026-07-10T00:00:00.000Z" }),
    ) as unknown as Record<string, unknown>;
    v1.schemaVersion = 1;
    const settings = v1.settings as Record<string, unknown>;
    delete settings.reconnectIntervalMs;
    (v1.components as Array<Record<string, unknown>>)[0]!.props = {
      title: "Preserved user title",
    };

    const result = migrateDashboardProject(v1, { now: "2026-07-11T00:00:00.000Z" });

    expect(result.backup).toEqual(v1);
    expect(result.project.components[0]!.props.title).toBe("Preserved user title");
    expect(result.project.settings.reconnectIntervalMs).toBe(2500);
    expect(result.project.migrationHistory.at(-1)).toMatchObject({ fromVersion: 1, toVersion: 2 });
  });

  it("does not mutate input when migration validation fails", () => {
    const invalid = structuredClone(createDefaultDashboard()) as unknown as Record<string, unknown>;
    invalid.schemaVersion = 1;
    (invalid.settings as Record<string, unknown>).reconnectIntervalMs = 20;
    (invalid.pages as unknown[])[0] = { pageId: "broken" };
    const original = structuredClone(invalid);

    expect(() => migrateDashboardProject(invalid)).toThrow(DashboardMigrationError);
    expect(invalid).toEqual(original);
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

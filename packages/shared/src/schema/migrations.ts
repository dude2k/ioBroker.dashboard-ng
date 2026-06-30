import type { DashboardProject, MigrationEntry, ValidationResult } from "./types";
import { CURRENT_SCHEMA_VERSION } from "./types";
import { createDefaultDashboard } from "./defaults";
import { validateDashboardProject } from "./validation";

export interface MigrationResult {
  project: DashboardProject;
  backup: unknown | undefined;
  migrated: boolean;
  validation: ValidationResult;
}

export class DashboardMigrationError extends Error {
  constructor(
    message: string,
    readonly validation?: ValidationResult,
  ) {
    super(message);
    this.name = "DashboardMigrationError";
  }
}

export function migrateDashboardProject(input: unknown): MigrationResult {
  const backup = cloneJson(input);
  let working = cloneJson(input);
  let version = readSchemaVersion(working);
  let migrated = false;

  if (version > CURRENT_SCHEMA_VERSION) {
    throw new DashboardMigrationError(
      `Dashboard schema version ${version} is newer than supported version ${CURRENT_SCHEMA_VERSION}.`,
    );
  }

  if (version < 0) {
    version = 0;
  }

  while (version < CURRENT_SCHEMA_VERSION) {
    if (version === 0) {
      working = migrate0To1(working);
      migrated = true;
      version = 1;
      continue;
    }

    throw new DashboardMigrationError(`No migration path from schema version ${version}.`);
  }

  const validation = validateDashboardProject(working);
  if (!validation.valid) {
    throw new DashboardMigrationError("Migrated dashboard did not pass validation.", validation);
  }

  return {
    project: working as DashboardProject,
    backup: migrated ? backup : undefined,
    migrated,
    validation,
  };
}

function migrate0To1(input: unknown): DashboardProject {
  const record = isRecord(input) ? input : {};
  const now = new Date().toISOString();
  const name = typeof record.name === "string" && record.name.trim() ? record.name : "My Home";
  const projectId =
    typeof record.projectId === "string" && record.projectId.trim() ? record.projectId : "default";
  const project = createDefaultDashboard({ name, projectId, now });
  const entry: MigrationEntry = {
    fromVersion: 0,
    toVersion: 1,
    migratedAt: now,
    note: "Created schema v1 structure from unversioned dashboard data.",
  };
  project.migrationHistory = [entry];
  return project;
}

function readSchemaVersion(value: unknown): number {
  if (!isRecord(value)) {
    return 0;
  }

  const raw = value.schemaVersion;
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return 0;
  }

  return raw;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

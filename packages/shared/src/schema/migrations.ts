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

export interface MigrationOptions {
  now?: string;
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

export function migrateDashboardProject(
  input: unknown,
  options: MigrationOptions = {},
): MigrationResult {
  const backup = cloneJson(input);
  let working = cloneJson(input);
  let version = readSchemaVersion(working);
  let migrated = false;
  const now = options.now ?? new Date().toISOString();

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
      working = migrate0To1(working, now);
      migrated = true;
      version = 1;
      continue;
    }
    if (version === 1) {
      working = migrate1To2(working, now);
      migrated = true;
      version = 2;
      continue;
    }
    if (version === 2) {
      working = migrate2To3(working, now);
      migrated = true;
      version = 3;
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

function migrate0To1(input: unknown, now: string): DashboardProject {
  const record = isRecord(input) ? input : {};
  const name = typeof record.name === "string" && record.name.trim() ? record.name : "My Home";
  const projectId =
    typeof record.projectId === "string" && record.projectId.trim() ? record.projectId : "default";
  const project = createDefaultDashboard({ name, projectId, now });
  project.schemaVersion = 1;
  const entry: MigrationEntry = {
    fromVersion: 0,
    toVersion: 1,
    migratedAt: now,
    note: "Created schema v1 structure from unversioned dashboard data.",
  };
  project.migrationHistory = [entry];
  return project;
}

function migrate1To2(input: unknown, now: string): DashboardProject {
  if (!isRecord(input)) {
    throw new DashboardMigrationError("Schema v1 dashboard must be an object.");
  }
  const defaults = createDefaultDashboard({ now });
  const history = Array.isArray(input.migrationHistory) ? input.migrationHistory : [];
  const settings = isRecord(input.settings) ? input.settings : {};
  return {
    ...input,
    schemaVersion: 2,
    settings: {
      ...defaults.settings,
      ...settings,
      reconnectIntervalMs:
        typeof settings.reconnectIntervalMs === "number" && settings.reconnectIntervalMs >= 500
          ? settings.reconnectIntervalMs
          : defaults.settings.reconnectIntervalMs,
    },
    assets: Array.isArray(input.assets) ? input.assets : [],
    templates: Array.isArray(input.templates) ? input.templates : [],
    themes: Array.isArray(input.themes) ? input.themes : defaults.themes,
    updatedAt: now,
    migrationHistory: [
      ...history,
      {
        fromVersion: 1,
        toVersion: 2,
        migratedAt: now,
        note: "Added reconnect settings and full MVP entity validation.",
      },
    ],
  } as DashboardProject;
}

function migrate2To3(input: unknown, now: string): DashboardProject {
  if (!isRecord(input)) {
    throw new DashboardMigrationError("Schema v2 dashboard must be an object.");
  }
  const history = Array.isArray(input.migrationHistory) ? input.migrationHistory : [];
  return {
    ...input,
    schemaVersion: 3,
    updatedAt: now,
    migrationHistory: [
      ...history,
      {
        fromVersion: 2,
        toVersion: 3,
        migratedAt: now,
        note: "Added optional nested component parent relationships.",
      },
    ],
  } as DashboardProject;
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

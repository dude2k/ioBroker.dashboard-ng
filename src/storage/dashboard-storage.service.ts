import type { DashboardProject, ValidationResult } from "../../packages/shared/src";
import {
  createDefaultDashboard,
  migrateDashboardProject,
  sanitizeDashboardFilePart,
  validateDashboardProject,
} from "../../packages/shared/src";

export interface AdapterFileApi {
  name: string;
  namespace: string;
  log: {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
  };
  readFileAsync(adapterName: string, fileName: string): Promise<AdapterFileContent>;
  writeFileAsync(adapterName: string, fileName: string, data: Buffer | string): Promise<void>;
  mkdirAsync?(adapterName: string, directory: string): Promise<void>;
  setStateAsync?(id: string, value: unknown, ack?: boolean): Promise<void>;
}

export type AdapterFileContent =
  | Buffer
  | string
  | {
      file?: Buffer | string;
      data?: Buffer | string;
    };

export interface StoredDashboard {
  dashboard: DashboardProject;
  migrated: boolean;
  backupFile?: string;
  validation: ValidationResult;
}

const DASHBOARD_DIR = "dashboards";
const BACKUP_DIR = "dashboards/backups";

export class DashboardStorageService {
  constructor(private readonly adapter: AdapterFileApi) {}

  async loadDashboard(dashboardId = "default", traceId = "storage-load"): Promise<StoredDashboard> {
    this.logTrace("info", traceId, "load start", { dashboardId });
    await this.ensureDirectories(traceId);
    const fileName = this.dashboardFileName(dashboardId);
    let raw: AdapterFileContent;

    try {
      this.logTrace("info", traceId, "read file start", { dashboardId, fileName });
      raw = await this.adapter.readFileAsync(this.adapter.name, fileName);
      this.logTrace("info", traceId, "read file ok", {
        dashboardId,
        fileName,
        content: describeFileContent(raw),
      });
    } catch (error) {
      if (isMissingFileError(error)) {
        this.logTrace("warn", traceId, "dashboard file missing, creating default", {
          dashboardId,
          fileName,
          error: readError(error),
        });
        const dashboard = createDefaultDashboard({ projectId: dashboardId });
        const savedDashboard = await this.saveDashboard(dashboardId, dashboard, traceId);
        return {
          dashboard: savedDashboard,
          migrated: false,
          validation: validateDashboardProject(savedDashboard),
        };
      }
      this.logTrace("error", traceId, "read file failed", {
        dashboardId,
        fileName,
        error: readError(error),
      });
      throw error;
    }

    const rawText = fileContentToString(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText) as unknown;
      this.logTrace("info", traceId, "json parse ok", {
        dashboardId,
        fileName,
        bytes: rawText.length,
      });
    } catch (error) {
      this.logTrace("error", traceId, "json parse failed", {
        dashboardId,
        fileName,
        bytes: rawText.length,
        error: readError(error),
      });
      throw error;
    }
    const migration = migrateDashboardProject(parsed);
    this.logTrace("info", traceId, "migration finished", {
      dashboardId,
      migrated: migration.migrated,
      validation: summarizeValidation(migration.validation),
      dashboard: summarizeDashboard(migration.project),
    });
    let backupFile: string | undefined;

    if (migration.migrated) {
      backupFile = await this.writeBackup(dashboardId, migration.backup, traceId);
      try {
        await this.writeDashboardFile(dashboardId, migration.project, traceId);
        await this.verifyDashboardFile(dashboardId, migration.project, traceId);
      } catch (error) {
        try {
          await this.writeDashboardJson(dashboardId, migration.backup, traceId, "restore");
        } catch (restoreError) {
          throw new Error(
            `Migration failed and original dashboard could not be restored: ${readError(error)}; restore: ${readError(restoreError)}`,
          );
        }
        throw new Error(`Migration failed; original dashboard restored: ${readError(error)}`);
      }
      this.logTrace("info", traceId, "migration saved", {
        dashboardId,
        schemaVersion: migration.project.schemaVersion,
        backupFile,
      });
    }

    const stored: StoredDashboard = {
      dashboard: migration.project,
      migrated: migration.migrated,
      validation: migration.validation,
    };
    this.logTrace("info", traceId, "load ok", {
      dashboardId,
      backupFile,
      dashboard: summarizeDashboard(stored.dashboard),
    });
    if (backupFile) {
      stored.backupFile = backupFile;
    }
    return stored;
  }

  async saveDashboard(
    dashboardId: string,
    dashboard: DashboardProject,
    traceId = "storage-save",
  ): Promise<DashboardProject> {
    this.logTrace("info", traceId, "save start", {
      dashboardId,
      dashboard: summarizeDashboard(dashboard),
    });
    const next: DashboardProject = {
      ...dashboard,
      projectId: dashboard.projectId || dashboardId,
      updatedAt: new Date().toISOString(),
    };
    const validation = validateDashboardProject(next);
    if (!validation.valid) {
      this.logTrace("error", traceId, "validation failed", {
        dashboardId,
        validation: summarizeValidation(validation),
      });
      throw new Error(
        `Dashboard validation failed: ${validation.issues.map((issue) => issue.message).join("; ")}`,
      );
    }
    this.logTrace("info", traceId, "validation ok", {
      dashboardId,
      validation: summarizeValidation(validation),
      dashboard: summarizeDashboard(next),
    });

    await this.ensureDirectories(traceId);
    await this.writeDashboardFile(dashboardId, next, traceId);
    await this.verifyDashboardFile(dashboardId, next, traceId);
    this.logTrace("info", traceId, "save ok", {
      dashboardId,
      fileName: this.dashboardFileName(dashboardId),
      dashboard: summarizeDashboard(next),
    });
    if (this.adapter.setStateAsync) {
      try {
        await this.adapter.setStateAsync("info.lastDashboardSave", Date.now(), true);
        this.logTrace("info", traceId, "lastDashboardSave state updated", { dashboardId });
      } catch (error) {
        this.logTrace("warn", traceId, "lastDashboardSave state update failed", {
          dashboardId,
          error: readError(error),
        });
      }
    }
    return next;
  }

  async listDashboardIds(): Promise<string[]> {
    return ["default"];
  }

  private async writeDashboardFile(
    dashboardId: string,
    dashboard: DashboardProject,
    traceId: string,
  ): Promise<void> {
    await this.writeDashboardJson(dashboardId, dashboard, traceId, "write");
  }

  private async writeDashboardJson(
    dashboardId: string,
    dashboard: unknown,
    traceId: string,
    operation: "write" | "restore",
  ): Promise<void> {
    const fileName = this.dashboardFileName(dashboardId);
    const serialized = `${JSON.stringify(dashboard, null, 2)}\n`;
    this.logTrace("info", traceId, `${operation} file start`, {
      dashboardId,
      fileName,
      bytes: serialized.length,
    });
    await this.adapter.writeFileAsync(this.adapter.name, fileName, serialized);
    this.logTrace("info", traceId, `${operation} file ok`, {
      dashboardId,
      fileName,
      bytes: serialized.length,
    });
  }

  private async verifyDashboardFile(
    dashboardId: string,
    expected: DashboardProject,
    traceId: string,
  ): Promise<void> {
    const fileName = this.dashboardFileName(dashboardId);
    this.logTrace("info", traceId, "verify file start", { dashboardId, fileName });
    try {
      const raw = await this.adapter.readFileAsync(this.adapter.name, fileName);
      const rawText = fileContentToString(raw);
      const verified = migrateDashboardProject(JSON.parse(rawText)).project;
      const matches = JSON.stringify(verified) === JSON.stringify(expected);
      this.logTrace(matches ? "info" : "error", traceId, "verify file finished", {
        dashboardId,
        fileName,
        bytes: rawText.length,
        expected: summarizeDashboard(expected),
        actual: summarizeDashboard(verified),
      });
      if (!matches) {
        throw new Error(`Saved dashboard verification failed for ${fileName}.`);
      }
    } catch (error) {
      this.logTrace("error", traceId, "verify file failed", {
        dashboardId,
        fileName,
        error: readError(error),
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private async writeBackup(
    dashboardId: string,
    backup: unknown,
    traceId: string,
  ): Promise<string> {
    const backupFile = `${BACKUP_DIR}/${sanitizeDashboardFilePart(dashboardId)}-${Date.now()}.json`;
    const serialized = `${JSON.stringify(backup, null, 2)}\n`;
    this.logTrace("info", traceId, "write backup start", {
      dashboardId,
      backupFile,
      bytes: serialized.length,
    });
    await this.adapter.writeFileAsync(this.adapter.name, backupFile, serialized);
    this.logTrace("info", traceId, "write backup ok", {
      dashboardId,
      backupFile,
      bytes: serialized.length,
    });
    return backupFile;
  }

  private async ensureDirectories(traceId: string): Promise<void> {
    if (!this.adapter.mkdirAsync) {
      this.logTrace("warn", traceId, "mkdirAsync not available");
      return;
    }

    try {
      this.logTrace("info", traceId, "ensure directories start", {
        directories: `${DASHBOARD_DIR},${BACKUP_DIR}`,
      });
      await this.adapter.mkdirAsync(this.adapter.name, DASHBOARD_DIR);
      await this.adapter.mkdirAsync(this.adapter.name, BACKUP_DIR);
      this.logTrace("info", traceId, "ensure directories ok");
    } catch (error) {
      this.logTrace("warn", traceId, "ensure directories skipped or failed", {
        error: readError(error),
      });
    }
  }

  private dashboardFileName(dashboardId: string): string {
    return `${DASHBOARD_DIR}/${sanitizeDashboardFilePart(dashboardId)}.json`;
  }

  private logTrace(
    level: "debug" | "info" | "warn" | "error",
    traceId: string,
    message: string,
    details?: Record<string, unknown>,
  ): void {
    const suffix = details ? ` ${formatDetails(details)}` : "";
    const line = `[${traceId}] storage ${message}${suffix}`;
    this.adapter.log[level](line);
    if (this.adapter.setStateAsync) {
      void this.adapter
        .setStateAsync("info.lastDebugLog", trimDebugLine(line), true)
        .catch((error) =>
          this.adapter.log.debug(`Could not update info.lastDebugLog: ${readError(error)}`),
        );
    }
  }
}

function fileContentToString(value: AdapterFileContent): string {
  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }
  if (typeof value === "string") {
    return value;
  }
  if (value.file !== undefined) {
    return fileContentToString(value.file);
  }
  if (value.data !== undefined) {
    return fileContentToString(value.data);
  }
  return String(value);
}

function isMissingFileError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /not found|ENOENT|does not exist|not exists/i.test(error.message);
}

function summarizeDashboard(dashboard: DashboardProject): string {
  return [
    `projectId=${dashboard.projectId}`,
    `schema=${dashboard.schemaVersion}`,
    `pages=${dashboard.pages.length}`,
    `components=${dashboard.components.length}`,
    `bindings=${dashboard.bindings.length}`,
    `actions=${dashboard.actions.length}`,
    `layouts=${Object.keys(dashboard.layouts).length}`,
    `updatedAt=${dashboard.updatedAt}`,
  ].join(",");
}

function summarizeValidation(validation: ValidationResult): string {
  if (validation.valid) {
    return "valid";
  }
  return validation.issues
    .slice(0, 6)
    .map((issue) => `${issue.path}:${issue.message}`)
    .join(" | ");
}

function describeFileContent(value: AdapterFileContent): string {
  if (Buffer.isBuffer(value)) {
    return `Buffer(${value.length})`;
  }
  if (typeof value === "string") {
    return `string(${value.length})`;
  }
  if (value.file !== undefined) {
    return `object.file=${describeFileContent(value.file)}`;
  }
  if (value.data !== undefined) {
    return `object.data=${describeFileContent(value.data)}`;
  }
  return "unknown";
}

function formatDetails(details: Record<string, unknown>): string {
  return Object.entries(details)
    .map(([key, value]) => `${key}=${formatDetailValue(value)}`)
    .join(" ");
}

function formatDetailValue(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify(value.message);
  }
  if (typeof value === "string") {
    return JSON.stringify(trimDebugLine(value));
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return String(value);
  }
  return JSON.stringify(trimDebugLine(String(value)));
}

function trimDebugLine(value: string): string {
  return value.length <= 1000 ? value : `${value.slice(0, 1000)}...`;
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

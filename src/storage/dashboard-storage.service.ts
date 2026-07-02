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

  async loadDashboard(dashboardId = "default"): Promise<StoredDashboard> {
    await this.ensureDirectories();
    const fileName = this.dashboardFileName(dashboardId);
    let raw: AdapterFileContent;

    try {
      raw = await this.adapter.readFileAsync(this.adapter.name, fileName);
    } catch (error) {
      if (isMissingFileError(error)) {
        const dashboard = createDefaultDashboard({ projectId: dashboardId });
        await this.saveDashboard(dashboardId, dashboard);
        return {
          dashboard,
          migrated: false,
          validation: validateDashboardProject(dashboard),
        };
      }
      throw error;
    }

    const parsed = JSON.parse(fileContentToString(raw)) as unknown;
    const migration = migrateDashboardProject(parsed);
    let backupFile: string | undefined;

    if (migration.migrated) {
      backupFile = await this.writeBackup(dashboardId, migration.backup);
      await this.writeDashboardFile(dashboardId, migration.project);
      this.adapter.log.info(
        `Migrated dashboard "${dashboardId}" to schema version ${migration.project.schemaVersion}.`,
      );
    }

    const stored: StoredDashboard = {
      dashboard: migration.project,
      migrated: migration.migrated,
      validation: migration.validation,
    };
    if (backupFile) {
      stored.backupFile = backupFile;
    }
    return stored;
  }

  async saveDashboard(dashboardId: string, dashboard: DashboardProject): Promise<DashboardProject> {
    const next: DashboardProject = {
      ...dashboard,
      projectId: dashboard.projectId || dashboardId,
      updatedAt: new Date().toISOString(),
    };
    const validation = validateDashboardProject(next);
    if (!validation.valid) {
      throw new Error(
        `Dashboard validation failed: ${validation.issues.map((issue) => issue.message).join("; ")}`,
      );
    }

    await this.ensureDirectories();
    await this.writeDashboardFile(dashboardId, next);
    if (this.adapter.setStateAsync) {
      await this.adapter.setStateAsync("info.lastDashboardSave", Date.now(), true);
    }
    return next;
  }

  async listDashboardIds(): Promise<string[]> {
    return ["default"];
  }

  private async writeDashboardFile(
    dashboardId: string,
    dashboard: DashboardProject,
  ): Promise<void> {
    await this.adapter.writeFileAsync(
      this.adapter.name,
      this.dashboardFileName(dashboardId),
      `${JSON.stringify(dashboard, null, 2)}\n`,
    );
  }

  private async writeBackup(dashboardId: string, backup: unknown): Promise<string> {
    const backupFile = `${BACKUP_DIR}/${sanitizeDashboardFilePart(dashboardId)}-${Date.now()}.json`;
    await this.adapter.writeFileAsync(
      this.adapter.name,
      backupFile,
      `${JSON.stringify(backup, null, 2)}\n`,
    );
    return backupFile;
  }

  private async ensureDirectories(): Promise<void> {
    if (!this.adapter.mkdirAsync) {
      return;
    }

    try {
      await this.adapter.mkdirAsync(this.adapter.name, DASHBOARD_DIR);
      await this.adapter.mkdirAsync(this.adapter.name, BACKUP_DIR);
    } catch (error) {
      this.adapter.log.debug(`Directory creation skipped or already done: ${String(error)}`);
    }
  }

  private dashboardFileName(dashboardId: string): string {
    return `${DASHBOARD_DIR}/${sanitizeDashboardFilePart(dashboardId)}.json`;
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

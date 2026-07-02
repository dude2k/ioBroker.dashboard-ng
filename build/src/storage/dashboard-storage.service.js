"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardStorageService = void 0;
const src_1 = require("../../packages/shared/src");
const DASHBOARD_DIR = "dashboards";
const BACKUP_DIR = "dashboards/backups";
class DashboardStorageService {
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    async loadDashboard(dashboardId = "default") {
        await this.ensureDirectories();
        const fileName = this.dashboardFileName(dashboardId);
        let raw;
        try {
            raw = await this.adapter.readFileAsync(this.adapter.name, fileName);
        }
        catch (error) {
            if (isMissingFileError(error)) {
                const dashboard = (0, src_1.createDefaultDashboard)({ projectId: dashboardId });
                await this.saveDashboard(dashboardId, dashboard);
                return {
                    dashboard,
                    migrated: false,
                    validation: (0, src_1.validateDashboardProject)(dashboard),
                };
            }
            throw error;
        }
        const parsed = JSON.parse(fileContentToString(raw));
        const migration = (0, src_1.migrateDashboardProject)(parsed);
        let backupFile;
        if (migration.migrated) {
            backupFile = await this.writeBackup(dashboardId, migration.backup);
            await this.writeDashboardFile(dashboardId, migration.project);
            this.adapter.log.info(`Migrated dashboard "${dashboardId}" to schema version ${migration.project.schemaVersion}.`);
        }
        const stored = {
            dashboard: migration.project,
            migrated: migration.migrated,
            validation: migration.validation,
        };
        if (backupFile) {
            stored.backupFile = backupFile;
        }
        return stored;
    }
    async saveDashboard(dashboardId, dashboard) {
        const next = {
            ...dashboard,
            projectId: dashboard.projectId || dashboardId,
            updatedAt: new Date().toISOString(),
        };
        const validation = (0, src_1.validateDashboardProject)(next);
        if (!validation.valid) {
            throw new Error(`Dashboard validation failed: ${validation.issues.map((issue) => issue.message).join("; ")}`);
        }
        await this.ensureDirectories();
        await this.writeDashboardFile(dashboardId, next);
        if (this.adapter.setStateAsync) {
            await this.adapter.setStateAsync("info.lastDashboardSave", Date.now(), true);
        }
        return next;
    }
    async listDashboardIds() {
        return ["default"];
    }
    async writeDashboardFile(dashboardId, dashboard) {
        await this.adapter.writeFileAsync(this.adapter.name, this.dashboardFileName(dashboardId), `${JSON.stringify(dashboard, null, 2)}\n`);
    }
    async writeBackup(dashboardId, backup) {
        const backupFile = `${BACKUP_DIR}/${(0, src_1.sanitizeDashboardFilePart)(dashboardId)}-${Date.now()}.json`;
        await this.adapter.writeFileAsync(this.adapter.name, backupFile, `${JSON.stringify(backup, null, 2)}\n`);
        return backupFile;
    }
    async ensureDirectories() {
        if (!this.adapter.mkdirAsync) {
            return;
        }
        try {
            await this.adapter.mkdirAsync(this.adapter.name, DASHBOARD_DIR);
            await this.adapter.mkdirAsync(this.adapter.name, BACKUP_DIR);
        }
        catch (error) {
            this.adapter.log.debug(`Directory creation skipped or already done: ${String(error)}`);
        }
    }
    dashboardFileName(dashboardId) {
        return `${DASHBOARD_DIR}/${(0, src_1.sanitizeDashboardFilePart)(dashboardId)}.json`;
    }
}
exports.DashboardStorageService = DashboardStorageService;
function fileContentToString(value) {
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
function isMissingFileError(error) {
    if (!(error instanceof Error)) {
        return false;
    }
    return /not found|ENOENT|does not exist|not exists/i.test(error.message);
}
//# sourceMappingURL=dashboard-storage.service.js.map
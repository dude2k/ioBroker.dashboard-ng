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
    async loadDashboard(dashboardId = "default", traceId = "storage-load") {
        this.logTrace("info", traceId, "load start", { dashboardId });
        await this.ensureDirectories(traceId);
        const fileName = this.dashboardFileName(dashboardId);
        let raw;
        try {
            this.logTrace("info", traceId, "read file start", { dashboardId, fileName });
            raw = await this.adapter.readFileAsync(this.adapter.name, fileName);
            this.logTrace("info", traceId, "read file ok", {
                dashboardId,
                fileName,
                content: describeFileContent(raw),
            });
        }
        catch (error) {
            if (isMissingFileError(error)) {
                this.logTrace("warn", traceId, "dashboard file missing, creating default", {
                    dashboardId,
                    fileName,
                    error: readError(error),
                });
                const dashboard = (0, src_1.createDefaultDashboard)({ projectId: dashboardId });
                const savedDashboard = await this.saveDashboard(dashboardId, dashboard, traceId);
                return {
                    dashboard: savedDashboard,
                    migrated: false,
                    validation: (0, src_1.validateDashboardProject)(savedDashboard),
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
        let parsed;
        try {
            parsed = JSON.parse(rawText);
            this.logTrace("info", traceId, "json parse ok", {
                dashboardId,
                fileName,
                bytes: rawText.length,
            });
        }
        catch (error) {
            this.logTrace("error", traceId, "json parse failed", {
                dashboardId,
                fileName,
                bytes: rawText.length,
                error: readError(error),
            });
            throw error;
        }
        const migration = (0, src_1.migrateDashboardProject)(parsed);
        this.logTrace("info", traceId, "migration finished", {
            dashboardId,
            migrated: migration.migrated,
            validation: summarizeValidation(migration.validation),
            dashboard: summarizeDashboard(migration.project),
        });
        let backupFile;
        if (migration.migrated) {
            backupFile = await this.writeBackup(dashboardId, migration.backup, traceId);
            try {
                await this.writeDashboardFile(dashboardId, migration.project, traceId);
                await this.verifyDashboardFile(dashboardId, migration.project, traceId);
            }
            catch (error) {
                try {
                    await this.writeDashboardJson(dashboardId, migration.backup, traceId, "restore");
                }
                catch (restoreError) {
                    throw new Error(`Migration failed and original dashboard could not be restored: ${readError(error)}; restore: ${readError(restoreError)}`);
                }
                throw new Error(`Migration failed; original dashboard restored: ${readError(error)}`);
            }
            this.logTrace("info", traceId, "migration saved", {
                dashboardId,
                schemaVersion: migration.project.schemaVersion,
                backupFile,
            });
        }
        const stored = {
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
    async saveDashboard(dashboardId, dashboard, traceId = "storage-save") {
        this.logTrace("info", traceId, "save start", {
            dashboardId,
            dashboard: summarizeDashboard(dashboard),
        });
        const next = {
            ...dashboard,
            projectId: dashboard.projectId || dashboardId,
            updatedAt: new Date().toISOString(),
        };
        const validation = (0, src_1.validateDashboardProject)(next);
        if (!validation.valid) {
            this.logTrace("error", traceId, "validation failed", {
                dashboardId,
                validation: summarizeValidation(validation),
            });
            throw new Error(`Dashboard validation failed: ${validation.issues.map((issue) => issue.message).join("; ")}`);
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
            }
            catch (error) {
                this.logTrace("warn", traceId, "lastDashboardSave state update failed", {
                    dashboardId,
                    error: readError(error),
                });
            }
        }
        return next;
    }
    async listDashboardIds() {
        return ["default"];
    }
    async writeDashboardFile(dashboardId, dashboard, traceId) {
        await this.writeDashboardJson(dashboardId, dashboard, traceId, "write");
    }
    async writeDashboardJson(dashboardId, dashboard, traceId, operation) {
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
    async verifyDashboardFile(dashboardId, expected, traceId) {
        const fileName = this.dashboardFileName(dashboardId);
        this.logTrace("info", traceId, "verify file start", { dashboardId, fileName });
        try {
            const raw = await this.adapter.readFileAsync(this.adapter.name, fileName);
            const rawText = fileContentToString(raw);
            const verified = (0, src_1.migrateDashboardProject)(JSON.parse(rawText)).project;
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
        }
        catch (error) {
            this.logTrace("error", traceId, "verify file failed", {
                dashboardId,
                fileName,
                error: readError(error),
            });
            throw error instanceof Error ? error : new Error(String(error));
        }
    }
    async writeBackup(dashboardId, backup, traceId) {
        const backupFile = `${BACKUP_DIR}/${(0, src_1.sanitizeDashboardFilePart)(dashboardId)}-${Date.now()}.json`;
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
    async ensureDirectories(traceId) {
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
        }
        catch (error) {
            this.logTrace("warn", traceId, "ensure directories skipped or failed", {
                error: readError(error),
            });
        }
    }
    dashboardFileName(dashboardId) {
        return `${DASHBOARD_DIR}/${(0, src_1.sanitizeDashboardFilePart)(dashboardId)}.json`;
    }
    logTrace(level, traceId, message, details) {
        const suffix = details ? ` ${formatDetails(details)}` : "";
        const line = `[${traceId}] storage ${message}${suffix}`;
        this.adapter.log[level](line);
        if (this.adapter.setStateAsync) {
            void this.adapter
                .setStateAsync("info.lastDebugLog", trimDebugLine(line), true)
                .catch((error) => this.adapter.log.debug(`Could not update info.lastDebugLog: ${readError(error)}`));
        }
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
function summarizeDashboard(dashboard) {
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
function summarizeValidation(validation) {
    if (validation.valid) {
        return "valid";
    }
    return validation.issues
        .slice(0, 6)
        .map((issue) => `${issue.path}:${issue.message}`)
        .join(" | ");
}
function describeFileContent(value) {
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
function formatDetails(details) {
    return Object.entries(details)
        .map(([key, value]) => `${key}=${formatDetailValue(value)}`)
        .join(" ");
}
function formatDetailValue(value) {
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
function trimDebugLine(value) {
    return value.length <= 1000 ? value : `${value.slice(0, 1000)}...`;
}
function readError(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=dashboard-storage.service.js.map
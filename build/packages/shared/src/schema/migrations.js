"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardMigrationError = void 0;
exports.migrateDashboardProject = migrateDashboardProject;
const types_1 = require("./types");
const defaults_1 = require("./defaults");
const validation_1 = require("./validation");
class DashboardMigrationError extends Error {
    validation;
    constructor(message, validation) {
        super(message);
        this.validation = validation;
        this.name = "DashboardMigrationError";
    }
}
exports.DashboardMigrationError = DashboardMigrationError;
function migrateDashboardProject(input) {
    const backup = cloneJson(input);
    let working = cloneJson(input);
    let version = readSchemaVersion(working);
    let migrated = false;
    if (version > types_1.CURRENT_SCHEMA_VERSION) {
        throw new DashboardMigrationError(`Dashboard schema version ${version} is newer than supported version ${types_1.CURRENT_SCHEMA_VERSION}.`);
    }
    if (version < 0) {
        version = 0;
    }
    while (version < types_1.CURRENT_SCHEMA_VERSION) {
        if (version === 0) {
            working = migrate0To1(working);
            migrated = true;
            version = 1;
            continue;
        }
        throw new DashboardMigrationError(`No migration path from schema version ${version}.`);
    }
    const validation = (0, validation_1.validateDashboardProject)(working);
    if (!validation.valid) {
        throw new DashboardMigrationError("Migrated dashboard did not pass validation.", validation);
    }
    return {
        project: working,
        backup: migrated ? backup : undefined,
        migrated,
        validation,
    };
}
function migrate0To1(input) {
    const record = isRecord(input) ? input : {};
    const now = new Date().toISOString();
    const name = typeof record.name === "string" && record.name.trim() ? record.name : "My Home";
    const projectId = typeof record.projectId === "string" && record.projectId.trim() ? record.projectId : "default";
    const project = (0, defaults_1.createDefaultDashboard)({ name, projectId, now });
    const entry = {
        fromVersion: 0,
        toVersion: 1,
        migratedAt: now,
        note: "Created schema v1 structure from unversioned dashboard data.",
    };
    project.migrationHistory = [entry];
    return project;
}
function readSchemaVersion(value) {
    if (!isRecord(value)) {
        return 0;
    }
    const raw = value.schemaVersion;
    if (typeof raw !== "number" || !Number.isInteger(raw)) {
        return 0;
    }
    return raw;
}
function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=migrations.js.map
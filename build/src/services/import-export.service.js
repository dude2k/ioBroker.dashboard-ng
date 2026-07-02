"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportExportService = void 0;
const src_1 = require("../../packages/shared/src");
class ImportExportService {
    createExportBundle(dashboard) {
        return {
            format: "dashboard-ng",
            formatVersion: 1,
            exportedAt: new Date().toISOString(),
            dashboard,
            assets: [],
        };
    }
    readImportPayload(payload) {
        const dashboardCandidate = isExportBundle(payload) ? payload.dashboard : payload;
        return (0, src_1.migrateDashboardProject)(dashboardCandidate).project;
    }
}
exports.ImportExportService = ImportExportService;
function isExportBundle(value) {
    return (typeof value === "object" &&
        value !== null &&
        value.format === "dashboard-ng" &&
        typeof value.formatVersion === "number" &&
        "dashboard" in value);
}
//# sourceMappingURL=import-export.service.js.map
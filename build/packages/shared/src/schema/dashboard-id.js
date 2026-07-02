"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeDashboardFilePart = sanitizeDashboardFilePart;
function sanitizeDashboardFilePart(value) {
    return value.replace(/[^a-zA-Z0-9_.-]/g, "_") || "default";
}
//# sourceMappingURL=dashboard-id.js.map
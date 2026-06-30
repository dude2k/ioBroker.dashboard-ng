import type { DashboardProject } from "../../packages/shared/src";
import { migrateDashboardProject } from "../../packages/shared/src";
import type { DashboardExportBundle } from "../types/messages";

export class ImportExportService {
  createExportBundle(dashboard: DashboardProject): DashboardExportBundle {
    return {
      format: "dashboard-ng",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      dashboard,
      assets: [],
    };
  }

  readImportPayload(payload: unknown): DashboardProject {
    const dashboardCandidate = isExportBundle(payload) ? payload.dashboard : payload;
    return migrateDashboardProject(dashboardCandidate).project;
  }
}

function isExportBundle(value: unknown): value is DashboardExportBundle {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { format?: unknown }).format === "dashboard-ng" &&
    typeof (value as { formatVersion?: unknown }).formatVersion === "number" &&
    "dashboard" in value
  );
}

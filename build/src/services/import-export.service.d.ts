import type { DashboardProject } from "../../packages/shared/src";
import type { DashboardExportBundle } from "../types/messages";
export declare class ImportExportService {
    createExportBundle(dashboard: DashboardProject): DashboardExportBundle;
    readImportPayload(payload: unknown): DashboardProject;
}

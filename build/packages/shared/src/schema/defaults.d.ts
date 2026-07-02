import type { DashboardProject } from "./types";
export interface DefaultDashboardOptions {
    projectId?: string;
    name?: string;
    now?: string;
}
export declare function createDefaultDashboard(options?: DefaultDashboardOptions): DashboardProject;

import type { DashboardProject, Template } from "./types";
export interface DefaultDashboardOptions {
    projectId?: string;
    name?: string;
    now?: string;
}
export declare function createDefaultDashboard(options?: DefaultDashboardOptions): DashboardProject;
export declare function createStarterTemplates(now?: string): Template[];
export declare function upgradeStarterTemplates(project: DashboardProject): DashboardProject;

import type { DashboardProject, Template } from "./schema/types";
export declare const TEMPLATE_EXPORT_FORMAT = "ioBroker.dashboard-ng/template";
export interface TemplateExport {
    format: typeof TEMPLATE_EXPORT_FORMAT;
    version: 1;
    template: Template;
}
export interface DashboardImportResult {
    project: DashboardProject;
    missingStateIds: string[];
    migrated: boolean;
}
export declare function importDashboardProject(input: unknown, availableStateIds?: Iterable<string>): DashboardImportResult;
export declare function exportTemplate(template: Template): TemplateExport;
export declare function importTemplate(input: unknown): Template;
export declare function createPageTemplate(project: DashboardProject, pageId: string, name: string): Template;
export declare function applyPageTemplate(project: DashboardProject, template: Template): DashboardProject;
export declare function collectMissingStateIds(project: DashboardProject, availableStateIds: Iterable<string>): string[];
export declare function markMissingStates(project: DashboardProject, availableStateIds: Iterable<string>): DashboardProject;
export declare function remapDashboardStates(project: DashboardProject, mapping: Record<string, string>): DashboardProject;

import type { DashboardProject, ValidationResult } from "./types";
export interface MigrationResult {
    project: DashboardProject;
    backup: unknown | undefined;
    migrated: boolean;
    validation: ValidationResult;
}
export declare class DashboardMigrationError extends Error {
    readonly validation?: ValidationResult | undefined;
    constructor(message: string, validation?: ValidationResult | undefined);
}
export declare function migrateDashboardProject(input: unknown): MigrationResult;

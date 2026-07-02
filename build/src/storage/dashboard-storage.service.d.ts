import type { DashboardProject, ValidationResult } from "../../packages/shared/src";
export interface AdapterFileApi {
    name: string;
    namespace: string;
    log: {
        debug(message: string): void;
        info(message: string): void;
        warn(message: string): void;
        error(message: string): void;
    };
    readFileAsync(adapterName: string, fileName: string): Promise<AdapterFileContent>;
    writeFileAsync(adapterName: string, fileName: string, data: Buffer | string): Promise<void>;
    mkdirAsync?(adapterName: string, directory: string): Promise<void>;
    setStateAsync?(id: string, value: unknown, ack?: boolean): Promise<void>;
}
export type AdapterFileContent = Buffer | string | {
    file?: Buffer | string;
    data?: Buffer | string;
};
export interface StoredDashboard {
    dashboard: DashboardProject;
    migrated: boolean;
    backupFile?: string;
    validation: ValidationResult;
}
export declare class DashboardStorageService {
    private readonly adapter;
    constructor(adapter: AdapterFileApi);
    loadDashboard(dashboardId?: string): Promise<StoredDashboard>;
    saveDashboard(dashboardId: string, dashboard: DashboardProject): Promise<DashboardProject>;
    listDashboardIds(): Promise<string[]>;
    private writeDashboardFile;
    private writeBackup;
    private ensureDirectories;
    private dashboardFileName;
}

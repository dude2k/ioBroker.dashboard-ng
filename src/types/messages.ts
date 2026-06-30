import type {
  DashboardProject,
  StateOption,
  StatePrimitive,
  StateSnapshot,
} from "../../packages/shared/src";

export type AdapterCommand =
  | "dashboard.load"
  | "dashboard.save"
  | "dashboard.export"
  | "dashboard.import"
  | "objects.search"
  | "states.read"
  | "state.write";

export interface DashboardExportBundle {
  format: "dashboard-ng";
  formatVersion: 1;
  exportedAt: string;
  dashboard: DashboardProject;
  assets: unknown[];
}

export interface CommandResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

export interface LoadDashboardPayload {
  dashboardId?: string;
}

export interface SaveDashboardPayload {
  dashboardId?: string;
  dashboard: DashboardProject;
}

export interface ImportDashboardPayload {
  dashboardId?: string;
  bundle: DashboardExportBundle | DashboardProject | unknown;
}

export interface SearchObjectsPayload {
  query?: string;
  limit?: number;
}

export interface ReadStatesPayload {
  stateIds: string[];
}

export interface WriteStatePayload {
  stateId: string;
  value: StatePrimitive;
}

export type CommandPayload =
  | LoadDashboardPayload
  | SaveDashboardPayload
  | ImportDashboardPayload
  | SearchObjectsPayload
  | ReadStatesPayload
  | WriteStatePayload
  | undefined;

export interface CommandResultMap {
  "dashboard.load": DashboardProject;
  "dashboard.save": DashboardProject;
  "dashboard.export": DashboardExportBundle;
  "dashboard.import": DashboardProject;
  "objects.search": StateOption[];
  "states.read": StateSnapshot[];
  "state.write": StateSnapshot;
}

import type { DashboardAction, StatePrimitive } from "../schema/types";
export interface ActionRuntime {
    getState(id: string): Promise<StatePrimitive | undefined>;
    setState(id: string, value: StatePrimitive): Promise<void>;
    navigate(pageId: string): void;
    openUrl(url: string, newWindow: boolean): void;
}
export declare function runDashboardAction(action: DashboardAction, runtime: ActionRuntime): Promise<void>;

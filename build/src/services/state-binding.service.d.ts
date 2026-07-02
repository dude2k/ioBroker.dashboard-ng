import type { StateOption, StatePrimitive, StateSnapshot } from "../../packages/shared/src";
interface IoBrokerObject {
    common?: {
        name?: string | Record<string, string>;
        role?: string;
        type?: string;
        unit?: string;
        min?: number;
        max?: number;
        read?: boolean;
        write?: boolean;
    };
}
interface IoBrokerState {
    val: StatePrimitive;
    ack?: boolean;
    q?: number;
    ts?: number;
    lc?: number;
}
export interface AdapterStateApi {
    log: {
        warn(message: string): void;
    };
    getForeignObjectsAsync(pattern: string, type: "state"): Promise<Record<string, IoBrokerObject>>;
    getForeignObjectAsync(id: string): Promise<IoBrokerObject | null | undefined>;
    getForeignStateAsync(id: string): Promise<IoBrokerState | null | undefined>;
    setForeignStateAsync(id: string, value: StatePrimitive, ack?: boolean): Promise<void>;
}
export declare class StateBindingService {
    private readonly adapter;
    constructor(adapter: AdapterStateApi);
    searchObjects(query?: string, limit?: number): Promise<StateOption[]>;
    readStates(stateIds: string[]): Promise<StateSnapshot[]>;
    readState(id: string): Promise<StateSnapshot>;
    writeState(id: string, value: StatePrimitive): Promise<StateSnapshot>;
}
export {};

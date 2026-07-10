import type { StateOption, StatePrimitive, StateSnapshot } from "../../packages/shared/src";
interface IoBrokerObject {
    type?: string;
    common?: {
        name?: string | Record<string, string>;
        role?: string;
        type?: string;
        unit?: string;
        min?: number;
        max?: number;
        read?: boolean;
        write?: boolean;
        alias?: {
            id: string | {
                read: string;
                write: string;
            };
        };
        members?: string[];
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
    getForeignObjectsAsync(pattern: string, type: "state" | "enum"): Promise<Record<string, IoBrokerObject | null | undefined>>;
    getForeignStatesAsync(pattern: string | string[]): Promise<Record<string, IoBrokerState | null | undefined>>;
    getForeignObjectAsync(id: string): Promise<IoBrokerObject | null | undefined>;
    getForeignStateAsync(id: string): Promise<IoBrokerState | null | undefined>;
    setForeignStateAsync(id: string, value: StatePrimitive, ack?: boolean): Promise<void>;
}
export declare class StateBindingService {
    private readonly adapter;
    constructor(adapter: AdapterStateApi);
    searchObjects(query?: string, limit?: number): Promise<StateOption[]>;
    private readEnums;
    readStates(stateIds: string[]): Promise<StateSnapshot[]>;
    readState(id: string): Promise<StateSnapshot>;
    writeState(id: string, value: StatePrimitive): Promise<StateSnapshot>;
}
export {};

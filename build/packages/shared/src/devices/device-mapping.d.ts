import type { BindingMode, ComponentType, StateOption } from "../schema/types";
export type DeviceKind = "light" | "thermostat" | "blind" | "sensor" | "scene" | "energy" | "camera";
export interface DeviceMappingBinding {
    target: string;
    stateId: string;
    mode: BindingMode;
}
export interface DeviceMapping {
    kind: DeviceKind;
    confidence: "high" | "medium" | "low";
    rootId: string;
    name: string;
    bindings: DeviceMappingBinding[];
}
export declare function detectDeviceMapping(selected: StateOption, candidates: StateOption[], componentType?: ComponentType): DeviceMapping;

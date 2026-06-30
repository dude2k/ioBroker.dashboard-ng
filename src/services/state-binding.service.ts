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

export class StateBindingService {
  constructor(private readonly adapter: AdapterStateApi) {}

  async searchObjects(query = "", limit = 80): Promise<StateOption[]> {
    const normalizedQuery = query.trim().toLowerCase();
    const objects = await this.adapter.getForeignObjectsAsync("*", "state");
    const results: StateOption[] = [];

    for (const [id, object] of Object.entries(objects)) {
      const option = mapObjectToStateOption(id, object);
      const searchable =
        `${option.id} ${option.name} ${option.role ?? ""} ${option.unit ?? ""}`.toLowerCase();
      if (!normalizedQuery || searchable.includes(normalizedQuery)) {
        results.push(option);
      }
      if (results.length >= limit) {
        break;
      }
    }

    return results;
  }

  async readStates(stateIds: string[]): Promise<StateSnapshot[]> {
    return Promise.all(stateIds.map((id) => this.readState(id)));
  }

  async readState(id: string): Promise<StateSnapshot> {
    try {
      const state = await this.adapter.getForeignStateAsync(id);
      if (!state) {
        return { id, value: null, missing: true };
      }
      const snapshot: StateSnapshot = {
        id,
        value: state.val,
        missing: false,
      };
      if (typeof state.ack === "boolean") {
        snapshot.ack = state.ack;
      }
      if (typeof state.q === "number") {
        snapshot.q = state.q;
      }
      if (typeof state.ts === "number") {
        snapshot.ts = state.ts;
      }
      if (typeof state.lc === "number") {
        snapshot.lc = state.lc;
      }
      return snapshot;
    } catch (error) {
      this.adapter.log.warn(`Could not read state ${id}: ${String(error)}`);
      return { id, value: null, missing: true };
    }
  }

  async writeState(id: string, value: StatePrimitive): Promise<StateSnapshot> {
    const object = await this.adapter.getForeignObjectAsync(id);
    if (!object) {
      throw new Error(`State ${id} does not exist.`);
    }
    if (object.common?.write === false) {
      throw new Error(`State ${id} is not writable.`);
    }
    await this.adapter.setForeignStateAsync(id, value, false);
    return this.readState(id);
  }
}

function mapObjectToStateOption(id: string, object: IoBrokerObject): StateOption {
  const common = object.common ?? {};
  const option: StateOption = {
    id,
    name: localizeName(common.name) || id,
    type: normalizeType(common.type),
    read: common.read !== false,
    write: common.write === true,
  };

  if (common.role) {
    option.role = common.role;
  }
  if (common.unit) {
    option.unit = common.unit;
  }
  if (typeof common.min === "number") {
    option.min = common.min;
  }
  if (typeof common.max === "number") {
    option.max = common.max;
  }

  return option;
}

function localizeName(name: string | Record<string, string> | undefined): string {
  if (!name) {
    return "";
  }
  if (typeof name === "string") {
    return name;
  }
  return name.en ?? name.de ?? Object.values(name)[0] ?? "";
}

function normalizeType(type: string | undefined): StateOption["type"] {
  if (
    type === "boolean" ||
    type === "number" ||
    type === "string" ||
    type === "object" ||
    type === "array"
  ) {
    return type;
  }
  if (type === "mixed") {
    return "mixed";
  }
  return "unknown";
}

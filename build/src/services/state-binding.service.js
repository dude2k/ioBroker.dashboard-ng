"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateBindingService = void 0;
class StateBindingService {
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    async searchObjects(query = "", limit = 80) {
        const normalizedQuery = query.trim().toLowerCase();
        const objects = await this.adapter.getForeignObjectsAsync("*", "state");
        const results = [];
        for (const [id, object] of Object.entries(objects)) {
            const option = mapObjectToStateOption(id, object);
            const searchable = `${option.id} ${option.name} ${option.role ?? ""} ${option.unit ?? ""}`.toLowerCase();
            if (!normalizedQuery || searchable.includes(normalizedQuery)) {
                results.push(option);
            }
            if (results.length >= limit) {
                break;
            }
        }
        return results;
    }
    async readStates(stateIds) {
        return Promise.all(stateIds.map((id) => this.readState(id)));
    }
    async readState(id) {
        try {
            const state = await this.adapter.getForeignStateAsync(id);
            if (!state) {
                return { id, value: null, missing: true };
            }
            const snapshot = {
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
        }
        catch (error) {
            this.adapter.log.warn(`Could not read state ${id}: ${String(error)}`);
            return { id, value: null, missing: true };
        }
    }
    async writeState(id, value) {
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
exports.StateBindingService = StateBindingService;
function mapObjectToStateOption(id, object) {
    const common = object.common ?? {};
    const option = {
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
function localizeName(name) {
    if (!name) {
        return "";
    }
    if (typeof name === "string") {
        return name;
    }
    return name.en ?? name.de ?? Object.values(name)[0] ?? "";
}
function normalizeType(type) {
    if (type === "boolean" ||
        type === "number" ||
        type === "string" ||
        type === "object" ||
        type === "array") {
        return type;
    }
    if (type === "mixed") {
        return "mixed";
    }
    return "unknown";
}
//# sourceMappingURL=state-binding.service.js.map
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
        const [objects, roomEnums, functionEnums] = await Promise.all([
            this.adapter.getForeignObjectsAsync("*", "state"),
            this.readEnums("enum.rooms.*"),
            this.readEnums("enum.functions.*"),
        ]);
        const results = Object.entries(objects)
            .filter((entry) => Boolean(entry[1]))
            .map(([id, object]) => {
            const option = mapObjectToStateOption(id, object);
            const rooms = findEnumNames(id, roomEnums);
            const stateFunctions = findEnumNames(id, functionEnums);
            const room = rooms[0];
            const stateFunction = stateFunctions[0];
            if (room) {
                option.room = room;
                option.rooms = rooms;
            }
            if (stateFunction) {
                option.function = stateFunction;
                option.functions = stateFunctions;
            }
            return option;
        })
            .filter((option) => matchesQuery(option, normalizedQuery))
            .sort((left, right) => left.id.localeCompare(right.id))
            .slice(0, Math.max(1, Math.min(limit, 5000)));
        if (results.length) {
            try {
                const states = await this.adapter.getForeignStatesAsync(results.map((option) => option.id));
                results.forEach((option) => attachState(option, states[option.id]));
            }
            catch (error) {
                this.adapter.log.warn(`Could not read state metadata for object search: ${String(error)}`);
            }
        }
        return results;
    }
    async readEnums(pattern) {
        try {
            return await this.adapter.getForeignObjectsAsync(pattern, "enum");
        }
        catch (error) {
            this.adapter.log.warn(`Could not read ${pattern}: ${String(error)}`);
            return {};
        }
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
    const names = localizedNames(common.name);
    const option = {
        id,
        name: names[0] || id,
        names,
        parentId: parentId(id),
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
    if (common.alias?.id) {
        option.alias = true;
        option.aliasTarget =
            typeof common.alias.id === "string" ? common.alias.id : common.alias.id.read;
    }
    return option;
}
function localizedNames(name) {
    if (!name) {
        return [];
    }
    if (typeof name === "string") {
        return [name];
    }
    return [...new Set([name.en, name.de, ...Object.values(name)].filter(Boolean))];
}
function matchesQuery(option, query) {
    if (!query) {
        return true;
    }
    return [
        option.id,
        option.name,
        ...(option.names ?? []),
        option.role,
        option.type,
        option.unit,
        option.room,
        ...(option.rooms ?? []),
        option.function,
        ...(option.functions ?? []),
        option.aliasTarget,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
}
function attachState(option, state) {
    option.missing = !state;
    if (!state) {
        return;
    }
    option.value = state.val;
    if (typeof state.ack === "boolean") {
        option.ack = state.ack;
    }
    if (typeof state.q === "number") {
        option.q = state.q;
    }
    if (typeof state.ts === "number") {
        option.ts = state.ts;
    }
    if (typeof state.lc === "number") {
        option.lc = state.lc;
    }
}
function findEnumNames(id, enums) {
    const names = [];
    for (const object of Object.values(enums)) {
        if (!object) {
            continue;
        }
        const belongs = object.common?.members?.some((member) => id === member || id.startsWith(`${member}.`));
        if (belongs) {
            names.push(...localizedNames(object.common?.name));
        }
    }
    return [...new Set(names)];
}
function parentId(id) {
    const separator = id.lastIndexOf(".");
    return separator > 0 ? id.slice(0, separator) : id;
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
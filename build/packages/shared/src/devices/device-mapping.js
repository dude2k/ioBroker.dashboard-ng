"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDeviceMapping = detectDeviceMapping;
const componentKinds = {
    "light-card": "light",
    "thermostat-card": "thermostat",
    "blind-card": "blind",
    "sensor-card": "sensor",
    "scene-button": "scene",
    "energy-card": "energy",
    "camera-card": "camera",
    "mini-chart-card": "sensor",
    "value-display": "sensor",
};
const rules = {
    light: [
        { target: "value", roles: ["switch.light", "switch"], writable: true },
        {
            target: "brightness",
            roles: ["level.dimmer"],
            names: ["brightness", "dimmer"],
            writable: true,
        },
    ],
    thermostat: [
        {
            target: "value",
            roles: ["value.temperature"],
            names: ["actual", "current", "ist"],
        },
        {
            target: "target",
            roles: ["level.temperature", "value.temperature"],
            names: ["setpoint", "target", "set", "soll"],
            writable: true,
        },
    ],
    blind: [
        { target: "value", roles: ["level.blind", "level.shutter"], writable: true },
        {
            target: "open",
            roles: ["button.open"],
            names: ["open", "up", "hoch"],
            writable: true,
        },
        {
            target: "close",
            roles: ["button.close"],
            names: ["close", "down", "runter"],
            writable: true,
        },
        { target: "stop", roles: ["button.stop"], names: ["stop"], writable: true },
    ],
    sensor: [{ target: "value", roles: ["value"] }],
    scene: [
        { target: "value", roles: ["button", "scene"], names: ["scene", "szene"], writable: true },
    ],
    energy: [
        {
            target: "value",
            roles: ["value.power", "value.energy", "value.current", "value.voltage"],
            names: ["power", "energy", "strom", "leistung", "verbrauch"],
        },
    ],
    camera: [
        {
            target: "imageUrl",
            roles: ["url", "value.url", "media.camera", "camera"],
            names: ["snapshot", "image", "camera", "bild"],
        },
    ],
};
function detectDeviceMapping(selected, candidates, componentType) {
    const rootId = selected.parentId ?? parentId(selected.id);
    const group = candidates.filter((candidate) => {
        const candidateRoot = candidate.parentId ?? parentId(candidate.id);
        return candidateRoot === rootId;
    });
    if (!group.some((candidate) => candidate.id === selected.id)) {
        group.push(selected);
    }
    const preferredKind = componentType ? componentKinds[componentType] : undefined;
    const kind = preferredKind ?? detectKind(group, selected);
    const targetRules = adaptRulesForComponent(rules[kind], componentType);
    const used = new Set();
    const bindings = [];
    targetRules.forEach((rule, index) => {
        const best = [...group]
            .filter((candidate) => !candidate.deleted && !used.has(candidate.id))
            .map((candidate) => ({ candidate, score: scoreTarget(candidate, rule, selected, index) }))
            .sort((left, right) => right.score - left.score)[0];
        if (!best || best.score < 1) {
            return;
        }
        used.add(best.candidate.id);
        bindings.push({
            target: rule.target,
            stateId: best.candidate.id,
            mode: bindingMode(best.candidate, rule),
        });
    });
    if (!bindings.length) {
        bindings.push({
            target: primaryTarget(componentType),
            stateId: selected.id,
            mode: selected.write ? "readwrite" : "read",
        });
    }
    const bestScore = Math.max(...targetRules.map((rule) => scoreTarget(selected, rule, selected, 0)));
    return {
        kind,
        confidence: bestScore >= 8 ? "high" : bestScore >= 4 ? "medium" : "low",
        rootId,
        name: selected.room ? `${selected.room}: ${selected.name}` : selected.name,
        bindings,
    };
}
function adaptRulesForComponent(source, componentType) {
    if (componentType === "mini-chart-card") {
        return source.slice(0, 1).map((rule) => ({ ...rule, target: "samples" }));
    }
    if (componentType === "value-display") {
        return source.slice(0, 1).map((rule) => ({ ...rule, target: "value" }));
    }
    return source;
}
function detectKind(group, selected) {
    const scored = Object.keys(rules).map((kind) => ({
        kind,
        score: Math.max(...group.flatMap((candidate) => rules[kind].map((rule, index) => scoreTarget(candidate, rule, selected, index)))),
    }));
    return scored.sort((left, right) => right.score - left.score)[0]?.kind ?? "sensor";
}
function scoreTarget(candidate, rule, selected, index) {
    const role = candidate.role?.toLowerCase() ?? "";
    const text = `${candidate.id} ${candidate.name}`.toLowerCase();
    let score = candidate.id === selected.id && index === 0 ? 3 : 0;
    rule.roles.forEach((expected) => {
        if (role === expected) {
            score = Math.max(score, 10);
        }
        else if (role.startsWith(`${expected}.`) || role.startsWith(expected)) {
            score = Math.max(score, 7);
        }
    });
    if (rule.names?.some((name) => text.includes(name))) {
        score += 3;
    }
    if (rule.writable && candidate.write) {
        score += 2;
    }
    if (rule.writable && !candidate.write) {
        score -= 4;
    }
    return score;
}
function bindingMode(candidate, rule) {
    if (rule.writable) {
        return candidate.read && candidate.write ? "readwrite" : candidate.write ? "write" : "read";
    }
    return "read";
}
function primaryTarget(componentType) {
    if (componentType === "camera-card") {
        return "imageUrl";
    }
    if (componentType === "mini-chart-card") {
        return "samples";
    }
    return "value";
}
function parentId(id) {
    return id.slice(0, Math.max(0, id.lastIndexOf(".")));
}
//# sourceMappingURL=device-mapping.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDashboardAction = runDashboardAction;
const evaluator_1 = require("../formulas/evaluator");
async function runDashboardAction(action, runtime) {
    const conditionResult = action.condition
        ? await evaluateCondition(action.condition, runtime)
        : true;
    const steps = conditionResult ? action.steps : (action.elseSteps ?? []);
    for (const step of steps) {
        await runStep(step, runtime);
    }
}
async function evaluateCondition(condition, runtime) {
    if (condition.kind === "formula") {
        const context = {};
        return Boolean((0, evaluator_1.evaluateFormula)(condition.formula ?? "false", context));
    }
    if (!condition.stateId) {
        return false;
    }
    const current = await runtime.getState(condition.stateId);
    switch (condition.kind) {
        case "stateEquals":
            return current === condition.value;
        case "stateNotEquals":
            return current !== condition.value;
        case "stateGreaterThan":
            return Number(current) > Number(condition.value);
        case "stateLessThan":
            return Number(current) < Number(condition.value);
        default:
            return false;
    }
}
async function runStep(step, runtime) {
    switch (step.kind) {
        case "setState":
            await runtime.setState(step.stateId, step.value);
            return;
        case "toggleState": {
            const current = await runtime.getState(step.stateId);
            await runtime.setState(step.stateId, current ? false : true);
            return;
        }
        case "navigate":
            runtime.navigate(step.pageId);
            return;
        case "openUrl":
            runtime.openUrl(step.url, step.newWindow);
            return;
        case "runScene":
            await runtime.setState(step.stateId, step.value ?? true);
            return;
    }
}
//# sourceMappingURL=action-engine.js.map
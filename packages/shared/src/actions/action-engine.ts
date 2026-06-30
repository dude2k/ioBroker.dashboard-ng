import type { ActionCondition, ActionStep, DashboardAction, StatePrimitive } from "../schema/types";
import { evaluateFormula, type FormulaContext } from "../formulas/evaluator";

export interface ActionRuntime {
  getState(id: string): Promise<StatePrimitive | undefined>;
  setState(id: string, value: StatePrimitive): Promise<void>;
  navigate(pageId: string): void;
  openUrl(url: string, newWindow: boolean): void;
}

export async function runDashboardAction(
  action: DashboardAction,
  runtime: ActionRuntime,
): Promise<void> {
  const conditionResult = action.condition
    ? await evaluateCondition(action.condition, runtime)
    : true;
  const steps = conditionResult ? action.steps : (action.elseSteps ?? []);

  for (const step of steps) {
    await runStep(step, runtime);
  }
}

async function evaluateCondition(
  condition: ActionCondition,
  runtime: ActionRuntime,
): Promise<boolean> {
  if (condition.kind === "formula") {
    const context: FormulaContext = {};
    return Boolean(evaluateFormula(condition.formula ?? "false", context));
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

async function runStep(step: ActionStep, runtime: ActionRuntime): Promise<void> {
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

import {
  evaluateFormula,
  type Binding,
  type StatePrimitive,
  type StateSnapshot,
} from "@dashboard-ng/shared";
import type {
  RuntimeResolvedState,
  RuntimeStateInput,
  RuntimeStateValues,
  RuntimeTargetState,
} from "./types";

export function getBindingForTarget(
  bindings: Binding[] | undefined,
  target = "value",
): Binding | undefined {
  return bindings?.find((binding) => binding.target === target) ?? bindings?.[0];
}

export function resolveTargetState(
  bindings: Binding[] | undefined,
  values: RuntimeStateValues | undefined,
  target = "value",
): RuntimeTargetState {
  const binding = getBindingForTarget(bindings, target);
  if (binding?.kind === "formula") {
    return resolveFormulaBinding(binding, values);
  }

  if (!binding?.stateId) {
    return {
      value: undefined,
      empty: true,
      missing: Boolean(binding?.missing),
      loading: false,
      readable: binding?.mode === "read" || binding?.mode === "readwrite",
      writable: binding?.mode === "write" || binding?.mode === "readwrite",
      ...(binding ? { binding } : {}),
    };
  }

  const raw = values?.[binding.stateId];
  const resolved = resolveRuntimeState(raw);
  return {
    ...resolved,
    empty: false,
    readable: binding.mode === "read" || binding.mode === "readwrite",
    writable: binding.mode === "write" || binding.mode === "readwrite",
    stateId: binding.stateId,
    binding,
    missing: binding.missing || resolved.missing,
  };
}

function resolveFormulaBinding(
  binding: Binding,
  values: RuntimeStateValues | undefined,
): RuntimeTargetState {
  const source = binding.stateId ? resolveRuntimeState(values?.[binding.stateId]) : undefined;
  if (binding.stateId && (!source || source.loading)) {
    return {
      value: undefined,
      empty: false,
      missing: Boolean(binding.missing || source?.missing),
      loading: true,
      readable: true,
      writable: false,
      stateId: binding.stateId,
      binding,
    };
  }

  try {
    return {
      value: evaluateFormula(binding.formula ?? "0", buildFormulaContext(values, binding)),
      empty: false,
      missing: Boolean(binding.missing || source?.missing),
      loading: false,
      readable: true,
      writable: false,
      ...(binding.stateId ? { stateId: binding.stateId } : {}),
      binding,
    };
  } catch (error) {
    return {
      value: undefined,
      empty: false,
      missing: Boolean(binding.missing || source?.missing),
      loading: false,
      error: error instanceof Error ? error.message : String(error),
      readable: true,
      writable: false,
      ...(binding.stateId ? { stateId: binding.stateId } : {}),
      binding,
    };
  }
}

function buildFormulaContext(
  values: RuntimeStateValues | undefined,
  binding: Binding,
): Record<string, StatePrimitive | undefined> {
  const context: Record<string, StatePrimitive | undefined> = {};
  Object.entries(values ?? {}).forEach(([stateId, input]) => {
    context[stateId] = readPrimitiveState(input);
  });
  if (binding.stateId) {
    context.value = readPrimitiveState(values?.[binding.stateId]);
  }
  return context;
}

export function resolveRuntimeState(input: RuntimeStateInput): RuntimeResolvedState {
  if (input === undefined) {
    return { value: undefined, missing: false, loading: true };
  }

  if (isSnapshot(input)) {
    return {
      value: input.value,
      missing: input.missing,
      loading: false,
    };
  }

  if (isResolvedState(input)) {
    return input;
  }

  return { value: input, missing: false, loading: false };
}

export function readPrimitiveState(input: RuntimeStateInput): StatePrimitive | undefined {
  return resolveRuntimeState(input).value;
}

export function formatRuntimeValue(
  value: StatePrimitive | undefined,
  options: { unit?: string | undefined; decimals?: number | undefined; fallback?: string } = {},
): string {
  if (value === undefined || value === null || value === "") {
    return options.fallback ?? "--";
  }

  if (typeof value === "number") {
    const decimals = options.decimals ?? (Math.abs(value) >= 100 ? 0 : 1);
    return `${value.toFixed(decimals)}${options.unit ? ` ${options.unit}` : ""}`;
  }

  return `${String(value)}${options.unit ? ` ${options.unit}` : ""}`;
}

function isSnapshot(input: RuntimeStateInput): input is StateSnapshot {
  return (
    typeof input === "object" &&
    input !== null &&
    "id" in input &&
    "value" in input &&
    "missing" in input
  );
}

function isResolvedState(input: RuntimeStateInput): input is RuntimeResolvedState {
  return (
    typeof input === "object" &&
    input !== null &&
    "value" in input &&
    "missing" in input &&
    "loading" in input
  );
}

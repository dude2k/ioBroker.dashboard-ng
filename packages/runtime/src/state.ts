import type { Binding, StatePrimitive, StateSnapshot } from "@dashboard-ng/shared";
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

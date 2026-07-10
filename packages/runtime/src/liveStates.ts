import type {
  ActionStep,
  DashboardProject,
  StatePrimitive,
  StateSnapshot,
} from "@dashboard-ng/shared";
import { appendDiagnostic } from "./diagnostics";
import { resolveIoBrokerSocket } from "./iobrokerSocket";

export interface LiveStateSubscription {
  close(): void;
}

export interface LiveStateSubscriptionOptions {
  traceId?: string;
  batchMs?: number;
  onConnectionChange?(connected: boolean): void;
}

export function collectPageStateIds(project: DashboardProject, pageId: string): string[] {
  const componentIds = new Set(
    project.components
      .filter((component) => component.pageId === pageId)
      .map((component) => component.componentId),
  );
  const stateIds = new Set<string>();

  project.bindings.forEach((binding) => {
    if (componentIds.has(binding.componentId) && binding.stateId) {
      stateIds.add(binding.stateId);
    }
  });
  project.actions.forEach((action) => {
    if (!componentIds.has(action.componentId)) {
      return;
    }
    if (action.condition?.stateId) {
      stateIds.add(action.condition.stateId);
    }
    [...action.steps, ...(action.elseSteps ?? [])].forEach((step) =>
      addActionState(step, stateIds),
    );
  });

  return [...stateIds].sort();
}

export async function subscribeIoBrokerStates(
  stateIds: string[],
  onBatch: (snapshots: StateSnapshot[]) => void,
  options: LiveStateSubscriptionOptions = {},
): Promise<LiveStateSubscription | undefined> {
  const ids = [...new Set(stateIds.filter(Boolean))].sort();
  const idSet = new Set(ids);
  if (!ids.length) {
    return { close() {} };
  }

  const traceId = options.traceId ?? "live-states";
  const socket = await resolveIoBrokerSocket(traceId);
  if (!socket?.subscribeState || !socket.unsubscribeState) {
    appendDiagnostic("warn", `[${traceId}] live state subscription unavailable`, {
      states: ids.length,
    });
    return undefined;
  }

  let closed = false;
  let batchTimer: number | undefined;
  const pending = new Map<string, StateSnapshot>();
  const flush = () => {
    batchTimer = undefined;
    if (!closed && pending.size) {
      const snapshots = [...pending.values()];
      pending.clear();
      onBatch(snapshots);
    }
  };
  const onStateChange = (id: string, state: IoBrokerStateValue | null | undefined) => {
    if (closed || !idSet.has(id)) {
      return;
    }
    pending.set(id, toSnapshot(id, state));
    batchTimer ??= window.setTimeout(flush, options.batchMs ?? 40);
  };
  const onConnectionChange = (connected: boolean) => {
    options.onConnectionChange?.(connected);
  };

  try {
    socket.registerConnectionHandler?.(onConnectionChange);
    await socket.subscribeState(ids, onStateChange);
    appendDiagnostic("info", `[${traceId}] live state subscription active`, {
      states: ids.length,
    });
  } catch (error) {
    socket.unregisterConnectionHandler?.(onConnectionChange);
    appendDiagnostic("warn", `[${traceId}] live state subscription failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }

  return {
    close() {
      if (closed) {
        return;
      }
      closed = true;
      if (batchTimer !== undefined) {
        window.clearTimeout(batchTimer);
      }
      pending.clear();
      try {
        const result = socket.unsubscribeState?.(ids, onStateChange);
        if (result instanceof Promise) {
          void result.catch((error: unknown) =>
            appendDiagnostic("warn", `[${traceId}] live state unsubscribe failed`, {
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      } catch (error) {
        appendDiagnostic("warn", `[${traceId}] live state unsubscribe failed`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      socket.unregisterConnectionHandler?.(onConnectionChange);
      appendDiagnostic("info", `[${traceId}] live state subscription closed`, {
        states: ids.length,
      });
    },
  };
}

interface IoBrokerStateValue {
  val: StatePrimitive;
  ack?: boolean;
  q?: number;
  ts?: number;
  lc?: number;
}

function toSnapshot(id: string, state: IoBrokerStateValue | null | undefined): StateSnapshot {
  if (!state) {
    return { id, value: null, missing: true };
  }
  const snapshot: StateSnapshot = { id, value: state.val, missing: false };
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

function addActionState(step: ActionStep, stateIds: Set<string>): void {
  if ("stateId" in step && step.stateId) {
    stateIds.add(step.stateId);
  }
}

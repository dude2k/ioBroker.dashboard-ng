import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultDashboard } from "@dashboard-ng/shared";
import {
  collectPageStateIds,
  subscribeIoBrokerStates,
  type IoBrokerSocketLike,
} from "@dashboard-ng/runtime";

describe("live state runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("collects only states used by the active page", () => {
    const project = createDefaultDashboard({ now: "2026-07-10T00:00:00.000Z" });
    project.actions[0]!.condition = {
      kind: "stateEquals",
      stateId: "alias.0.living.enabled",
      value: true,
    };
    project.actions[0]!.elseSteps = [
      { kind: "setState", stateId: "alias.0.living.fallback", value: false },
    ];
    project.pages.push({
      pageId: "page-other",
      name: "Other",
      order: 1,
      componentIds: ["cmp-other"],
      settings: {},
    });
    project.components.push({
      ...project.components[0]!,
      componentId: "cmp-other",
      pageId: "page-other",
      bindingIds: ["bind-other"],
      actionIds: [],
    });
    project.bindings.push({
      bindingId: "bind-other",
      componentId: "cmp-other",
      target: "value",
      kind: "state",
      mode: "read",
      stateId: "alias.0.other.value",
      missing: false,
    });

    expect(collectPageStateIds(project, "page-home")).toEqual([
      "alias.0.living.enabled",
      "alias.0.living.fallback",
      "alias.0.living.light",
      "alias.0.living.temperature",
      "alias.0.scene.evening",
    ]);
    expect(collectPageStateIds(project, "page-home")).not.toContain("alias.0.other.value");
  });

  it("batches updates, avoids duplicate subscriptions and cleans up", async () => {
    vi.useFakeTimers();
    let stateHandler:
      ((id: string, state: { val: number; ack?: boolean } | null | undefined) => void) | undefined;
    let connectionHandler: ((connected: boolean) => void) | undefined;
    const socket: IoBrokerSocketLike = {
      subscribeState: vi.fn((_, callback) => {
        stateHandler = callback;
        return Promise.resolve();
      }),
      unsubscribeState: vi.fn(),
      registerConnectionHandler: vi.fn((callback) => {
        connectionHandler = callback;
      }),
      unregisterConnectionHandler: vi.fn(),
    };
    stubSocketWindow(socket);
    const batches = vi.fn();
    const connectionChanges = vi.fn();

    const subscription = await subscribeIoBrokerStates(["state.b", "state.a", "state.a"], batches, {
      batchMs: 25,
      onConnectionChange: connectionChanges,
    });
    stateHandler?.("state.a", { val: 1 });
    stateHandler?.("state.a", { val: 2, ack: true });
    stateHandler?.("state.b", { val: 3 });
    await vi.advanceTimersByTimeAsync(25);

    expect(socket.subscribeState).toHaveBeenCalledWith(
      ["state.a", "state.b"],
      expect.any(Function),
    );
    expect(batches).toHaveBeenCalledWith([
      { id: "state.a", value: 2, missing: false, ack: true },
      { id: "state.b", value: 3, missing: false },
    ]);
    connectionHandler?.(false);
    expect(connectionChanges).toHaveBeenCalledWith(false);

    subscription?.close();
    expect(socket.unsubscribeState).toHaveBeenCalledWith(
      ["state.a", "state.b"],
      expect.any(Function),
    );
    expect(socket.unregisterConnectionHandler).toHaveBeenCalledWith(connectionHandler);
  });
});

function stubSocketWindow(socket: IoBrokerSocketLike): void {
  const fakeWindow = {
    location: {
      href: "http://example.local/adapter/dashboard-ng/index_m.html?0",
      search: "?0",
    },
    socket,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  } as unknown as Window & { socket: IoBrokerSocketLike };
  fakeWindow.parent = fakeWindow;
  fakeWindow.top = fakeWindow;
  vi.stubGlobal("window", fakeWindow);
}

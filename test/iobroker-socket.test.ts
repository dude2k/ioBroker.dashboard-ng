import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseIoBrokerAdapterInstance,
  sendIoBrokerCommand,
  type IoBrokerSocketLike,
} from "../packages/runtime/src/iobrokerSocket";

describe("ioBroker socket helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads explicit instance query parameters", () => {
    expect(
      parseIoBrokerAdapterInstance(
        "http://example.local/adapter/dashboard-ng/index_m.html?instance=2",
        "?instance=2",
        "dashboard-ng",
      ),
    ).toBe(2);
  });

  it("reads ioBroker admin shorthand instance queries", () => {
    expect(
      parseIoBrokerAdapterInstance(
        "http://example.local/adapter/dashboard-ng/index_m.html?0",
        "?0",
        "dashboard-ng",
      ),
    ).toBe(0);
  });

  it("reads adapter instance names from URLs", () => {
    expect(
      parseIoBrokerAdapterInstance(
        "http://example.local/#tab-adapters/dashboard-ng.3",
        "",
        "dashboard-ng",
      ),
    ).toBe(3);
  });

  it("waits for callback responses when socket.sendTo returns an empty promise", async () => {
    const socket: IoBrokerSocketLike = {
      sendTo: (_instance, _command, _payload, callback) => {
        setTimeout(() => callback?.({ ok: true, data: "saved" }), 0);
        return Promise.resolve(undefined);
      },
      emit: vi.fn(),
    };
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

    await expect(sendIoBrokerCommand<string>("dashboard-ng", "dashboard.save", {})).resolves.toBe(
      "saved",
    );
  });
});

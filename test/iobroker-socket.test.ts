import { afterEach, describe, expect, it, vi } from "vitest";
import { readIoBrokerFile, writeIoBrokerFile } from "../packages/runtime/src/iobrokerFiles";
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

  it("reads adapter files through the ioBroker socket file API", async () => {
    const socket: IoBrokerSocketLike = {
      readFile: (_adapterName, _path, callback) => {
        callback?.(null, '{"projectId":"default"}');
      },
      emit: vi.fn(),
    };
    stubSocketWindow(socket);

    await expect(readIoBrokerFile("dashboard-ng", "dashboards/default.json")).resolves.toBe(
      '{"projectId":"default"}',
    );
  });

  it("reads adapter files through the promise-based socket-client API", async () => {
    const socket: IoBrokerSocketLike = {
      readFile: (adapterName, path, base64OrCallback) =>
        Promise.resolve({
          file: JSON.stringify({ adapterName, path, base64: base64OrCallback }),
          mimeType: "application/json",
        }),
      emit: vi.fn(),
    };
    stubSocketWindow(socket);

    await expect(readIoBrokerFile("dashboard-ng", "dashboards/default.json")).resolves.toBe(
      '{"adapterName":"dashboard-ng","path":"dashboards/default.json","base64":false}',
    );
  });

  it("writes adapter files through the ioBroker socket file API", async () => {
    const writes: Array<{ adapterName: string | null; path: string; data: string }> = [];
    const socket: IoBrokerSocketLike = {
      writeFile: (adapterName, path, data, callback) => {
        writes.push({ adapterName, path, data });
        callback?.(null);
      },
      emit: vi.fn(),
    };
    stubSocketWindow(socket);

    await writeIoBrokerFile("dashboard-ng", "dashboards/default.json", '{"ok":true}');

    expect(writes).toEqual([
      {
        adapterName: "dashboard-ng",
        path: "dashboards/default.json",
        data: '{"ok":true}',
      },
    ]);
  });

  it("writes adapter files through the promise-based socket-client API", async () => {
    const writes: Array<{ adapterName: string; path: string; data: ArrayBuffer | string }> = [];
    const socket: IoBrokerSocketLike = {
      writeFile64: (adapterName, path, data) => {
        writes.push({ adapterName, path, data });
        return Promise.resolve();
      },
      emit: vi.fn(),
    };
    stubSocketWindow(socket);

    await writeIoBrokerFile("dashboard-ng", "dashboards/default.json", '{"ok":true}');

    expect(writes).toEqual([
      {
        adapterName: "dashboard-ng",
        path: "dashboards/default.json",
        data: '{"ok":true}',
      },
    ]);
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

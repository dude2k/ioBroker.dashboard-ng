import { describe, expect, it } from "vitest";
import { parseIoBrokerAdapterInstance } from "../packages/runtime/src/iobrokerSocket";

describe("ioBroker socket helpers", () => {
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
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const ioPackageJson = JSON.parse(
  readFileSync(new URL("../io-package.json", import.meta.url), "utf8"),
);
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

describe("adapter package metadata", () => {
  it("keeps package and adapter versions aligned", () => {
    expect(packageJson.version).toBe("0.2.0");
    expect(ioPackageJson.common.version).toBe(packageJson.version);
    expect(readme).toContain("Current adapter version: `0.2.0`");
  });

  it("keeps adapter naming stable for GitHub installs", () => {
    expect(packageJson.name).toBe("iobroker.dashboard-ng");
    expect(ioPackageJson.common.name).toBe("dashboard-ng");
    expect(packageJson.repository.url).toBe("https://github.com/dude2k/ioBroker.dashboard-ng.git");
  });

  it("uses current ioBroker license and tier metadata", () => {
    expect(ioPackageJson.common.licenseInformation).toEqual({
      type: "free",
      license: "MIT",
    });
    expect(ioPackageJson.common.tier).toBe(3);
    expect(ioPackageJson.common.license).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const ioPackageJson = JSON.parse(
  readFileSync(new URL("../io-package.json", import.meta.url), "utf8"),
);
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const adminIndexRedirect = readFileSync(
  new URL("../packages/editor/public/index.html", import.meta.url),
  "utf8",
);

describe("adapter package metadata", () => {
  it("keeps package and adapter versions aligned", () => {
    expect(packageJson.version).toBe("0.3.4");
    expect(ioPackageJson.common.version).toBe(packageJson.version);
    expect(readme).toContain("Current adapter version: `0.3.4`");
    expect(readme).toContain("Current GitHub tag: `v0.3.4`");
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

  it("publishes viewer files through the ioBroker web adapter namespace", () => {
    expect(ioPackageJson.common.www).toBeUndefined();
    expect(ioPackageJson.common.localLinks._default).toContain("/dashboard-ng/index.html");
    expect(ioPackageJson.common.localLinks._default).not.toContain("/adapter/dashboard-ng/");
    expect(packageJson.files).toContain("www");
  });

  it("keeps old adapter namespace viewer bookmarks from returning a 404", () => {
    expect(adminIndexRedirect).toContain("../../dashboard-ng/index.html");
    expect(adminIndexRedirect).not.toContain("index_m.html");
  });
});

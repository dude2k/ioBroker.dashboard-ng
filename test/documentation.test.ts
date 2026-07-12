import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const readme = read("../README.md");
const userGuide = read("../docs/USER_GUIDE.md");
const germanGuide = read("../docs/BENUTZERHANDBUCH.md");

describe("user documentation", () => {
  it("links both user guides from the README", () => {
    expect(readme).toMatch(/docs\/USER_GUIDE\.md/);
    expect(readme).toMatch(/docs\/BENUTZERHANDBUCH\.md/);
  });

  it("covers the primary workflows in English and German", () => {
    for (const heading of ["Installation", "Editor", "Viewer", "Formulas", "Templates", "Kiosk"]) {
      expect(userGuide).toMatch(new RegExp(`## .*${heading}`, "i"));
    }

    for (const heading of ["Installation", "Editor", "Viewer", "Formeln", "Vorlagen", "Kiosk"]) {
      expect(germanGuide).toMatch(new RegExp(`## .*${heading}`, "i"));
    }
  });
});

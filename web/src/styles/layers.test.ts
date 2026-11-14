import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { CSS_LAYER_ORDER } from "./layers";

describe("CSS_LAYER_ORDER", () => {
  it("matches the order globals.css declares", () => {
    const globals = readFileSync(resolve(__dirname, "globals.css"), "utf8");
    expect(globals.split("\n")[0]).toBe(CSS_LAYER_ORDER);
  });
});

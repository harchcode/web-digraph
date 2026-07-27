import { describe, it, expect } from "vitest";
import { createGraphRenderer } from "./index.ts";

describe("createGraphRenderer", () => {
  it("should create a renderer instance", () => {
    const renderer = createGraphRenderer();
    expect(renderer).toBeDefined();
    expect(renderer.nodes).toBeDefined();
    expect(renderer.edges).toBeDefined();
  });
});

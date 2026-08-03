import { describe, it, expect, beforeEach } from "vitest";
import { createQuadTree } from "../quad-tree.js";

describe("createQuadTree", () => {
  let tree: ReturnType<typeof createQuadTree>;
  const bboxes = new Float32Array(1000 * 4); // 1000 items max for test

  const setBBox = (
    id: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) => {
    bboxes[id * 4 + 0] = minX;
    bboxes[id * 4 + 1] = minY;
    bboxes[id * 4 + 2] = maxX;
    bboxes[id * 4 + 3] = maxY;
  };

  const getBBox = (id: number, out: Float32Array) => {
    out[0] = bboxes[id * 4 + 0];
    out[1] = bboxes[id * 4 + 1];
    out[2] = bboxes[id * 4 + 2];
    out[3] = bboxes[id * 4 + 3];
  };

  beforeEach(() => {
    // maxItems: 1000, getBBox, initialBounds: 100, maxDepth: 16, capacity: 5
    tree = createQuadTree(1000, getBBox, 100, 16, 5);
  });

  it("should be able to insert and search a single node", () => {
    setBBox(0, -10, -10, 10, 10);
    tree.insert(0);

    const res = tree.search(-20, -20, 20, 20);
    expect(res.length).toBe(1);
    expect(res[0]).toBe(0);
  });

  it("should not find nodes outside the search area", () => {
    setBBox(0, -10, -10, 10, 10);
    tree.insert(0);

    const res = tree.search(20, 20, 50, 50);
    expect(res.length).toBe(0);
  });

  it("should correctly remove a node", () => {
    setBBox(0, -10, -10, 10, 10);
    tree.insert(0);
    tree.remove(0);

    const res = tree.search(-20, -20, 20, 20);
    expect(res.length).toBe(0);
  });

  it("should correctly update a node position", () => {
    setBBox(0, -10, -10, 10, 10);
    tree.insert(0);

    // Search old area
    expect(tree.search(-20, -20, 20, 20).length).toBe(1);

    // Move to new area
    setBBox(0, 50, 50, 70, 70);
    tree.update(0);

    // Old area should be empty
    expect(tree.search(-20, -20, 20, 20).length).toBe(0);
    // New area should contain it
    expect(tree.search(40, 40, 80, 80).length).toBe(1);
  });

  it("should auto-expand when inserting out-of-bounds nodes", () => {
    // Initial bounds are [-100, -100, 100, 100]

    // Insert node well within bounds
    setBBox(0, 0, 0, 10, 10);
    tree.insert(0);

    // Insert node way outside bounds (e.g. 500)
    setBBox(1, 490, 490, 510, 510);
    tree.insert(1); // This should trigger expansion

    const res0 = tree.search(-50, -50, 50, 50);
    expect(res0.length).toBe(1);
    expect(res0[0]).toBe(0);

    const res1 = tree.search(450, 450, 550, 550);
    expect(res1.length).toBe(1);
    expect(res1[0]).toBe(1);

    const all = tree.search(-1000, -1000, 1000, 1000);
    expect(all.length).toBe(2);
    expect(Array.from(all).sort()).toEqual([0, 1]);
  });

  it("should properly split cells when exceeding capacity", () => {
    // Capacity is 5. Insert 6 items tightly packed in Quadrant 1 (top-right).
    // Root bounds: [-100, -100, 100, 100]
    for (let i = 0; i < 6; i++) {
      setBBox(i, 10 + i, 10 + i, 12 + i, 12 + i);
      tree.insert(i);
    }

    // It should find all 6
    const res = tree.search(0, 0, 50, 50);
    expect(res.length).toBe(6);
  });

  it("should handle many nodes exactly at the same coordinate without infinite recursion", () => {
    // Capacity is 5. We insert 10 nodes EXACTLY at [0, 0]
    // They will straddle the boundaries, but even if they didn't, maxDepth handles it.
    for (let i = 0; i < 10; i++) {
      setBBox(i, 0, 0, 0, 0); // Exact point
      tree.insert(i);
    }

    const res = tree.search(-10, -10, 10, 10);
    expect(res.length).toBe(10);
  });

  it("should clear the tree properly", () => {
    setBBox(0, 0, 0, 10, 10);
    tree.insert(0);
    tree.clear();

    const res = tree.search(-20, -20, 20, 20);
    expect(res.length).toBe(0);
  });

  it("should support manual resize()", () => {
    setBBox(0, 0, 0, 10, 10);
    tree.insert(0);

    // Expand to 200 manually
    tree.resizeBounds(200);

    // Should still find the node
    const res = tree.search(-20, -20, 20, 20);
    expect(res.length).toBe(1);
  });

  it("should not break when removing a non-existent or uninserted item", () => {
    setBBox(0, -10, -10, 10, 10);
    // don't insert
    tree.remove(0); // Should safely do nothing
    expect(tree.search(-20, -20, 20, 20).length).toBe(0);
  });
});

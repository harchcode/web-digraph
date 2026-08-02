import { describe, it, expect } from "vitest";
import { createQuadTree } from "./quad-tree";

describe("QuadTree", () => {
  it("should handle empty builds", () => {
    const qt = createQuadTree(100, 10, 2);
    qt.build(new Int32Array(0), (id, out) => {}, 0, 0, 100, 100);
    const result = qt.search(0, 0, 100, 100);
    expect(result.length).toBe(0);
  });

  it("should find a single item", () => {
    const qt = createQuadTree(100, 10, 2);

    qt.build(
      new Int32Array([42]),
      (id, out) => {
        out[0] = 10;
        out[1] = 10;
        out[2] = 20;
        out[3] = 20;
      },
      0,
      0,
      100,
      100
    );

    // Exact overlap
    let result = qt.search(5, 5, 25, 25);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(42);

    // Completely outside the entire graph (root bounds are 0 to 100)
    result = qt.search(200, 200, 300, 300);
    expect(result.length).toBe(0);
  });

  it("should successfully partition into 4 quadrants", () => {
    // 4 items, one in each quadrant
    const qt = createQuadTree(100, 10, 1); // Capacity 1 forces split

    const bboxes: Record<number, number[]> = {
      1: [0, 0, 10, 10], // TL
      2: [90, 0, 100, 10], // TR
      3: [0, 90, 10, 100], // BL
      4: [90, 90, 100, 100] // BR
    };

    qt.build(
      new Int32Array([1, 2, 3, 4]),
      (id, out) => {
        out[0] = bboxes[id][0];
        out[1] = bboxes[id][1];
        out[2] = bboxes[id][2];
        out[3] = bboxes[id][3];
      },
      0,
      0,
      100,
      100
    );

    // Search Top Left
    let res = qt.search(-10, -10, 20, 20);
    expect(res.length).toBe(1);
    expect(res[0]).toBe(1);

    // Search Bottom Right
    res = qt.search(80, 80, 110, 110);
    expect(res.length).toBe(1);
    expect(res[0]).toBe(4);

    // Search just inside the Top-Left quadrant's empty space (40, 40 to 45, 45).
    // Because it's a coarse tree, it returns everything in the Top-Left cell (item 1).
    res = qt.search(40, 40, 45, 45);
    expect(res.length).toBe(1);
    expect(res[0]).toBe(1);
  });

  it("should handle straddling items", () => {
    const qt = createQuadTree(100, 10, 1);

    // A giant item that covers the whole screen and straddles the center
    const bboxes: Record<number, number[]> = {
      1: [0, 0, 10, 10], // TL
      2: [90, 90, 100, 100], // BR
      99: [40, 40, 60, 60] // Straddles the center (50, 50)
    };

    qt.build(
      new Int32Array([1, 2, 99]),
      (id, out) => {
        out[0] = bboxes[id][0];
        out[1] = bboxes[id][1];
        out[2] = bboxes[id][2];
        out[3] = bboxes[id][3];
      },
      0,
      0,
      100,
      100
    );

    // Searching Top Left should return item 1 AND item 99 (since 99 straddles the root node)
    const resTL = qt.search(0, 0, 10, 10);
    expect(Array.from(resTL).sort()).toEqual([1, 99]);

    // Searching Bottom Right should return 2 AND 99
    const resBR = qt.search(90, 90, 100, 100);
    expect(Array.from(resBR).sort()).toEqual([2, 99]);
  });

  it("should handle large scale brute-force testing (No False Negatives)", () => {
    const NUM_ITEMS = 5000;
    const qt = createQuadTree(NUM_ITEMS, 10, 10);

    const items = new Int32Array(NUM_ITEMS);
    const bboxes = new Float32Array(NUM_ITEMS * 4);

    // Generate random boxes in a 1000x1000 grid
    for (let i = 0; i < NUM_ITEMS; i++) {
      items[i] = i;

      const w = Math.random() * 50 + 5;
      const h = Math.random() * 50 + 5;
      const x = Math.random() * 950;
      const y = Math.random() * 950;

      bboxes[i * 4 + 0] = x;
      bboxes[i * 4 + 1] = y;
      bboxes[i * 4 + 2] = x + w;
      bboxes[i * 4 + 3] = y + h;
    }

    qt.build(
      items,
      (id, out) => {
        out[0] = bboxes[id * 4 + 0];
        out[1] = bboxes[id * 4 + 1];
        out[2] = bboxes[id * 4 + 2];
        out[3] = bboxes[id * 4 + 3];
      },
      0,
      0,
      1000,
      1000
    );

    // Pick 10 random viewports and verify against a brute force loop
    for (let testIdx = 0; testIdx < 10; testIdx++) {
      const vX = Math.random() * 800;
      const vY = Math.random() * 800;
      const vW = Math.random() * 200 + 100;
      const vH = Math.random() * 200 + 100;
      const vMaxX = vX + vW;
      const vMaxY = vY + vH;

      const qtResult = qt.search(vX, vY, vMaxX, vMaxY);
      const qtResultSet = new Set(qtResult);

      // Brute force verify
      for (let i = 0; i < NUM_ITEMS; i++) {
        const bMinX = bboxes[i * 4 + 0];
        const bMinY = bboxes[i * 4 + 1];
        const bMaxX = bboxes[i * 4 + 2];
        const bMaxY = bboxes[i * 4 + 3];

        // Does it actually overlap the viewport?
        const overlaps = !(
          bMaxX < vX ||
          bMinX > vMaxX ||
          bMaxY < vY ||
          bMinY > vMaxY
        );

        if (overlaps) {
          // A coarse AABB QuadTree MUST return all overlapping items (no false negatives)
          expect(qtResultSet.has(i)).toBe(true);
        }
      }
    }
  });
});

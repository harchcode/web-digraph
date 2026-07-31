import { describe, it, expect } from "vitest";
import { createGraphRenderer } from "./index";

describe("createGraphRenderer - DOD Mutations", () => {
  it("should add nodes properly", () => {
    const renderer = createGraphRenderer();
    const id1 = renderer.addNode(10, 20, 1);
    const id2 = renderer.addNode(30, 40, 2);

    expect(id1).toBe(0);
    expect(id2).toBe(1);
    expect(renderer.nodeCount).toBe(2);

    // Check Float32 values (x, y)
    const floats = new Float32Array(renderer.nodeBuffer);
    expect(floats[id1 * 5 + 0]).toBe(10);
    expect(floats[id1 * 5 + 1]).toBe(20);
    expect(floats[id2 * 5 + 0]).toBe(30);
    expect(floats[id2 * 5 + 1]).toBe(40);

    // Check Int32 values (config, incoming, outgoing)
    const ints = new Int32Array(renderer.nodeBuffer);
    expect(ints[id1 * 5 + 2]).toBe(1);
    expect(ints[id2 * 5 + 2]).toBe(2);
    expect(ints[id1 * 5 + 3]).toBe(-1);
    expect(ints[id1 * 5 + 4]).toBe(-1);
  });

  it("should add edges and maintain intrusive linked list", () => {
    const renderer = createGraphRenderer();
    const n0 = renderer.addNode(0, 0, 1);
    const n1 = renderer.addNode(10, 10, 1);
    const n2 = renderer.addNode(20, 20, 1);

    const e0 = renderer.addEdge(n0, n1, 5); // 0 -> 1
    const e1 = renderer.addEdge(n0, n2, 6); // 0 -> 2
    const e2 = renderer.addEdge(n2, n1, 7); // 2 -> 1

    const nodeInts = new Int32Array(renderer.nodeBuffer);
    const edgeInts = new Int32Array(renderer.edgeBuffer);

    // n0 outgoing should be e1 (since it prepends), and e1.next = e0, e0.next = -1
    const outHead = nodeInts[n0 * 5 + 4];
    expect(outHead).toBe(e1);
    expect(edgeInts[e1 * 7 + 6]).toBe(e0);
    expect(edgeInts[e0 * 7 + 6]).toBe(-1);

    // n1 incoming should be e2 (prepended), e2.next = e0, e0.next = -1
    const inHead = nodeInts[n1 * 5 + 3];
    expect(inHead).toBe(e2);
    expect(edgeInts[e2 * 7 + 5]).toBe(e0);
    expect(edgeInts[e0 * 7 + 5]).toBe(-1);
  });

  it("should remove edges with Swap-and-Pop and fix pointers", () => {
    const renderer = createGraphRenderer();
    const n0 = renderer.addNode(0, 0, 1);
    const n1 = renderer.addNode(10, 10, 1);
    const n2 = renderer.addNode(20, 20, 1);

    const e0 = renderer.addEdge(n0, n1, 5); // 0 -> 1
    const e1 = renderer.addEdge(n0, n2, 6); // 0 -> 2
    const e2 = renderer.addEdge(n2, n1, 7); // 2 -> 1
    const e3 = renderer.addEdge(n1, n2, 8); // 1 -> 2

    // We will remove e1.
    // This will swap e3 (the last edge) into e1's slot.
    renderer.removeEdge(e1);

    expect(renderer.edgeCount).toBe(3);

    const nodeInts = new Int32Array(renderer.nodeBuffer);
    const edgeInts = new Int32Array(renderer.edgeBuffer);

    // e1 slot should now contain what was e3 (1 -> 2, shape 8)
    expect(edgeInts[e1 * 7 + 0]).toBe(1); // source n1
    expect(edgeInts[e1 * 7 + 1]).toBe(2); // target n2
    expect(edgeInts[e1 * 7 + 2]).toBe(8); // shapeId 8

    // n0 outgoing should just be e0 now (since e1 was deleted)
    expect(nodeInts[n0 * 5 + 4]).toBe(e0);
    expect(edgeInts[e0 * 7 + 6]).toBe(-1);

    // n1 outgoing should be e1 (which holds e3's data)
    expect(nodeInts[n1 * 5 + 4]).toBe(e1);
  });

  it("should remove nodes, cascade delete edges, and fix pointers", () => {
    const renderer = createGraphRenderer();
    const n0 = renderer.addNode(0, 0, 0);
    const n1 = renderer.addNode(10, 10, 1);
    const n2 = renderer.addNode(20, 20, 2);
    const n3 = renderer.addNode(30, 30, 3);

    renderer.addEdge(n0, n1, 1); // e0
    renderer.addEdge(n1, n2, 2); // e1
    renderer.addEdge(n2, n3, 3); // e2
    renderer.addEdge(n3, n0, 4); // e3

    expect(renderer.nodeCount).toBe(4);
    expect(renderer.edgeCount).toBe(4);

    // Delete n1.
    // This should cascade delete e0 (n0->n1) and e1 (n1->n2).
    // Node n3 (last node) will swap into n1's slot.
    // This means edges connected to n3 (e2 and e3) must have their pointers updated to point to n1's slot!
    renderer.removeNode(n1);

    expect(renderer.nodeCount).toBe(3);
    expect(renderer.edgeCount).toBe(2); // Only e2 and e3 remain!

    const nodeInts = new Int32Array(renderer.nodeBuffer);
    const edgeInts = new Int32Array(renderer.edgeBuffer);

    // n1 slot should now contain what was n3 (shapeId 3)
    expect(nodeInts[n1 * 5 + 2]).toBe(3);

    // The remaining edges were e2 (n2->n3) and e3 (n3->n0).
    // Because of Swap-and-Pop on the edge array, e2 and e3 might have been moved.
    // We will just iterate the remaining 2 edges and check their new connections.
    let foundN2ToN3 = false;
    let foundN3ToN0 = false;

    for (let i = 0; i < renderer.edgeCount; i++) {
      const source = edgeInts[i * 7 + 0];
      const target = edgeInts[i * 7 + 1];

      // Remember, n3 was swapped into n1's slot. So the new ID for n3 is n1!
      if (source === n2 && target === n1) foundN2ToN3 = true;
      if (source === n1 && target === n0) foundN3ToN0 = true;
    }

    expect(foundN2ToN3).toBe(true);
    expect(foundN3ToN0).toBe(true);
  });
});

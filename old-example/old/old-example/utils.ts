import { GENode, GEEdge } from "../src/types";

export function getRandomIntInclusive(minF: number, maxF: number): number {
  const min = Math.ceil(minF);
  const max = Math.floor(maxF);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

export function randomize(
  nodeCount = 1000,
  cols = 40
): {
  nodes: GENode[];
  edges: GEEdge[];
  lastId: number;
} {
  const nodes = [];
  const edges = [];
  let lastId = 0;

  for (let i = 0; i < nodeCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const tmp = getRandomIntInclusive(0, 3);
    const nodeType =
      tmp === 0
        ? "empty"
        : tmp === 1
        ? "decision"
        : tmp === 2
        ? "unknown"
        : "complex";

    const tmp2 = getRandomIntInclusive(0, 2);
    const edgeType = tmp2 === 0 ? "normal" : tmp2 === 1 ? "round" : "double";

    lastId++;
    const currNode: GENode = {
      id: lastId,
      x: col * 320,
      y: row * 320,
      type: nodeType,
      text: `Node ID: ${lastId}`
    };

    nodes.push(currNode);

    if (i > 0) {
      const prevNode = nodes[i - 1];

      lastId++;
      edges.push({
        id: lastId,
        sourceNode: prevNode,
        targetNode: currNode,
        type: edgeType,
        text: lastId.toString()
      });
    }
  }

  return {
    nodes,
    edges,
    lastId
  };
}

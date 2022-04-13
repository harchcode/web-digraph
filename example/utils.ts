import { GraphEdge, GraphNode } from "../src";
import {
  normalEdgeShape,
  normalNodeShape,
  randomNodeShape,
  rectNodeShape
} from "./node-types";

export function getRandomIntInclusive(minF: number, maxF: number): number {
  const min = Math.ceil(minF);
  const max = Math.floor(maxF);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

export function randomize(
  nodeCount = 1000,
  cols = 40
): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  lastId: number;
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let lastId = 0;

  for (let i = 0; i < nodeCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const tmp = getRandomIntInclusive(0, 2);
    const nodeShape =
      tmp === 0 ? normalNodeShape : tmp === 1 ? rectNodeShape : randomNodeShape;

    // const tmp2 = getRandomIntInclusive(0, 2);
    // const edgeType = tmp2 === 0 ? "normal" : tmp2 === 1 ? "round" : "double";
    const edgeShape = normalEdgeShape;

    lastId++;
    const currNode: GraphNode = {
      // id: lastId,
      x: col * 320,
      y: row * 320,
      shape: nodeShape
      // type: nodeType,
      // text: `Node ID: ${lastId}`
    };

    nodes.push(currNode);

    if (i > 0) {
      const prevNode = nodes[i - 1];

      lastId++;
      edges.push({
        source: prevNode,
        target: currNode,
        shape: edgeShape
      });
    }
  }

  return {
    nodes,
    edges,
    lastId
  };
}

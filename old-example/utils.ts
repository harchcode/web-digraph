import { GraphEdge, GraphNode } from "../src";
import {
  normalEdgeShape,
  normalNodeShape,
  randomNodeShape,
  rectNodeShape
} from "./node-types";
import { ExampleEdge, ExampleNode } from "./types";

export function getRandomIntInclusive(minF: number, maxF: number): number {
  const min = Math.ceil(minF);
  const max = Math.floor(maxF);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

export function randomize(
  nodeCount = 1000,
  cols = 40
): {
  nodes: ExampleNode[];
  edges: ExampleEdge[];
  lastNodeId: number;
  lastEdgeId: number;
} {
  const nodes: ExampleNode[] = [];
  const edges: ExampleEdge[] = [];
  let lastNodeId = 0;
  let lastEdgeId = 0;

  for (let i = 0; i < nodeCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const tmp = getRandomIntInclusive(0, 2);
    const nodeShape =
      tmp === 0 ? normalNodeShape : tmp === 1 ? rectNodeShape : randomNodeShape;

    // const tmp2 = getRandomIntInclusive(0, 2);
    // const edgeType = tmp2 === 0 ? "normal" : tmp2 === 1 ? "round" : "double";
    const edgeShape = normalEdgeShape;

    lastNodeId++;

    const currNode: ExampleNode = {
      id: lastNodeId,
      x: col * 320,
      y: row * 320,
      shape: nodeShape,
      label: `Node ${lastNodeId}`
    };

    nodes.push(currNode);

    if (i > 0) {
      const prevNode = nodes[i - 1];

      lastEdgeId++;

      edges.push({
        id: lastEdgeId,
        source: prevNode,
        target: currNode,
        shape: edgeShape,
        label: lastEdgeId.toString()
      });
    }
  }

  return {
    nodes,
    edges,
    lastNodeId,
    lastEdgeId
  };
}

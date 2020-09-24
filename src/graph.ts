import { GENode, GEEdge } from "./types";

export class GEGraph {
  nodes: Map<number, GENode>;
  edges: Map<number, GEEdge>;
  lastNodeId: number;
  lastEdgeId: number;

  constructor() {
    this.reset();
  }

  getRandomIntInclusive(minF: number, maxF: number): number {
    const min = Math.ceil(minF);
    const max = Math.floor(maxF);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
  }

  randomize(nodeCount = 1000, cols = 40): void {
    this.reset;

    for (let i = 0; i < nodeCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      this.addNode(
        col * 320,
        row * 480,
        this.getRandomIntInclusive(50, 120),
        `Node ${i + 1}`
      );

      if (i > 0) {
        this.addEdge(
          this.nodes.get(i).id,
          this.nodes.get(i + 1).id,
          this.getRandomIntInclusive(1, 1000).toString()
        );
      }
    }
  }

  reset(): void {
    this.nodes = new Map<number, GENode>();
    this.edges = new Map<number, GEEdge>();
    this.lastNodeId = 0;
    this.lastEdgeId = 0;
  }

  setData(nodes: GENode[], edges: GEEdge[]): void {
    this.reset();

    nodes.forEach(node => {
      this.nodes.set(node.id, node);
      this.lastNodeId = Math.max(this.lastNodeId, node.id);
    });

    edges.forEach(edge => {
      this.edges.set(edge.id, edge);
      this.lastEdgeId = Math.max(this.lastEdgeId, edge.id);
    });
  }

  addNode(x: number, y: number, r: number, text = ""): GENode {
    const nextNodeId = this.lastNodeId + 1;

    const newNode: GENode = {
      id: nextNodeId,
      x,
      y,
      r,
      text,
      sourceOfEdgeIds: new Set(),
      targetOfEdgeIds: new Set()
    };

    this.nodes.set(nextNodeId, newNode);

    this.lastNodeId = nextNodeId;

    return newNode;
  }

  addEdge(sourceNodeId: number, targetNodeId: number, text = ""): GEEdge {
    if (sourceNodeId === targetNodeId) return null;

    // find if there is already an edge connecting the two nodes
    const edge = Array.from(this.edges.values()).find(
      edge =>
        (edge.sourceNodeId === sourceNodeId &&
          edge.targetNodeId === targetNodeId) ||
        (edge.sourceNodeId === targetNodeId &&
          edge.targetNodeId === sourceNodeId)
    );

    // if there is already an edge, delete the edge
    if (edge) {
      this.deleteEdge(edge.id);
    }

    // create a new edge
    const nextEdgeId = this.lastEdgeId + 1;

    const newEdge: GEEdge = {
      id: nextEdgeId,
      text: text,
      sourceNodeId,
      targetNodeId
    };

    this.edges.set(nextEdgeId, newEdge);

    this.lastEdgeId = nextEdgeId;

    this.nodes.get(sourceNodeId).sourceOfEdgeIds.add(nextEdgeId);
    this.nodes.get(targetNodeId).targetOfEdgeIds.add(nextEdgeId);

    return newEdge;
  }

  deleteNode(nodeId: number): void {
    const node = this.nodes.get(nodeId);

    node.sourceOfEdgeIds.forEach(edgeId => {
      this.deleteEdge(edgeId);
    });

    node.targetOfEdgeIds.forEach(edgeId => {
      this.deleteEdge(edgeId);
    });

    this.nodes.delete(nodeId);
  }

  deleteEdge(edgeId: number): void {
    const edge = this.edges.get(edgeId);

    this.nodes.get(edge.sourceNodeId).sourceOfEdgeIds.delete(edgeId);
    this.nodes.get(edge.targetNodeId).targetOfEdgeIds.delete(edgeId);

    this.edges.delete(edgeId);
  }
}

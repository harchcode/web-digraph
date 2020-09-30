import { GENode, GEEdge } from "./types";

export class GEGraph {
  nodes: Map<number, GENode>;
  edges: Map<number, GEEdge>;
  lastNodeId: number;
  lastEdgeId: number;

  constructor() {
    this.reset();
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

  addNode(x: number, y: number, type: string, text = ""): GENode {
    const nextNodeId = this.lastNodeId + 1;

    const newNode: GENode = {
      id: nextNodeId,
      x,
      y,
      text,
      type
    };

    this.nodes.set(nextNodeId, newNode);

    this.lastNodeId = nextNodeId;

    return newNode;
  }

  addEdge(
    sourceNodeId: number,
    targetNodeId: number,
    type: string,
    text = ""
  ): GEEdge {
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
      targetNodeId,
      type
    };

    this.edges.set(nextEdgeId, newEdge);

    this.lastEdgeId = nextEdgeId;

    return newEdge;
  }

  deleteNode(nodeId: number): void {
    this.edges.forEach(edge => {
      if (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId) {
        this.edges.delete(edge.id);
      }
    });

    this.nodes.delete(nodeId);
  }

  deleteEdge(edgeId: number): void {
    this.edges.delete(edgeId);
  }
}

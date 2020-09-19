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

  addNode(x: number, y: number): GENode {
    const nextNodeId = this.lastNodeId + 1;

    const newNode: GENode = {
      id: nextNodeId,
      x,
      y,
      sourceOfEdgeIds: new Set(),
      targetOfEdgeIds: new Set()
    };

    this.nodes.set(nextNodeId, newNode);

    this.lastNodeId = nextNodeId;

    return newNode;
  }

  addEdge(sourceNodeId: number, targetNodeId: number): GEEdge {
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

    const newEdge = {
      id: nextEdgeId,
      priority: 100,
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
    const edge = this.edges[edgeId];

    this.nodes.get(edge.sourceNodeId).sourceOfEdgeIds.delete(edgeId);
    this.nodes.get(edge.targetNodeId).targetOfEdgeIds.delete(edgeId);

    this.edges.delete(edgeId);
  }
}

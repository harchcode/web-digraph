export type GENode = {
  id: number;
  x: number;
  y: number;
  sourceOfEdgeIds: Set<number>;
  targetOfEdgeIds: Set<number>;
};

export type GEEdge = {
  id: number;
  sourceNodeId: number;
  targetNodeId: number;
};

export type GENode = {
  id: number;
  x: number;
  y: number;
  r: number;
  text: string;
  sourceOfEdgeIds: Set<number>;
  targetOfEdgeIds: Set<number>;
};

export type GEEdge = {
  id: number;
  text: string;
  sourceNodeId: number;
  targetNodeId: number;
};

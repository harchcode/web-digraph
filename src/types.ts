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

export type GEViewOptions = {
  nodeRadius: number;
  edgeArrowLength: number;
  edgeArrowRadian: number;
  edgeRectWidth: number;
  edgeRectHeight: number;
  backgroundColor: string;
  backgroundDotColor: string;
  backgroundDotRadius: number;
  backgroundDotGap: number;
  nodeColor: string;
  nodeSelectedColor: string;
  nodeStrokeColor: string;
  nodeTextColor: string;
  nodeSelectedTextColor: string;
  nodeTextStyle: string;
  edgeLineColor: string;
  edgeLineHoverColor: string;
  edgeLineSelectedColor: string;
  edgeRectFillColor: string;
  edgeTextColor: string;
  edgeSelectedTextColor: string;
  edgeTextStyle: string;
  minScale: number;
  maxScale: number;
  cursorGrab: string;
  cursorPointer: string;
  cursorCrosshair: string;
};

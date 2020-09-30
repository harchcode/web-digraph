export type Point = [number, number];

export enum GEShapeName {
  CIRCLE,
  RECTANGLE,
  POLYGON
}

export type GECircleShape = {
  shape: GEShapeName.CIRCLE;
  r: number;
  color?: string;
};

export type GERectangleShape = {
  shape: GEShapeName.RECTANGLE;
  width: number;
  height: number;
  color?: string;
};

export type GEPolygonShape = {
  shape: GEShapeName.POLYGON;
  points: Point[];
  color?: string;
};

export type GEShape = GECircleShape | GERectangleShape | GEPolygonShape;

export type GEShapes = {
  mainShape: GEShape;
  auxShape?: GEShape[];
};

export type GEShapeTypes = Record<string, GEShapes>;

export type GENode = {
  id: number;
  x: number;
  y: number;
  text: string;
  type: string;
};

export type GEEdge = {
  id: number;
  text: string;
  sourceNodeId: number;
  targetNodeId: number;
  type: string;
};

export enum GEGridType {
  LINES,
  DOTS
}

export type GEViewOptions = {
  nodeRadius: number;
  edgeArrowLength: number;
  edgeArrowRadian: number;
  edgeRectWidth: number;
  edgeRectHeight: number;
  backgroundColor: string;
  showGrid: boolean;
  gridType: GEGridType;
  gridColor: string;
  gridLineWidth: number;
  gridDotGap: number;
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
  defaultNodeType: string;
  defaultEdgeType: string;
  nodeTypes: GEShapeTypes;
  edgeTypes: GEShapeTypes;
  onViewMoved?: () => void;
  onViewZoom?: () => void;
  onAddNode?: (node: GENode) => void;
  onDeleteNode?: (node: GENode) => void;
  onAddEdge?: (edge: GEEdge) => void;
  onDeleteEdge?: (edge: GEEdge, sourceNode: GENode, targetNode: GENode) => void;
};

export type GEViewOptionsParams = {
  [T in keyof GEViewOptions]?: GEViewOptions[T];
};

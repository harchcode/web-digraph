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

export type GEShapes = { 0: GEShape } & GEShape[];

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
  sourceNode: GENode;
  targetNode: GENode;
  type: string;
};

export enum GEGridType {
  LINES,
  DOTS
}

export type GEViewOptions = {
  edgeArrowLength: number;
  edgeArrowRadian: number;
  backgroundColor: string;
  showGrid: boolean;
  gridType: GEGridType;
  gridColor: string;
  gridLineWidth: number;
  gridGap: number;
  defaultSubShapeColor: string;
  nodeLineWidth: number;
  nodeColor: string;
  nodeSelectedColor: string;
  nodeStrokeColor: string;
  nodeTextColor: string;
  nodeSelectedTextColor: string;
  nodeTextStyle: string;
  edgeLineWidth: number;
  edgeLineColor: string;
  edgeLineSelectedColor: string;
  edgeShapeFillColor: string;
  edgeTextColor: string;
  edgeSelectedTextColor: string;
  edgeTextStyle: string;
  minScale: number;
  maxScale: number;
  cursorGrab: string;
  cursorPointer: string;
  cursorCrosshair: string;
  nodeTypes: GEShapeTypes;
  edgeTypes: GEShapeTypes;
  onViewMoved?: () => void;
  onViewZoom?: () => void;
  onCreateNode?: (x: number, y: number, evt: MouseEvent) => void;
  onMoveNode?: (node: GENode, newX: number, newY: number) => void;
  onDeleteNode?: (node: GENode) => void;
  onCreateEdge?: (
    sourceNode: GENode,
    targetNode: GENode,
    evt: MouseEvent
  ) => void;
  onDeleteEdge?: (edge: GEEdge, sourceNode: GENode, targetNode: GENode) => void;
  onSelectionChange?: (
    selectedNode: GENode | undefined,
    selectedEdge: GEEdge | undefined
  ) => void;
  onHoverChange?: (
    hoveredNode: GENode | undefined,
    hoveredEdge: GEEdge | undefined,
    viewX: number,
    viewY: number,
    canvasX: number,
    canvasY: number,
    clientX: number,
    clientY: number
  ) => void;
};

export type GEViewOptionsParams = {
  [T in keyof GEViewOptions]?: GEViewOptions[T];
};

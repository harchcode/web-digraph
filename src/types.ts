export type GENode = {
  id: number;
  x: number;
  y: number;
  r: number;
  text: string;
};

export type GEEdge = {
  id: number;
  text: string;
  sourceNodeId: number;
  targetNodeId: number;
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
  onViewMoved?: () => void;
  onViewZoom?: () => void;
};

export type GEViewOptionsParams = {
  [T in keyof GEViewOptions]?: GEViewOptions[T];
};

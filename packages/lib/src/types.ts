export type Pos = { x: number; y: number };

export type GraphOptions = {
  drawGrid?: boolean;
  gridSize?: number;
  shgCellSize?: number;
};

export type GraphShape = {
  w: number;
  h: number;
  createPath?: (
    x: number,
    y: number,
    w: number,
    h: number,
    id: number
  ) => Path2D;
  drawContent: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    id: number
  ) => void;
};

export type GraphNode = {
  id: number;
  x: number;
  y: number;
  shape: GraphShape;
  path?: Path2D;
  cells?: string[];
};

export type GraphEdge = {
  id: number;
  source: number;
  target: number;
  shape: GraphShape;
  path?: Path2D;
};

export type GraphItem = GraphNode | GraphEdge;

export type GraphRenderer = {
  nodes: Record<number, GraphNode>;
  edges: Record<number, GraphEdge>;

  mount: (el: HTMLCanvasElement) => void;
  addNode: (x: number, y: number, shape: GraphShape, id?: number) => number;
  addEdge: (
    sourceId: number,
    targetId: number,
    shape: GraphShape,
    id?: number
  ) => number;
  moveNodeTo: (id: number, x: number, y: number) => void;
  moveNodeBy: (id: number, dx: number, dy: number) => void;
  removeItem: (id: number) => void;
  removeNode: (id: number) => void;
  removeEdge: (id: number) => void;
  clear: () => void;
  unselect: (ids?: number[]) => void;
  select: (ids: number[]) => void;
  zoomTo: (value: number, targetX?: number, targetY?: number) => void;
  zoomBy: (dv: number, targetX?: number, targetY?: number) => void;
  panTo: (x: number, y: number) => void;
  panBy: (dx: number, dy: number) => void;
  screenToGraph: (x: number, y: number) => Pos;
  graphToScreen: (x: number, y: number) => Pos;
  flush: () => void;
  resize: () => void;

  beginDragNode: (id: number) => void;
  endDragNode: () => Pos;
  beginDragEdge: (sourceId: number) => void;
  endDragEdge: () => number | undefined;
};

export type Pos = { x: number; y: number };

export type GraphOptions = {
  bgColor: string;
  drawGrid: boolean;
  gridType: "line" | "dot";
  gridSize: number;
  gridLineColor: string;
  gridLineWidth: number;
  gridDotRadius: number;
  shgCellSize: number;
  minZoom: number;
  maxZoom: number;
  nodeLineWidth: number;
  nodeLineColor: string;
  nodeShapeColor: string;
  selectedNodeLineWidth: number;
  selectedNodeLineColor: string;
  nodeFont: string;
  edgeLineWidth: number;
  edgeLineColor: string;
  edgeShapeColor: string;
  selectedEdgeLineWidth: number;
  selectedEdgeLineColor: string;
  edgeFont: string;
};

export type GraphShape = {
  w: number;
  h: number;
  path: Path2D;
  draw: (ctx: CanvasRenderingContext2D, path: Path2D, id: number) => void;
};

export type GraphNode = {
  id: number;
  x: number;
  y: number;
  shape: GraphShape;
  cells: string[];
  incomingEdges: Set<number>;
  outgoingEdges: Set<number>;
};

export type GraphEdgeLabel = {
  shape: GraphShape;
  x: number;
  y: number;
  cells: string[];
};

export type GraphEdgeLine = {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  cells: string[];
};

export type GraphEdgeArrow = {
  x: number;
  y: number;
  angle: number;
  cells: string[];
};

export type GraphEdge = {
  id: number;
  source: number;
  target: number;
  label?: GraphEdgeLabel;
  line: GraphEdgeLine;
  arrow: GraphEdgeArrow;
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
    label?: GraphShape,
    id?: number
  ) => number;
  moveNodeTo: (id: number, x: number, y: number, skipGrid?: boolean) => void;
  moveNodeBy: (id: number, dx: number, dy: number, skipGrid?: boolean) => void;
  updateNodeGrid: (id: number) => void;
  updateEdgeGrid: (id: number) => void;
  removeItem: (id: number) => void;
  removeNode: (id: number) => void;
  removeEdge: (id: number) => void;
  clear: () => void;
  unselect: (ids?: number[]) => void;
  select: (ids: number[]) => void;
  getSelectedItems: () => Set<number>;
  getItemAt: (x: number, y: number) => number | null;
  zoomTo: (value: number, targetX?: number, targetY?: number) => void;
  zoomBy: (dv: number, targetX?: number, targetY?: number) => void;
  panTo: (x: number, y: number) => void;
  panBy: (dx: number, dy: number) => void;
  screenToGraph: (x: number, y: number) => Pos;
  graphToScreen: (x: number, y: number) => Pos;
  flush: () => void;
  resize: () => void;
  setGhostEdge: (sourceId: number | null, x?: number, y?: number) => void;
};

export type InteractionMode = "move" | "create";

export type GraphInteractions = {
  setMode: (mode: InteractionMode) => void;
  getMode: () => InteractionMode;
  setMultiSelect: (active: boolean) => void;
  getMultiSelect: () => boolean;
  dispose: () => void;
};

export type InteractionOptions = {
  bindDefaultKeyboardHandlers?: boolean;
};

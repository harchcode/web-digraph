export type Pos = { x: number; y: number };

export type GraphOptions = {
  maxNodes: number;
  maxEdges: number;
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
  initialWorldSize: number;
};

export type GraphShape = {
  w: number;
  h: number;
  path: Path2D;
  draw: (
    ctx: CanvasRenderingContext2D,
    path: Path2D,
    id: number,
    renderer: GraphRenderer
  ) => void;
};

export type GraphRenderer = {
  readonly nodes: {
    readonly count: number;
    readonly x: Float32Array;
    readonly y: Float32Array;
    readonly config: Int32Array;
    readonly incomingEdge: Int32Array;
    readonly outgoingEdge: Int32Array;
  };
  readonly edges: {
    readonly count: number;
    readonly source: Int32Array;
    readonly target: Int32Array;
    readonly config: Int32Array;
    readonly tx: Float32Array;
    readonly ty: Float32Array;
    readonly nextIncomingEdge: Int32Array;
    readonly nextOutgoingEdge: Int32Array;
  };
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly selectedNodes: Int32Array;
  readonly selectedEdges: Int32Array;
  readonly zoom: number;
  readonly cameraX: number;
  readonly cameraY: number;

  registerShape: (shape: GraphShape) => number;
  resize: () => void;
  setWorldSize: (size: number) => void;
  mount: (el: HTMLCanvasElement) => void;
  addNode: (x: number, y: number, shapeId: number) => number;
  addEdge: (sourceId: number, targetId: number, shapeId: number) => number;
  moveNodeTo: (id: number, x: number, y: number) => void;
  moveNodeBy: (id: number, dx: number, dy: number) => void;
  beginDrag: (nodeIds: ArrayLike<number>) => void;
  endDrag: () => void;
  flush: () => void;
  removeNode: (id: number) => void;
  removeEdge: (id: number) => void;
  clear: () => void;
  unselectAll: () => void;
  unselectNode: (id?: number) => void;
  unselectEdge: (id?: number) => void;
  selectNode: (id: number) => void;
  selectEdge: (id: number) => void;
  getNodeAt: (x: number, y: number) => number;
  getEdgeAt: (x: number, y: number) => number;
  zoomTo: (value: number, targetX?: number, targetY?: number) => void;
  zoomBy: (dv: number, targetX?: number, targetY?: number) => void;
  panTo: (x: number, y: number) => void;
  panBy: (dx: number, dy: number) => void;
  centerView: () => void;
  screenToGraph: (x: number, y: number, out: [number, number]) => void;
  graphToScreen: (x: number, y: number, out: [number, number]) => void;
  setGhostEdge: (sourceId: number, tx?: number, ty?: number) => void;
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
  onAddNode?: (x: number, y: number) => void;
  onAddEdge?: (source: number, target: number) => void;
  onDeleteNodes?: (nodeIds: number[]) => void;
  onDeleteEdges?: (edgeIds: number[]) => void;
  onZoom?: (zoom: number) => void;
};

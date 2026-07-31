import { createQuadTree } from "./quad-tree.js";
import { GraphOptions, GraphShape } from "./types.js";

export const defaultGraphOptions: GraphOptions = {
  maxNodes: 1000,
  maxEdges: 10000,
  bgColor: "#fffdf7",
  drawGrid: true,
  gridType: "dot",
  gridSize: 64,
  gridLineColor: "#d1c9b8",
  gridLineWidth: 1,
  gridDotRadius: 2.5,
  shgCellSize: 500,
  minZoom: 0.2,
  maxZoom: 5.0,
  nodeLineWidth: 2,
  nodeLineColor: "#475569",
  nodeShapeColor: "#ffffff",
  selectedNodeLineWidth: 3,
  selectedNodeLineColor: "#0066ff",
  nodeFont: "600 12px Inter, sans-serif",
  edgeLineWidth: 2,
  edgeLineColor: "#3f6212",
  edgeShapeColor: "#ffffff",
  selectedEdgeLineWidth: 3,
  selectedEdgeLineColor: "#0066ff",
  edgeFont: "500 12px Inter, sans-serif"
};

// x: float32, y: float32, config: int32, incomingEdge: int32, outgoingEdge: int32
// 4 + 4 + 4 + 4 + 4 = 20 bytes
// we will only be using Int32Array and Float32Array views of the buffer, so each stride is aligned to 4 bytes
// config is a bitfield that encodes the following:
// bit 0: selected (1 = selected, 0 = not selected)
// bit 1 - 15: reserved for future use
// bit 16 - 31: shapeId
export const NODE_BYTES = 20;
export const nodeStrides = {
  x: 0,
  y: 1,
  config: 2,
  incomingEdge: 3,
  outgoingEdge: 4
};

// source: int32, target: int32, config: int32, tx: float32, ty: float32, nextIncomingEdge: int32, nextOutgoingEdge: int32
// 4 + 4 + 4 + 4 + 4 + 4 + 4 = 28 bytes
export const EDGE_BYTES = 28;
export const edgeStrides = {
  source: 0,
  target: 1,
  config: 2,
  tx: 3,
  ty: 4,
  nextIncomingEdge: 5,
  nextOutgoingEdge: 6
};

export function createGraphRenderer(options?: Partial<GraphOptions>) {
  const opts = { ...defaultGraphOptions, ...options };

  const nodeBuffer = new ArrayBuffer(NODE_BYTES * opts.maxNodes);
  const edgeBuffer = new ArrayBuffer(EDGE_BYTES * opts.maxEdges);
  const selectedNodes = new Int32Array(opts.maxNodes);
  const selectedEdges = new Int32Array(opts.maxEdges);
  const nodeTree = createQuadTree(opts.maxNodes);
  const edgeTree = createQuadTree(opts.maxEdges);

  const nodeCount = 0;
  const edgeCount = 0;
  const minX = 0;
  const minY = 0;
  const maxX = 0;
  const maxY = 0;

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;

  const cameraX = 0;
  const cameraY = 0;
  const zoom = 1;
  let logicalWidth = 0;
  let logicalHeight = 0;
  let halfWidth = 0;
  let halfHeight = 0;
  const isDirty = false;
  const dpr = window.devicePixelRatio || 1;

  const ghostEdge = {
    source: -1, // -1 mean inactive, do not draw
    tx: 0,
    ty: 0
  };

  const shapes: GraphShape[] = [];

  function getBoundaryIntersection(
    path: Path2D,
    cx: number,
    cy: number,
    ox: number,
    oy: number
  ) {
    const dx = ox - cx;
    const dy = oy - cy;
    const e = (Math.abs(dx) + Math.abs(dy)) | 0;

    if (e === 0) return { x: cx, y: cy };

    let start = 0;
    let end = e;

    // Temporarily reset matrix to identity to guarantee pure un-scaled raycast testing
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    while (start <= end) {
      const mid = ((start + end) / 2) | 0;
      const px = cx + (mid / e) * dx;
      const py = cy + (mid / e) * dy;

      if (ctx!.isPointInPath(path, px - cx, py - cy)) {
        // Inside the shape, so boundary is further towards source (ox, oy)
        start = mid + 1;
      } else {
        // Outside the shape, so boundary is further towards target (cx, cy)
        end = mid - 1;
      }
    }

    // Restore the base DPR matrix that exists outside of flush()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const finalT = start / e;
    return { x: cx + finalT * dx, y: cy + finalT * dy };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    logicalWidth = rect.width;
    logicalHeight = rect.height;
    halfWidth = logicalWidth / 2;
    halfHeight = logicalHeight / 2;

    const targetPhysicalWidth = Math.round(logicalWidth * dpr);
    const targetPhysicalHeight = Math.round(logicalHeight * dpr);

    if (
      canvas.width !== targetPhysicalWidth ||
      canvas.height !== targetPhysicalHeight
    ) {
      canvas.width = targetPhysicalWidth;
      canvas.height = targetPhysicalHeight;
      ctx.scale(dpr, dpr);
    }
  }

  function mount(el: HTMLCanvasElement) {
    canvas = el;
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Failed to get 2D context from canvas");

    ctx = context;
    resize();
  }

  function addNode(x: number, y: number, shapeId: number) {}
  function addEdge(sourceId: number, targetId: number, shapeId: number) {}
  function moveNodeTo(id: number, x: number, y: number) {}
  function moveNodeBy(id: number, dx: number, dy: number) {}
  function buildNodeTree() {}
  function buildEdgeTree() {}
  function buildTree() {}
  function draw() {}
  function flush() {} // buildTree() + draw()
  function removeNode(id: number) {}
  function removeEdge(id: number) {}
  function clear() {}
  function unselectAll() {}
  function unselectNode(id?: number) {} // if no id then unselect all nodes
  function unselectEdge(id?: number) {}
  function selectNode(id: number) {}
  function selectEdge(id: number) {}
  function getNodeAt(x: number, y: number): number {
    return -1;
  }
  function getEdgeAt(x: number, y: number): number {
    return -1;
  }
  function zoomTo(value: number, targetX?: number, targetY?: number) {}
  function zoomBy(dv: number, targetX?: number, targetY?: number) {}
  function panTo(x: number, y: number) {}
  function panBy(dx: number, dy: number) {}
  function centerView() {}
  function screenToGraph(x: number, y: number, out: [number, number]) {
    out[0] = 0;
    out[1] = 0;
  }
  function graphToScreen(x: number, y: number, out: [number, number]) {
    out[0] = 0;
    out[1] = 0;
  }
  function setGhostEdge(sourceId: number, tx?: number, ty?: number) {}

  return {
    get nodeBuffer() {
      return nodeBuffer;
    },
    get edgeBuffer() {
      return edgeBuffer;
    },
    get nodeCount() {
      return nodeCount;
    },
    get edgeCount() {
      return edgeCount;
    },
    get selectedNodes() {
      return selectedNodes;
    },
    get selectedEdges() {
      return selectedEdges;
    },
    mount,
    addNode,
    addEdge,
    moveNodeTo,
    moveNodeBy,
    buildNodeTree,
    buildEdgeTree,
    buildTree,
    draw,
    flush,
    removeNode,
    removeEdge,
    clear,
    unselectAll,
    unselectNode,
    unselectEdge,
    selectNode,
    selectEdge,
    getNodeAt,
    getEdgeAt,
    zoomTo,
    zoomBy,
    panTo,
    panBy,
    centerView,
    screenToGraph,
    graphToScreen,
    setGhostEdge
  };
}

export type GraphRenderer = ReturnType<typeof createGraphRenderer>;

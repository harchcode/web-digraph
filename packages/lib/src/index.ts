import { createQuadTree } from "./quad-tree.js";
import { GraphOptions, GraphShape, GraphRenderer } from "./types.js";

export * from "./types.js";

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
// bit 0 - 15: shapeId
// bit 16: selected (1 = selected, 0 = not selected)
// bit 17 - 31: reserved for future use
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

export function createGraphRenderer(
  options?: Partial<GraphOptions>
): GraphRenderer {
  const opts = { ...defaultGraphOptions, ...options };

  const nodeBuffer = new ArrayBuffer(NODE_BYTES * opts.maxNodes);
  const nodeInts = new Int32Array(nodeBuffer);
  const nodeFloats = new Float32Array(nodeBuffer);

  const edgeBuffer = new ArrayBuffer(EDGE_BYTES * opts.maxEdges);
  const edgeInts = new Int32Array(edgeBuffer);
  const edgeFloats = new Float32Array(edgeBuffer);

  const selectedNodes = new Int32Array(opts.maxNodes);
  const selectedEdges = new Int32Array(opts.maxEdges);
  const nodeTree = createQuadTree(opts.maxNodes, 10, 10);
  const edgeTree = createQuadTree(opts.maxEdges, 10, 10);

  let nodeCount = 0;
  let edgeCount = 0;
  const selectedNodeCount = 0;
  const selectedEdgeCount = 0;

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;

  const cameraX = 0;
  const cameraY = 0;
  const zoom = 1;
  let logicalWidth = 0;
  let logicalHeight = 0;
  let halfWidth = 0;
  let halfHeight = 0;
  let isDirty = false;
  let isNodeTreeDirty = true;
  let isEdgeTreeDirty = true;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const ghostEdge = {
    source: -1, // -1 mean inactive, do not draw
    tx: 0,
    ty: 0
  };

  const shapes: GraphShape[] = [];

  function registerShape(shape: GraphShape): number {
    const id = shapes.length;
    shapes.push(shape);
    return id;
  }

  const tmpBBox = new Float32Array(4);

  function getNodeBBox(id: number, out: Float32Array) {
    const offset = id * 5;
    const x = nodeFloats[offset + 0];
    const y = nodeFloats[offset + 1];
    const shapeId = nodeInts[offset + 2] & 0xffff;
    const shape = shapes[shapeId];

    const padding = opts.nodeLineWidth;
    const hw = (shape ? shape.w / 2 : 10) + padding;
    const hh = (shape ? shape.h / 2 : 10) + padding;

    out[0] = x - hw;
    out[1] = y - hh;
    out[2] = x + hw;
    out[3] = y + hh;
  }

  function getEdgeBBox(id: number, out: Float32Array) {
    const offset = id * 7;
    const sourceId = edgeInts[offset + 0];
    const targetId = edgeInts[offset + 1];

    const sx = nodeFloats[sourceId * 5 + 0];
    const sy = nodeFloats[sourceId * 5 + 1];

    const tx = nodeFloats[targetId * 5 + 0];
    const ty = nodeFloats[targetId * 5 + 1];

    const padding = opts.edgeLineWidth;

    out[0] = Math.min(sx, tx) - padding;
    out[1] = Math.min(sy, ty) - padding;
    out[2] = Math.max(sx, tx) + padding;
    out[3] = Math.max(sy, ty) + padding;
  }

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

    applyCameraTransform();

    const finalT = start / e;
    return { x: cx + finalT * dx, y: cy + finalT * dy };
  }

  function applyCameraTransform() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(halfWidth, halfHeight);
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraX, -cameraY);
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

  function addNode(x: number, y: number, shapeId: number): number {
    if (nodeCount >= opts.maxNodes) return -1;

    const id = nodeCount++;
    const offset = id * 5;
    nodeFloats[offset + 0] = x;
    nodeFloats[offset + 1] = y;
    nodeInts[offset + 2] = shapeId;
    nodeInts[offset + 3] = -1; // incomingEdge
    nodeInts[offset + 4] = -1; // outgoingEdge
    isNodeTreeDirty = true;

    return id;
  }

  function addEdge(
    sourceId: number,
    targetId: number,
    shapeId: number
  ): number {
    if (edgeCount >= opts.maxEdges) return -1;

    const id = edgeCount++;
    const offset = id * 7;
    edgeInts[offset + 0] = sourceId;
    edgeInts[offset + 1] = targetId;
    edgeInts[offset + 2] = shapeId;
    edgeFloats[offset + 3] = NaN; // tx
    edgeFloats[offset + 4] = NaN; // ty

    // Prepend to source's outgoing list
    const sourceOffset = sourceId * 5;
    edgeInts[offset + 6] = nodeInts[sourceOffset + 4];
    nodeInts[sourceOffset + 4] = id;

    // Prepend to target's incoming list
    const targetOffset = targetId * 5;
    edgeInts[offset + 5] = nodeInts[targetOffset + 3];
    nodeInts[targetOffset + 3] = id;
    isEdgeTreeDirty = true;

    return id;
  }
  function moveNodeTo(id: number, x: number, y: number) {
    const offset = id * 5;
    nodeFloats[offset + 0] = x;
    nodeFloats[offset + 1] = y;
    isNodeTreeDirty = true;
    isEdgeTreeDirty = true;
  }
  function moveNodeBy(id: number, dx: number, dy: number) {
    const offset = id * 5;
    nodeFloats[offset + 0] += dx;
    nodeFloats[offset + 1] += dy;
    isNodeTreeDirty = true;
    isEdgeTreeDirty = true;
  }
  function buildNodeTree() {
    if (nodeCount === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < nodeCount; i++) {
      getNodeBBox(i, tmpBBox);
      if (tmpBBox[0] < minX) minX = tmpBBox[0];
      if (tmpBBox[1] < minY) minY = tmpBBox[1];
      if (tmpBBox[2] > maxX) maxX = tmpBBox[2];
      if (tmpBBox[3] > maxY) maxY = tmpBBox[3];
    }

    nodeTree.build(nodeCount, getNodeBBox, minX, minY, maxX, maxY);
  }

  function buildEdgeTree() {
    if (edgeCount === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < edgeCount; i++) {
      getEdgeBBox(i, tmpBBox);
      if (tmpBBox[0] < minX) minX = tmpBBox[0];
      if (tmpBBox[1] < minY) minY = tmpBBox[1];
      if (tmpBBox[2] > maxX) maxX = tmpBBox[2];
      if (tmpBBox[3] > maxY) maxY = tmpBBox[3];
    }

    edgeTree.build(edgeCount, getEdgeBBox, minX, minY, maxX, maxY);
  }

  function buildTree() {
    if (isNodeTreeDirty) {
      buildNodeTree();
      isNodeTreeDirty = false;
    }
    if (isEdgeTreeDirty) {
      buildEdgeTree();
      isEdgeTreeDirty = false;
    }
  }
  function drawEdge(id: number, selected: boolean) {
    const offset = id * 7;
    const sourceId = edgeInts[offset + 0];
    const targetId = edgeInts[offset + 1];
    const shapeId = edgeInts[offset + 2] & 0xffff;

    let tx = edgeFloats[offset + 3];
    let ty = edgeFloats[offset + 4];

    const sx = nodeFloats[sourceId * 5 + 0];
    const sy = nodeFloats[sourceId * 5 + 1];

    if (Number.isNaN(tx) || Number.isNaN(ty)) {
      const targetShapeId = nodeInts[targetId * 5 + 2] & 0xffff;
      const targetShape = shapes[targetShapeId];
      const rawTx = nodeFloats[targetId * 5 + 0];
      const rawTy = nodeFloats[targetId * 5 + 1];

      if (targetShape && targetShape.path) {
        const intersection = getBoundaryIntersection(
          targetShape.path,
          rawTx,
          rawTy,
          sx,
          sy
        );
        tx = intersection.x;
        ty = intersection.y;
      } else {
        tx = rawTx;
        ty = rawTy;
      }

      edgeFloats[offset + 3] = tx;
      edgeFloats[offset + 4] = ty;
    }

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.lineWidth = selected ? opts.selectedEdgeLineWidth : opts.edgeLineWidth;
    ctx.strokeStyle = selected
      ? opts.selectedEdgeLineColor
      : opts.edgeLineColor;
    ctx.stroke();

    const shape = shapes[shapeId];
    if (shape && shape.draw) {
      shape.draw(ctx, shape.path, id, api);
    }
  }

  function drawNode(id: number, selected: boolean) {
    const offset = id * 5;
    const x = nodeFloats[offset + 0];
    const y = nodeFloats[offset + 1];
    const shapeId = nodeInts[offset + 2] & 0xffff;

    const shape = shapes[shapeId];
    if (!shape) return;

    ctx.translate(x, y);

    ctx.fillStyle = opts.nodeShapeColor;
    ctx.fill(shape.path);

    ctx.lineWidth = selected ? opts.selectedNodeLineWidth : opts.nodeLineWidth;
    ctx.strokeStyle = selected
      ? opts.selectedNodeLineColor
      : opts.nodeLineColor;
    ctx.stroke(shape.path);

    if (shape.draw) {
      shape.draw(ctx, shape.path, id, api);
    }

    ctx.translate(-x, -y);
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = opts.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    applyCameraTransform();

    const visibleMinX = cameraX - halfWidth / zoom;
    const visibleMinY = cameraY - halfHeight / zoom;
    const visibleMaxX = cameraX + halfWidth / zoom;
    const visibleMaxY = cameraY + halfHeight / zoom;

    const visibleEdges = edgeTree.search(
      visibleMinX,
      visibleMinY,
      visibleMaxX,
      visibleMaxY
    );
    const visibleNodes = nodeTree.search(
      visibleMinX,
      visibleMinY,
      visibleMaxX,
      visibleMaxY
    );

    // Edges (Unselected)
    for (let i = 0; i < visibleEdges.length; i++) {
      const id = visibleEdges[i];
      const selected = (edgeInts[id * 7 + 2] & (1 << 16)) !== 0;
      if (!selected) drawEdge(id, false);
    }

    // Edges (Selected)
    for (let i = 0; i < visibleEdges.length; i++) {
      const id = visibleEdges[i];
      const selected = (edgeInts[id * 7 + 2] & (1 << 16)) !== 0;
      if (selected) drawEdge(id, true);
    }

    // Nodes (Unselected)
    for (let i = 0; i < visibleNodes.length; i++) {
      const id = visibleNodes[i];
      const selected = (nodeInts[id * 5 + 2] & (1 << 16)) !== 0;
      if (!selected) drawNode(id, false);
    }

    // Nodes (Selected)
    for (let i = 0; i < visibleNodes.length; i++) {
      const id = visibleNodes[i];
      const selected = (nodeInts[id * 5 + 2] & (1 << 16)) !== 0;
      if (selected) drawNode(id, true);
    }
  }

  function flush() {
    if (isDirty) return;
    isDirty = true;

    requestAnimationFrame(() => {
      isDirty = false;
      buildTree();
      draw();
    });
  }

  function removeEdge(id: number) {
    if (id < 0 || id >= edgeCount) return;
    isEdgeTreeDirty = true;
    const offset = id * 7;
    const sourceId = edgeInts[offset + 0];
    const targetId = edgeInts[offset + 1];

    // Detach from source outgoing list
    let prevOut = -1;
    let currOut = nodeInts[sourceId * 5 + 4];
    while (currOut !== -1) {
      if (currOut === id) {
        const nextOut = edgeInts[currOut * 7 + 6];
        if (prevOut === -1) nodeInts[sourceId * 5 + 4] = nextOut;
        else edgeInts[prevOut * 7 + 6] = nextOut;
        break;
      }
      prevOut = currOut;
      currOut = edgeInts[currOut * 7 + 6];
    }

    // Detach from target incoming list
    let prevIn = -1;
    let currIn = nodeInts[targetId * 5 + 3];
    while (currIn !== -1) {
      if (currIn === id) {
        const nextIn = edgeInts[currIn * 7 + 5];
        if (prevIn === -1) nodeInts[targetId * 5 + 3] = nextIn;
        else edgeInts[prevIn * 7 + 5] = nextIn;
        break;
      }
      prevIn = currIn;
      currIn = edgeInts[currIn * 7 + 5];
    }

    // Swap-and-Pop
    const lastEdgeId = edgeCount - 1;
    if (id !== lastEdgeId) {
      const lastOffset = lastEdgeId * 7;
      for (let i = 0; i < 7; i++) {
        edgeInts[offset + i] = edgeInts[lastOffset + i]; // 32-bit copy handles both ints and floats
      }

      const newSourceId = edgeInts[offset + 0];
      const newTargetId = edgeInts[offset + 1];

      // Fixup source list
      let pOut = -1;
      let cOut = nodeInts[newSourceId * 5 + 4];
      while (cOut !== -1) {
        if (cOut === lastEdgeId) {
          if (pOut === -1) nodeInts[newSourceId * 5 + 4] = id;
          else edgeInts[pOut * 7 + 6] = id;
          break;
        }
        pOut = cOut;
        cOut = edgeInts[cOut * 7 + 6];
      }

      // Fixup target list
      let pIn = -1;
      let cIn = nodeInts[newTargetId * 5 + 3];
      while (cIn !== -1) {
        if (cIn === lastEdgeId) {
          if (pIn === -1) nodeInts[newTargetId * 5 + 3] = id;
          else edgeInts[pIn * 7 + 5] = id;
          break;
        }
        pIn = cIn;
        cIn = edgeInts[cIn * 7 + 5];
      }
    }

    edgeCount--;
  }

  function removeNode(id: number) {
    if (id < 0 || id >= nodeCount) return;
    isNodeTreeDirty = true;
    isEdgeTreeDirty = true;

    // 1. Delete all edges connected to this node by popping heads
    while (nodeInts[id * 5 + 3] !== -1) {
      removeEdge(nodeInts[id * 5 + 3]);
    }
    while (nodeInts[id * 5 + 4] !== -1) {
      removeEdge(nodeInts[id * 5 + 4]);
    }

    // 2. Swap-and-Pop
    const lastNodeId = nodeCount - 1;
    if (id !== lastNodeId) {
      const offset = id * 5;
      const lastOffset = lastNodeId * 5;
      for (let i = 0; i < 5; i++) {
        nodeInts[offset + i] = nodeInts[lastOffset + i];
      }

      // FIXUP: Update all edges that were connected to lastNodeId to point to id
      let cIn = nodeInts[offset + 3];
      while (cIn !== -1) {
        edgeInts[cIn * 7 + 1] = id; // update edge target
        cIn = edgeInts[cIn * 7 + 5];
      }

      let cOut = nodeInts[offset + 4];
      while (cOut !== -1) {
        edgeInts[cOut * 7 + 0] = id; // update edge source
        cOut = edgeInts[cOut * 7 + 6];
      }
    }

    nodeCount--;
  }
  function clear() {}
  function unselectAll() {}
  function unselectNode(_id?: number) {} // if no id then unselect all nodes
  function unselectEdge(_id?: number) {}
  function selectNode(_id: number) {}
  function selectEdge(_id: number) {}
  function getNodeAt(_x: number, _y: number): number {
    return -1;
  }
  function getEdgeAt(_x: number, _y: number): number {
    return -1;
  }
  function zoomTo(_value: number, _targetX?: number, _targetY?: number) {}
  function zoomBy(_dv: number, _targetX?: number, _targetY?: number) {}
  function panTo(_x: number, _y: number) {}
  function panBy(_dx: number, _dy: number) {}
  function centerView() {}
  function screenToGraph(_x: number, _y: number, out: [number, number]) {
    out[0] = 0;
    out[1] = 0;
  }
  function graphToScreen(_x: number, _y: number, out: [number, number]) {
    out[0] = 0;
    out[1] = 0;
  }
  function setGhostEdge(_sourceId: number, _tx?: number, _ty?: number) {}

  const api = {
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
    registerShape,
    resize,
    mount,
    addNode,
    addEdge,
    moveNodeTo,
    moveNodeBy,
    buildNodeTree,
    buildEdgeTree,
    buildTree,
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

  return api;
}

const sharedArrowPath = new Path2D();
sharedArrowPath.moveTo(0, 0);
sharedArrowPath.lineTo(-10, -5);
sharedArrowPath.lineTo(-10, 5);
sharedArrowPath.closePath();

const defaultPath = new Path2D();
defaultPath.roundRect(-50, -25, 100, 50, 8);

export const defaultShape: GraphShape = {
  w: 50,
  h: 50,
  path: defaultPath,
  draw: (ctx, path, id) => {
    ctx.fill(path);
    ctx.stroke(path);

    ctx.fillStyle = "#475569";
    ctx.fillText(`${id}`, 0, 0);
  }
};

export function createShape(shape: Partial<GraphShape> = {}): GraphShape {
  return {
    ...defaultShape,
    ...shape
  };
}

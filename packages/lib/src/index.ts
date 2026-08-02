import { createQuadTree } from "./quad-tree.js";
import { GraphOptions, GraphShape, GraphRenderer } from "./types.js";

export * from "./types.js";
export * from "./interactions.js";

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
// bit 17: dragging (1 = dragging, 0 = not dragging)
// bit 18 - 31: reserved for future use
export const NODE_BYTES = 20;

// source: int32, target: int32, config: int32, tx: float32, ty: float32, nextIncomingEdge: int32, nextOutgoingEdge: int32
// 4 + 4 + 4 + 4 + 4 + 4 + 4 = 28 bytes
export const EDGE_BYTES = 28;

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
  const nodeTree = createQuadTree(opts.maxNodes, 5, 50);
  const edgeTree = createQuadTree(opts.maxEdges, 5, 50);

  let nodeCount = 0;
  let edgeCount = 0;
  let selectedNodeCount = 0;
  let selectedEdgeCount = 0;

  const activeDragNodes = new Int32Array(opts.maxNodes);
  const activeDragEdges = new Int32Array(opts.maxEdges);
  let activeDragNodeCount = 0;
  let activeDragEdgeCount = 0;

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;

  let cameraX = 0;
  let cameraY = 0;
  let zoom = 1;
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

    let minX = Math.min(sx, tx);
    let minY = Math.min(sy, ty);
    let maxX = Math.max(sx, tx);
    let maxY = Math.max(sy, ty);

    // Arrowhead and baseline padding
    const arrowPad = Math.max(10, opts.edgeLineWidth);
    minX -= arrowPad;
    minY -= arrowPad;
    maxX += arrowPad;
    maxY += arrowPad;

    const shapeId = edgeInts[offset + 2] & 0xffff;
    const shape = shapes[shapeId];

    if (shape) {
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;
      const hw = shape.w / 2;
      const hh = shape.h / 2;

      if (mx - hw < minX) minX = mx - hw;
      if (my - hh < minY) minY = my - hh;
      if (mx + hw > maxX) maxX = mx + hw;
      if (my + hh > maxY) maxY = my + hh;
    }

    out[0] = minX;
    out[1] = minY;
    out[2] = maxX;
    out[3] = maxY;
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
    const s = dpr * zoom;
    const tx = (halfWidth - cameraX * zoom) * dpr;
    const ty = (halfHeight - cameraY * zoom) * dpr;
    ctx.setTransform(s, 0, 0, s, tx, ty);
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

    const angle = Math.atan2(ty - sy, tx - sx);
    const lineEndX = tx - Math.cos(angle) * 8;
    const lineEndY = ty - Math.sin(angle) * 8;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.lineWidth = selected ? opts.selectedEdgeLineWidth : opts.edgeLineWidth;
    ctx.strokeStyle = selected
      ? opts.selectedEdgeLineColor
      : opts.edgeLineColor;
    ctx.stroke();
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    ctx.fillStyle = selected ? opts.selectedEdgeLineColor : opts.edgeLineColor;
    ctx.fill(sharedArrowPath);
    ctx.rotate(-angle);
    ctx.translate(-tx, -ty);

    const shape = shapes[shapeId];
    if (shape && shape.draw) {
      const rawTx = nodeFloats[targetId * 5 + 0];
      const rawTy = nodeFloats[targetId * 5 + 1];
      const mx = (sx + rawTx) / 2 - Math.cos(angle) * 5;
      const my = (sy + rawTy) / 2 - Math.sin(angle) * 5;

      ctx.translate(mx, my);

      ctx.fillStyle = opts.edgeShapeColor;
      ctx.strokeStyle = selected
        ? opts.selectedEdgeLineColor
        : opts.edgeLineColor;
      ctx.lineWidth = selected
        ? opts.selectedEdgeLineWidth
        : opts.edgeLineWidth;

      shape.draw(ctx, shape.path, id, api);

      ctx.translate(-mx, -my);
    }
  }

  function drawGhostEdge() {
    if (ghostEdge.source === -1) return;

    const sx = nodeFloats[ghostEdge.source * 5 + 0];
    const sy = nodeFloats[ghostEdge.source * 5 + 1];
    const tx = ghostEdge.tx;
    const ty = ghostEdge.ty;

    const angle = Math.atan2(ty - sy, tx - sx);
    const lineEndX = tx - Math.cos(angle) * 8;
    const lineEndY = ty - Math.sin(angle) * 8;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.lineWidth = opts.edgeLineWidth;
    ctx.strokeStyle = opts.edgeLineColor;
    ctx.stroke();
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    ctx.fillStyle = opts.edgeLineColor;
    ctx.fill(sharedArrowPath);
    ctx.rotate(-angle);
    ctx.translate(-tx, -ty);
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

  function drawBackground(
    left: number,
    top: number,
    right: number,
    bottom: number
  ) {
    if (!opts.drawGrid) return;
    const gridSize = opts.gridSize;
    if (gridSize * zoom < 10) return; // Hide grid when zoomed too far out

    const startX = Math.floor(left / gridSize) * gridSize;
    const startY = Math.floor(top / gridSize) * gridSize;

    ctx.beginPath();
    if (opts.gridType === "dot") {
      const radius = opts.gridDotRadius;
      ctx.lineWidth = radius * 2;
      ctx.lineCap = "round";
      ctx.setLineDash([0, gridSize]);
      ctx.strokeStyle = opts.gridLineColor;
      for (let y = startY; y < bottom + gridSize; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(right + gridSize, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = "butt";
    } else {
      for (let x = startX; x < right + gridSize; x += gridSize) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
      }
      for (let y = startY; y < bottom + gridSize; y += gridSize) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
      }
      ctx.strokeStyle = opts.gridLineColor;
      ctx.lineWidth = opts.gridLineWidth;
      ctx.stroke();
    }
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

    drawBackground(visibleMinX, visibleMinY, visibleMaxX, visibleMaxY);

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

    // Draw Edges (behind nodes)
    ctx.font = opts.edgeFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Edges (Unselected)
    for (let i = 0; i < visibleEdges.length; i++) {
      const id = visibleEdges[i];
      if ((edgeInts[id * 7 + 2] & (1 << 17)) !== 0) continue; // Skip dragging
      const selected = (edgeInts[id * 7 + 2] & (1 << 16)) !== 0;
      if (!selected) drawEdge(id, false);
    }

    // Edges (Selected)
    for (let i = 0; i < visibleEdges.length; i++) {
      const id = visibleEdges[i];
      if ((edgeInts[id * 7 + 2] & (1 << 17)) !== 0) continue; // Skip dragging
      const selected = (edgeInts[id * 7 + 2] & (1 << 16)) !== 0;
      if (selected) drawEdge(id, true);
    }

    // Active Drag Edges
    if (activeDragEdgeCount > 0) {
      for (let i = 0; i < activeDragEdgeCount; i++) {
        const id = activeDragEdges[i];
        const selected = (edgeInts[id * 7 + 2] & (1 << 16)) !== 0;
        drawEdge(id, selected);
      }
    }

    ctx.font = opts.nodeFont;
    ctx.fillStyle = opts.nodeShapeColor;

    // Nodes (Unselected)
    for (let i = 0; i < visibleNodes.length; i++) {
      const id = visibleNodes[i];
      if ((nodeInts[id * 5 + 2] & (1 << 17)) !== 0) continue; // Skip dragging
      const selected = (nodeInts[id * 5 + 2] & (1 << 16)) !== 0;
      if (!selected) drawNode(id, false);
    }

    if (ghostEdge.source !== -1) {
      drawGhostEdge();
    }

    // Nodes (Selected)
    for (let i = 0; i < visibleNodes.length; i++) {
      const id = visibleNodes[i];
      if ((nodeInts[id * 5 + 2] & (1 << 17)) !== 0) continue; // Skip dragging
      const selected = (nodeInts[id * 5 + 2] & (1 << 16)) !== 0;
      if (selected) drawNode(id, true);
    }

    // Active Drag Nodes
    if (activeDragNodeCount > 0) {
      for (let i = 0; i < activeDragNodeCount; i++) {
        const id = activeDragNodes[i];
        const selected = (nodeInts[id * 5 + 2] & (1 << 16)) !== 0;
        drawNode(id, selected);
      }
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

  function moveNodeTo(id: number, x: number, y: number) {
    if (id < 0 || id >= nodeCount) return;
    const offset = id * 5;
    nodeFloats[offset + 0] = x;
    nodeFloats[offset + 1] = y;

    // Invalidate connected edges
    let edgeId = nodeInts[offset + 3];
    while (edgeId !== -1) {
      edgeFloats[edgeId * 7 + 3] = NaN;
      edgeFloats[edgeId * 7 + 4] = NaN;
      edgeId = edgeInts[edgeId * 7 + 5];
    }
    edgeId = nodeInts[offset + 4];
    while (edgeId !== -1) {
      edgeFloats[edgeId * 7 + 3] = NaN;
      edgeFloats[edgeId * 7 + 4] = NaN;
      edgeId = edgeInts[edgeId * 7 + 6];
    }
  }

  function moveNodeBy(id: number, dx: number, dy: number) {
    if (id < 0 || id >= nodeCount) return;
    const offset = id * 5;
    moveNodeTo(id, nodeFloats[offset + 0] + dx, nodeFloats[offset + 1] + dy);
  }

  function beginDrag(nodeIds: ArrayLike<number>) {
    activeDragNodeCount = 0;
    activeDragEdgeCount = 0;

    for (let i = 0; i < nodeIds.length; i++) {
      const id = nodeIds[i];
      if (id < 0 || id >= nodeCount) continue;
      nodeInts[id * 5 + 2] |= 1 << 17; // Set isDragging bit
      activeDragNodes[activeDragNodeCount++] = id;

      let edgeId = nodeInts[id * 5 + 3];
      while (edgeId !== -1) {
        if ((edgeInts[edgeId * 7 + 2] & (1 << 17)) === 0) {
          edgeInts[edgeId * 7 + 2] |= 1 << 17;
          activeDragEdges[activeDragEdgeCount++] = edgeId;
        }
        edgeId = edgeInts[edgeId * 7 + 5];
      }

      edgeId = nodeInts[id * 5 + 4];
      while (edgeId !== -1) {
        if ((edgeInts[edgeId * 7 + 2] & (1 << 17)) === 0) {
          edgeInts[edgeId * 7 + 2] |= 1 << 17;
          activeDragEdges[activeDragEdgeCount++] = edgeId;
        }
        edgeId = edgeInts[edgeId * 7 + 6];
      }
    }
  }

  function endDrag() {
    for (let i = 0; i < activeDragNodeCount; i++) {
      const id = activeDragNodes[i];
      nodeInts[id * 5 + 2] &= ~(1 << 17); // Clear isDragging bit
    }
    for (let i = 0; i < activeDragEdgeCount; i++) {
      const id = activeDragEdges[i];
      edgeInts[id * 7 + 2] &= ~(1 << 17);
    }
    activeDragNodeCount = 0;
    activeDragEdgeCount = 0;

    isNodeTreeDirty = true;
    isEdgeTreeDirty = true;
  }

  function clear() {
    nodeCount = 0;
    edgeCount = 0;
    isNodeTreeDirty = true;
    isEdgeTreeDirty = true;
  }
  function unselectAll() {
    for (let i = 0; i < selectedNodeCount; i++) {
      const id = selectedNodes[i];
      nodeInts[id * 5 + 2] &= ~(1 << 16);
    }
    for (let i = 0; i < selectedEdgeCount; i++) {
      const id = selectedEdges[i];
      edgeInts[id * 7 + 2] &= ~(1 << 16);
    }
    selectedNodeCount = 0;
    selectedEdgeCount = 0;
  }
  function unselectNode(id?: number) {
    if (id === undefined) {
      for (let i = 0; i < selectedNodeCount; i++) {
        const nid = selectedNodes[i];
        nodeInts[nid * 5 + 2] &= ~(1 << 16);
      }
      selectedNodeCount = 0;
    } else {
      const offset = id * 5;
      if ((nodeInts[offset + 2] & (1 << 16)) === 0) return;
      nodeInts[offset + 2] &= ~(1 << 16);
      for (let i = 0; i < selectedNodeCount; i++) {
        if (selectedNodes[i] === id) {
          selectedNodes[i] = selectedNodes[selectedNodeCount - 1];
          selectedNodeCount--;
          break;
        }
      }
    }
  }
  function unselectEdge(id?: number) {
    if (id === undefined) {
      for (let i = 0; i < selectedEdgeCount; i++) {
        const eid = selectedEdges[i];
        edgeInts[eid * 7 + 2] &= ~(1 << 16);
      }
      selectedEdgeCount = 0;
    } else {
      const offset = id * 7;
      if ((edgeInts[offset + 2] & (1 << 16)) === 0) return;
      edgeInts[offset + 2] &= ~(1 << 16);
      for (let i = 0; i < selectedEdgeCount; i++) {
        if (selectedEdges[i] === id) {
          selectedEdges[i] = selectedEdges[selectedEdgeCount - 1];
          selectedEdgeCount--;
          break;
        }
      }
    }
  }
  function selectNode(id: number) {
    const offset = id * 5;
    if ((nodeInts[offset + 2] & (1 << 16)) !== 0) return;
    nodeInts[offset + 2] |= 1 << 16;
    selectedNodes[selectedNodeCount++] = id;
  }
  function selectEdge(id: number) {
    const offset = id * 7;
    if ((edgeInts[offset + 2] & (1 << 16)) !== 0) return;
    edgeInts[offset + 2] |= 1 << 16;
    selectedEdges[selectedEdgeCount++] = id;
  }
  function getNodeAt(x: number, y: number): number {
    const searchRadius = 1;
    const candidates = nodeTree.search(
      x - searchRadius,
      y - searchRadius,
      x + searchRadius,
      y + searchRadius
    );
    if (candidates.length === 0) return -1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    let matchedNode = -1;
    let matchedZ = -1;
    let isMatchedSelected = false;

    for (let i = 0; i < candidates.length; i++) {
      const id = candidates[i];
      const offset = id * 5;
      const nx = nodeFloats[offset + 0];
      const ny = nodeFloats[offset + 1];
      const shapeId = nodeInts[offset + 2] & 0xffff;
      const selected = (nodeInts[offset + 2] & (1 << 16)) !== 0;

      const shape = shapes[shapeId];
      if (shape && shape.path) {
        if (ctx.isPointInPath(shape.path, x - nx, y - ny)) {
          if (selected && !isMatchedSelected) {
            matchedNode = id;
            matchedZ = id;
            isMatchedSelected = true;
          } else if (selected && isMatchedSelected) {
            if (id > matchedZ) {
              matchedNode = id;
              matchedZ = id;
            }
          } else if (!selected && !isMatchedSelected) {
            if (id > matchedZ) {
              matchedNode = id;
              matchedZ = id;
            }
          }
        }
      }
    }

    return matchedNode;
  }
  function getEdgeAt(x: number, y: number): number {
    const searchRadius = 8;
    const candidates = edgeTree.search(
      x - searchRadius,
      y - searchRadius,
      x + searchRadius,
      y + searchRadius
    );
    if (candidates.length === 0) return -1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    let matchedEdge = -1;
    let matchedZ = -1;
    let isMatchedSelected = false;

    for (let i = 0; i < candidates.length; i++) {
      const id = candidates[i];
      const offset = id * 7;
      const sourceId = edgeInts[offset + 0];
      const targetId = edgeInts[offset + 1];
      const shapeId = edgeInts[offset + 2] & 0xffff;
      const selected = (edgeInts[offset + 2] & (1 << 16)) !== 0;

      const sx = nodeFloats[sourceId * 5 + 0];
      const sy = nodeFloats[sourceId * 5 + 1];
      const tx = edgeFloats[offset + 3];
      const ty = edgeFloats[offset + 4];

      if (Number.isNaN(tx) || Number.isNaN(ty)) continue;

      let hit = false;
      const angle = Math.atan2(ty - sy, tx - sx);

      const shape = shapes[shapeId];
      if (shape && shape.path) {
        const rawTx = nodeFloats[targetId * 5 + 0];
        const rawTy = nodeFloats[targetId * 5 + 1];
        const mx = (sx + rawTx) / 2 - Math.cos(angle) * 5;
        const my = (sy + rawTy) / 2 - Math.sin(angle) * 5;

        if (ctx.isPointInPath(shape.path, x - mx, y - my)) {
          hit = true;
        }
      }

      if (!hit) {
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const dx = x - tx;
        const dy = y - ty;
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        if (ctx.isPointInPath(sharedArrowPath, rx, ry)) {
          hit = true;
        }
      }

      if (!hit) {
        const A = x - sx;
        const B = y - sy;
        const C = tx - sx;
        const D = ty - sy;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq != 0) param = dot / len_sq;

        let xx, yy;
        if (param < 0) {
          xx = sx;
          yy = sy;
        } else if (param > 1) {
          xx = tx;
          yy = ty;
        } else {
          xx = sx + param * C;
          yy = sy + param * D;
        }

        const dx2 = x - xx;
        const dy2 = y - yy;
        const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        if (dist <= 8) {
          hit = true;
        }
      }

      if (hit) {
        if (selected && !isMatchedSelected) {
          matchedEdge = id;
          matchedZ = id;
          isMatchedSelected = true;
        } else if (selected && isMatchedSelected) {
          if (id > matchedZ) {
            matchedEdge = id;
            matchedZ = id;
          }
        } else if (!selected && !isMatchedSelected) {
          if (id > matchedZ) {
            matchedEdge = id;
            matchedZ = id;
          }
        }
      }
    }

    return matchedEdge;
  }
  function zoomTo(value: number, targetX?: number, targetY?: number) {
    const newZoom = Math.max(opts.minZoom, Math.min(opts.maxZoom, value));
    if (newZoom === zoom) return;

    const cx = targetX ?? halfWidth;
    const cy = targetY ?? halfHeight;

    const gx = (cx - halfWidth) / zoom + cameraX;
    const gy = (cy - halfHeight) / zoom + cameraY;

    zoom = newZoom;

    cameraX = gx - (cx - halfWidth) / zoom;
    cameraY = gy - (cy - halfHeight) / zoom;
  }
  function zoomBy(factor: number, targetX?: number, targetY?: number) {
    zoomTo(zoom * factor, targetX, targetY);
  }
  function panTo(x: number, y: number) {
    cameraX = x;
    cameraY = y;
  }
  function panBy(dx: number, dy: number) {
    cameraX -= dx / zoom;
    cameraY -= dy / zoom;
  }
  function centerView() {
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

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const graphWidth = Math.max(1, maxX - minX);
    const graphHeight = Math.max(1, maxY - minY);

    const usableWidth = Math.max(10, logicalWidth - 100);
    const usableHeight = Math.max(10, logicalHeight - 100);

    let newZoom = Math.min(
      usableWidth / graphWidth,
      usableHeight / graphHeight
    );
    newZoom = Math.min(newZoom, opts.maxZoom);

    panTo(centerX, centerY);
    zoomTo(newZoom);
  }
  function screenToGraph(x: number, y: number, out: [number, number]) {
    out[0] = (x - halfWidth) / zoom + cameraX;
    out[1] = (y - halfHeight) / zoom + cameraY;
  }
  function graphToScreen(x: number, y: number, out: [number, number]) {
    out[0] = (x - cameraX) * zoom + halfWidth;
    out[1] = (y - cameraY) * zoom + halfHeight;
  }
  function setGhostEdge(sourceId: number, tx?: number, ty?: number) {
    ghostEdge.source = sourceId;
    if (tx !== undefined && ty !== undefined) {
      ghostEdge.tx = tx;
      ghostEdge.ty = ty;
    }
  }

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
      return selectedNodes.subarray(0, selectedNodeCount);
    },
    get selectedEdges() {
      return selectedEdges.subarray(0, selectedEdgeCount);
    },
    get zoom() {
      return zoom;
    },
    get cameraX() {
      return cameraX;
    },
    get cameraY() {
      return cameraY;
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
    beginDrag,
    endDrag,
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

import { createQuadTree } from "./quad-tree.js";
import { GraphOptions, GraphShape, GraphRenderer } from "./types.js";
import { createNodeStore } from "./node-store.js";
import { createEdgeStore } from "./edge-store.js";

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
  edgeFont: "500 12px Inter, sans-serif",
  initialWorldSize: 10000
};

export function createGraphRenderer(
  options?: Partial<GraphOptions>
): GraphRenderer {
  const opts = { ...defaultGraphOptions, ...options };

  const nodes = createNodeStore(opts.maxNodes);
  const edges = createEdgeStore(opts.maxEdges);

  const selectedNodes = new Int32Array(opts.maxNodes);
  const selectedEdges = new Int32Array(opts.maxEdges);

  // Forward declare for the quad tree callbacks
  const tmpBBox = new Float32Array(4);

  function getNodeBBox(id: number, out: Float32Array) {
    const x = nodes.x[id];
    const y = nodes.y[id];
    const shapeId = nodes.config[id] & 0xffff;
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
    const sourceId = edges.source[id];
    const targetId = edges.target[id];

    const sx = nodes.x[sourceId];
    const sy = nodes.y[sourceId];

    const tx = nodes.x[targetId];
    const ty = nodes.y[targetId];

    let minX = Math.min(sx, tx);
    let minY = Math.min(sy, ty);
    let maxX = Math.max(sx, tx);
    let maxY = Math.max(sy, ty);

    const arrowPad = Math.max(10, opts.edgeLineWidth);
    minX -= arrowPad;
    minY -= arrowPad;
    maxX += arrowPad;
    maxY += arrowPad;

    const shapeId = edges.config[id] & 0xffff;
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

  const nodeTree = createQuadTree(
    opts.maxNodes,
    getNodeBBox,
    opts.initialWorldSize,
    16,
    50
  );
  const edgeTree = createQuadTree(
    opts.maxEdges,
    getEdgeBBox,
    opts.initialWorldSize,
    16,
    50
  );

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

  function setWorldSize(size: number) {
    nodeTree.resize(size);
    edgeTree.resize(size);
  }

  function addNode(x: number, y: number, shapeId: number): number {
    const id = nodes.add(x, y, shapeId);
    if (id !== -1) {
      nodeTree.insert(id);
    }
    return id;
  }

  function addEdge(
    sourceId: number,
    targetId: number,
    shapeId: number
  ): number {
    const id = edges.add(sourceId, targetId, shapeId);
    if (id === -1) return -1;

    edges.tx[id] = NaN;
    edges.ty[id] = NaN;

    // Prepend to source's outgoing list
    edges.nextOutgoingEdge[id] = nodes.outgoingEdge[sourceId];
    nodes.outgoingEdge[sourceId] = id;

    // Prepend to target's incoming list
    edges.nextIncomingEdge[id] = nodes.incomingEdge[targetId];
    nodes.incomingEdge[targetId] = id;

    edgeTree.insert(id);
    return id;
  }

  function drawEdge(id: number, selected: boolean) {
    const sourceId = edges.source[id];
    const targetId = edges.target[id];
    const shapeId = edges.config[id] & 0xffff;

    let tx = edges.tx[id];
    let ty = edges.ty[id];

    const sx = nodes.x[sourceId];
    const sy = nodes.y[sourceId];

    if (Number.isNaN(tx) || Number.isNaN(ty)) {
      const targetShapeId = nodes.config[targetId] & 0xffff;
      const targetShape = shapes[targetShapeId];
      const rawTx = nodes.x[targetId];
      const rawTy = nodes.y[targetId];

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

      edges.tx[id] = tx;
      edges.ty[id] = ty;
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
    ctx.fill(getArrowPath());
    ctx.rotate(-angle);
    ctx.translate(-tx, -ty);

    const shape = shapes[shapeId];
    if (shape && shape.draw) {
      const rawTx = nodes.x[targetId];
      const rawTy = nodes.y[targetId];
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

    const sx = nodes.x[ghostEdge.source];
    const sy = nodes.y[ghostEdge.source];
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
    ctx.fill(getArrowPath());
    ctx.rotate(-angle);
    ctx.translate(-tx, -ty);
  }

  function drawNode(id: number, selected: boolean) {
    const x = nodes.x[id];
    const y = nodes.y[id];
    const shapeId = nodes.config[id] & 0xffff;

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
      if ((edges.config[id] & (1 << 17)) !== 0) continue; // Skip dragging
      const selected = (edges.config[id] & (1 << 16)) !== 0;
      if (!selected) drawEdge(id, false);
    }

    // Edges (Selected)
    for (let i = 0; i < visibleEdges.length; i++) {
      const id = visibleEdges[i];
      if ((edges.config[id] & (1 << 17)) !== 0) continue; // Skip dragging
      const selected = (edges.config[id] & (1 << 16)) !== 0;
      if (selected) drawEdge(id, true);
    }

    // Active Drag Edges
    if (activeDragEdgeCount > 0) {
      for (let i = 0; i < activeDragEdgeCount; i++) {
        const id = activeDragEdges[i];
        const selected = (edges.config[id] & (1 << 16)) !== 0;
        drawEdge(id, selected);
      }
    }

    ctx.font = opts.nodeFont;
    ctx.fillStyle = opts.nodeShapeColor;

    // Nodes (Unselected)
    for (let i = 0; i < visibleNodes.length; i++) {
      const id = visibleNodes[i];
      if ((nodes.config[id] & (1 << 17)) !== 0) continue; // Skip dragging
      const selected = (nodes.config[id] & (1 << 16)) !== 0;
      if (!selected) drawNode(id, false);
    }

    if (ghostEdge.source !== -1) {
      drawGhostEdge();
    }

    // Nodes (Selected)
    for (let i = 0; i < visibleNodes.length; i++) {
      const id = visibleNodes[i];
      if ((nodes.config[id] & (1 << 17)) !== 0) continue; // Skip dragging
      const selected = (nodes.config[id] & (1 << 16)) !== 0;
      if (selected) drawNode(id, true);
    }

    // Active Drag Nodes
    if (activeDragNodeCount > 0) {
      for (let i = 0; i < activeDragNodeCount; i++) {
        const id = activeDragNodes[i];
        const selected = (nodes.config[id] & (1 << 16)) !== 0;
        drawNode(id, selected);
      }
    }
  }

  function flush() {
    if (isDirty) return;
    isDirty = true;

    requestAnimationFrame(() => {
      isDirty = false;
      draw();
    });
  }

  function removeEdge(id: number) {
    if (id < 0 || id >= edges.count) return;
    edgeTree.remove(id);

    const sourceId = edges.source[id];
    const targetId = edges.target[id];

    // Detach from source outgoing list
    let prevOut = -1;
    let currOut = nodes.outgoingEdge[sourceId];
    while (currOut !== -1) {
      if (currOut === id) {
        const nextOut = edges.nextOutgoingEdge[currOut];
        if (prevOut === -1) nodes.outgoingEdge[sourceId] = nextOut;
        else edges.nextOutgoingEdge[prevOut] = nextOut;
        break;
      }
      prevOut = currOut;
      currOut = edges.nextOutgoingEdge[currOut];
    }

    // Detach from target incoming list
    let prevIn = -1;
    let currIn = nodes.incomingEdge[targetId];
    while (currIn !== -1) {
      if (currIn === id) {
        const nextIn = edges.nextIncomingEdge[currIn];
        if (prevIn === -1) nodes.incomingEdge[targetId] = nextIn;
        else edges.nextIncomingEdge[prevIn] = nextIn;
        break;
      }
      prevIn = currIn;
      currIn = edges.nextIncomingEdge[currIn];
    }

    // Swap-and-Pop
    const movedEdgeId = edges.remove(id);
    
    if (movedEdgeId !== -1) {
      edgeTree.remove(movedEdgeId);
      
      const newSourceId = edges.source[id];
      const newTargetId = edges.target[id];

      // Fixup source list
      let pOut = -1;
      let cOut = nodes.outgoingEdge[newSourceId];
      while (cOut !== -1) {
        if (cOut === movedEdgeId) {
          if (pOut === -1) nodes.outgoingEdge[newSourceId] = id;
          else edges.nextOutgoingEdge[pOut] = id;
          break;
        }
        pOut = cOut;
        cOut = edges.nextOutgoingEdge[cOut];
      }

      // Fixup target list
      let pIn = -1;
      let cIn = nodes.incomingEdge[newTargetId];
      while (cIn !== -1) {
        if (cIn === movedEdgeId) {
          if (pIn === -1) nodes.incomingEdge[newTargetId] = id;
          else edges.nextIncomingEdge[pIn] = id;
          break;
        }
        pIn = cIn;
        cIn = edges.nextIncomingEdge[cIn];
      }

      edgeTree.insert(id);
    }
  }

  function removeNode(id: number) {
    if (id < 0 || id >= nodes.count) return;
    nodeTree.remove(id);

    // 1. Delete all edges connected to this node by popping heads
    while (nodes.incomingEdge[id] !== -1) {
      removeEdge(nodes.incomingEdge[id]);
    }
    while (nodes.outgoingEdge[id] !== -1) {
      removeEdge(nodes.outgoingEdge[id]);
    }

    // 2. Swap-and-Pop
    const movedNodeId = nodes.remove(id);
    if (movedNodeId !== -1) {
      nodeTree.remove(movedNodeId);

      // FIXUP: Update all edges that were connected to movedNodeId to point to id
      let cIn = nodes.incomingEdge[id];
      while (cIn !== -1) {
        edges.target[cIn] = id; // update edge target
        cIn = edges.nextIncomingEdge[cIn];
      }

      let cOut = nodes.outgoingEdge[id];
      while (cOut !== -1) {
        edges.source[cOut] = id; // update edge source
        cOut = edges.nextOutgoingEdge[cOut];
      }

      nodeTree.insert(id);
    }
  }

  function moveNodeTo(id: number, x: number, y: number) {
    if (id < 0 || id >= nodes.count) return;
    nodes.x[id] = x;
    nodes.y[id] = y;

    // Invalidate connected edges
    let edgeId = nodes.incomingEdge[id];
    while (edgeId !== -1) {
      edges.tx[edgeId] = NaN;
      edges.ty[edgeId] = NaN;
      edgeTree.update(edgeId);
      edgeId = edges.nextIncomingEdge[edgeId];
    }
    edgeId = nodes.outgoingEdge[id];
    while (edgeId !== -1) {
      edges.tx[edgeId] = NaN;
      edges.ty[edgeId] = NaN;
      edgeTree.update(edgeId);
      edgeId = edges.nextOutgoingEdge[edgeId]; // next outgoing
    }

    nodeTree.update(id);
  }

  function moveNodeBy(id: number, dx: number, dy: number) {
    if (id < 0 || id >= nodes.count) return;
    moveNodeTo(id, nodes.x[id] + dx, nodes.y[id] + dy);
  }

  function beginDrag(nodeIds: ArrayLike<number>) {
    activeDragNodeCount = 0;
    activeDragEdgeCount = 0;

    for (let i = 0; i < nodeIds.length; i++) {
      const id = nodeIds[i];
      if (id < 0 || id >= nodes.count) continue;
      nodes.config[id] |= 1 << 17; // Set isDragging bit
      activeDragNodes[activeDragNodeCount++] = id;

      let edgeId = nodes.incomingEdge[id];
      while (edgeId !== -1) {
        if ((edges.config[edgeId] & (1 << 17)) === 0) {
          edges.config[edgeId] |= 1 << 17;
          activeDragEdges[activeDragEdgeCount++] = edgeId;
        }
        edgeId = edges.nextIncomingEdge[edgeId];
      }

      edgeId = nodes.outgoingEdge[id];
      while (edgeId !== -1) {
        if ((edges.config[edgeId] & (1 << 17)) === 0) {
          edges.config[edgeId] |= 1 << 17;
          activeDragEdges[activeDragEdgeCount++] = edgeId;
        }
        edgeId = edges.nextOutgoingEdge[edgeId];
      }
    }
  }

  function endDrag() {
    for (let i = 0; i < activeDragNodeCount; i++) {
      const id = activeDragNodes[i];
      nodes.config[id] &= ~(1 << 17); // Clear isDragging bit
    }
    for (let i = 0; i < activeDragEdgeCount; i++) {
      const id = activeDragEdges[i];
      edges.config[id] &= ~(1 << 17);
    }
    activeDragNodeCount = 0;
    activeDragEdgeCount = 0;
  }

  function clear() {
    nodes.count = 0;
    edges.count = 0;
    nodeTree.clear();
    edgeTree.clear();
  }
  function unselectAll() {
    for (let i = 0; i < selectedNodeCount; i++) {
      const id = selectedNodes[i];
      nodes.config[id] &= ~(1 << 16);
    }
    for (let i = 0; i < selectedEdgeCount; i++) {
      const id = selectedEdges[i];
      edges.config[id] &= ~(1 << 16);
    }
    selectedNodeCount = 0;
    selectedEdgeCount = 0;
  }
  function unselectNode(id?: number) {
    if (id === undefined) {
      for (let i = 0; i < selectedNodeCount; i++) {
        const nid = selectedNodes[i];
        nodes.config[nid] &= ~(1 << 16);
      }
      selectedNodeCount = 0;
    } else {
      if ((nodes.config[id] & (1 << 16)) === 0) return;
      nodes.config[id] &= ~(1 << 16);
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
        edges.config[eid] &= ~(1 << 16);
      }
      selectedEdgeCount = 0;
    } else {
      if ((edges.config[id] & (1 << 16)) === 0) return;
      edges.config[id] &= ~(1 << 16);
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
    if ((nodes.config[id] & (1 << 16)) !== 0) return;
    nodes.config[id] |= 1 << 16;
    selectedNodes[selectedNodeCount++] = id;
  }
  function selectEdge(id: number) {
    if ((edges.config[id] & (1 << 16)) !== 0) return;
    edges.config[id] |= 1 << 16;
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
      const nx = nodes.x[id];
      const ny = nodes.y[id];
      const shapeId = nodes.config[id] & 0xffff;
      const selected = (nodes.config[id] & (1 << 16)) !== 0;

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
      const sourceId = edges.source[id];
      const targetId = edges.target[id];
      const shapeId = edges.config[id] & 0xffff;
      const selected = (edges.config[id] & (1 << 16)) !== 0;

      const sx = nodes.x[sourceId];
      const sy = nodes.y[sourceId];
      const tx = edges.tx[id];
      const ty = edges.ty[id];

      if (Number.isNaN(tx) || Number.isNaN(ty)) continue;

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

      if (dist > searchRadius + 15) continue;

      let hit = false;
      if (dist <= searchRadius + 2) hit = true;

      const angle = Math.atan2(ty - sy, tx - sx);

      const shape = shapes[shapeId];
      if (!hit && shape && shape.path) {
        const rawTx = nodes.x[targetId];
        const rawTy = nodes.y[targetId];
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
        if (ctx.isPointInPath(getArrowPath(), rx, ry)) {
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
    if (nodes.count === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < nodes.count; i++) {
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
    get nodes() {
      return nodes;
    },
    get edges() {
      return edges;
    },
    get nodeCount() {
      return nodes.count;
    },
    get edgeCount() {
      return edges.count;
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
    flush,
    removeNode,
    removeEdge,
    beginDrag,
    endDrag,
    clear,
    setWorldSize,
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

let sharedArrowPath: Path2D;
function getArrowPath() {
  if (!sharedArrowPath) {
    sharedArrowPath = new Path2D();
    sharedArrowPath.moveTo(0, 0);
    sharedArrowPath.lineTo(-10, -5);
    sharedArrowPath.lineTo(-10, 5);
    sharedArrowPath.closePath();
  }
  return sharedArrowPath;
}

let defaultPath: Path2D;
function getDefaultPath() {
  if (!defaultPath) {
    defaultPath = new Path2D();
    defaultPath.roundRect(-50, -25, 100, 50, 8);
  }
  return defaultPath;
}

const defaultShape: GraphShape = {
  w: 50,
  h: 50,
  get path() {
    return getDefaultPath();
  },
  draw: (ctx, path, id) => {
    ctx.fill(path);
    ctx.stroke(path);
    ctx.fillStyle = "#475569";
    ctx.fillText(String(id), 0, 0);
  }
};

export function createShape(shape: Partial<GraphShape> = {}): GraphShape {
  return {
    ...defaultShape,
    ...shape
  };
}

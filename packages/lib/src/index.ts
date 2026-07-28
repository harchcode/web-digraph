import type {
  GraphRenderer,
  GraphShape,
  GraphNode,
  GraphEdge,
  Pos,
  GraphOptions
} from "./types.js";

export * from "./types.js";
export * from "./interactions.js";

let nextId = 1;
function generateId(): number {
  return nextId++;
}

export const defaultGraphOptions: GraphOptions = {
  bgColor: "#fffdf7",
  drawGrid: true,
  gridType: "dot",
  gridSize: 64,
  gridLineColor: "#d1c9b8",
  gridLineWidth: 1,
  gridDotRadius: 2.5,
  shgCellSize: 500,
  minZoom: 0.1,
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

export function createGraphRenderer(
  options?: Partial<GraphOptions>
): GraphRenderer {
  const opts = { ...defaultGraphOptions, ...options };

  const nodes: Record<number, GraphNode> = {};
  const edges: Record<number, GraphEdge> = {};
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  let cameraX = 0;
  let cameraY = 0;
  let zoom = 1;
  let logicalWidth = 0;
  let logicalHeight = 0;
  let halfWidth = 0;
  let halfHeight = 0;
  let isDirty = false;
  let dpr = 1;

  const spatialGrid: Record<string, Set<number>> = {};
  const selectedItems = new Set<number>();
  let ghostEdge: { sourceId: number; x: number; y: number } | null = null;

  function pointToLineDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    const dx = px - xx;
    const dy = py - yy;
    return Math.hypot(dx, dy);
  }

  function getCellsForBounds(
    left: number,
    top: number,
    right: number,
    bottom: number
  ) {
    const cells: string[] = [];
    const minX = Math.floor(left / opts.shgCellSize);
    const maxX = Math.floor(right / opts.shgCellSize);
    const minY = Math.floor(top / opts.shgCellSize);
    const maxY = Math.floor(bottom / opts.shgCellSize);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.push(`${x},${y}`);
      }
    }
    return cells;
  }

  function getCellsForLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    thickness: number
  ) {
    const cells = new Set<string>();
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
      cells.add(
        `${Math.floor(x0 / opts.shgCellSize)},${Math.floor(y0 / opts.shgCellSize)}`
      );
      return Array.from(cells);
    }

    // Step along the line in small increments to sample intersected cells.
    // A step size of (cellSize / 4) guarantees we won't skip over any cell corners.
    const step = opts.shgCellSize / 4;
    const steps = Math.ceil(len / step);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + dx * t;
      const py = y0 + dy * t;

      const cx = Math.floor(px / opts.shgCellSize);
      const cy = Math.floor(py / opts.shgCellSize);
      cells.add(`${cx},${cy}`);

      // Expand into adjacent cells if we are near the cell boundary
      const localX = px - cx * opts.shgCellSize;
      const localY = py - cy * opts.shgCellSize;

      if (localX < thickness) cells.add(`${cx - 1},${cy}`);
      if (localX > opts.shgCellSize - thickness) cells.add(`${cx + 1},${cy}`);
      if (localY < thickness) cells.add(`${cx},${cy - 1}`);
      if (localY > opts.shgCellSize - thickness) cells.add(`${cx},${cy + 1}`);

      if (localX < thickness && localY < thickness)
        cells.add(`${cx - 1},${cy - 1}`);
      if (localX > opts.shgCellSize - thickness && localY < thickness)
        cells.add(`${cx + 1},${cy - 1}`);
      if (localX < thickness && localY > opts.shgCellSize - thickness)
        cells.add(`${cx - 1},${cy + 1}`);
      if (
        localX > opts.shgCellSize - thickness &&
        localY > opts.shgCellSize - thickness
      )
        cells.add(`${cx + 1},${cy + 1}`);
    }

    return Array.from(cells);
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
    ctx!.setTransform(1, 0, 0, 1, 0, 0);

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
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    const finalT = start / e;
    return { x: cx + finalT * dx, y: cy + finalT * dy };
  }

  function insertToGrid(id: number, cells: string[]) {
    for (const cell of cells) {
      if (!spatialGrid[cell]) spatialGrid[cell] = new Set();
      spatialGrid[cell].add(id);
    }
  }

  function removeFromGrid(id: number, cells: string[]) {
    if (!cells) return;
    for (const cell of cells) {
      spatialGrid[cell]?.delete(id);
      if (spatialGrid[cell]?.size === 0) delete spatialGrid[cell];
    }
  }

  function insertNodeToGrid(node: GraphNode) {
    const left = node.x - node.shape.w / 2;
    const right = node.x + node.shape.w / 2;
    const top = node.y - node.shape.h / 2;
    const bottom = node.y + node.shape.h / 2;
    node.cells = getCellsForBounds(left, top, right, bottom);
    insertToGrid(node.id, node.cells);
  }

  function removeNodeFromGrid(node: GraphNode) {
    removeFromGrid(node.id, node.cells);
    node.cells = [];
  }

  function insertEdgeToGrid(edge: GraphEdge) {
    edge.line.cells = getCellsForLine(
      edge.line.sx,
      edge.line.sy,
      edge.line.tx,
      edge.line.ty,
      4
    );
    insertToGrid(edge.id, edge.line.cells);

    const arrowMinX = edge.arrow.x - 10;
    const arrowMaxX = edge.arrow.x + 10;
    const arrowMinY = edge.arrow.y - 10;
    const arrowMaxY = edge.arrow.y + 10;
    edge.arrow.cells = getCellsForBounds(
      arrowMinX,
      arrowMinY,
      arrowMaxX,
      arrowMaxY
    );
    insertToGrid(edge.id, edge.arrow.cells);

    if (edge.label) {
      const labelMinX = edge.label.x - edge.label.shape.w / 2;
      const labelMaxX = edge.label.x + edge.label.shape.w / 2;
      const labelMinY = edge.label.y - edge.label.shape.h / 2;
      const labelMaxY = edge.label.y + edge.label.shape.h / 2;
      edge.label.cells = getCellsForBounds(
        labelMinX,
        labelMinY,
        labelMaxX,
        labelMaxY
      );
      insertToGrid(edge.id, edge.label.cells);
    }
  }

  function removeEdgeFromGrid(edge: GraphEdge) {
    removeFromGrid(edge.id, edge.line.cells);
    removeFromGrid(edge.id, edge.arrow.cells);
    if (edge.label) removeFromGrid(edge.id, edge.label.cells);

    edge.line.cells = [];
    edge.arrow.cells = [];
    if (edge.label) edge.label.cells = [];
  }

  function updateEdgeGeometry(edgeId: number, skipGrid = false) {
    const edge = edges[edgeId];
    if (!edge) return;
    const sourceNode = nodes[edge.source];
    const targetNode = nodes[edge.target];
    if (!sourceNode || !targetNode) return;

    if (!skipGrid) removeEdgeFromGrid(edge);

    const targetIntersection = getBoundaryIntersection(
      targetNode.shape.path,
      targetNode.x,
      targetNode.y,
      sourceNode.x,
      sourceNode.y
    );

    const dx = targetIntersection.x - sourceNode.x;
    const dy = targetIntersection.y - sourceNode.y;
    const angle = Math.atan2(dy, dx);
    const arrowSize = 10;

    const lineEndX = targetIntersection.x - Math.cos(angle) * (arrowSize - 2);
    const lineEndY = targetIntersection.y - Math.sin(angle) * (arrowSize - 2);

    edge.line.sx = sourceNode.x;
    edge.line.sy = sourceNode.y;
    edge.line.tx = lineEndX;
    edge.line.ty = lineEndY;

    edge.arrow.x = targetIntersection.x;
    edge.arrow.y = targetIntersection.y;
    edge.arrow.angle = angle;

    if (edge.label) {
      // Use dead centers of nodes, shifted back by half the arrow height to remain centered
      edge.label.x =
        (sourceNode.x + targetNode.x) / 2 - Math.cos(angle) * (arrowSize / 2);
      edge.label.y =
        (sourceNode.y + targetNode.y) / 2 - Math.sin(angle) * (arrowSize / 2);
    }

    if (!skipGrid) insertEdgeToGrid(edge);
  }

  function drawNode(nodeId: number, offsetX: number, offsetY: number) {
    if (!ctx) return;
    const node = nodes[nodeId];
    ctx.setTransform(
      zoom * dpr,
      0,
      0,
      zoom * dpr,
      (node.x * zoom + offsetX) * dpr,
      (node.y * zoom + offsetY) * dpr
    );

    if (selectedItems.has(node.id)) {
      ctx.lineWidth = opts.selectedNodeLineWidth;
      ctx.strokeStyle = opts.selectedNodeLineColor;
    } else {
      ctx.strokeStyle = opts.nodeLineColor;
      ctx.lineWidth = opts.nodeLineWidth;
    }

    ctx.fillStyle = opts.nodeShapeColor;
    node.shape.draw(ctx, node.shape.path, node.id);
  }

  function drawEdge(edgeId: number, offsetX: number, offsetY: number) {
    if (!ctx) return;
    const edge = edges[edgeId];
    const isSelected = selectedItems.has(edgeId);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(halfWidth, halfHeight);
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraX, -cameraY);

    ctx.beginPath();
    ctx.moveTo(edge.line.sx, edge.line.sy);
    ctx.lineTo(edge.line.tx, edge.line.ty);
    ctx.strokeStyle = isSelected
      ? opts.selectedEdgeLineColor
      : opts.edgeLineColor;
    ctx.lineWidth = isSelected
      ? opts.selectedEdgeLineWidth
      : opts.edgeLineWidth;
    ctx.stroke();

    ctx.setTransform(
      zoom * dpr,
      0,
      0,
      zoom * dpr,
      (edge.arrow.x * zoom + offsetX) * dpr,
      (edge.arrow.y * zoom + offsetY) * dpr
    );
    ctx.rotate(edge.arrow.angle);
    ctx.fillStyle = isSelected
      ? opts.selectedEdgeLineColor
      : opts.edgeLineColor;
    ctx.fill(sharedArrowPath);

    if (edge.label) {
      ctx.setTransform(
        zoom * dpr,
        0,
        0,
        zoom * dpr,
        (edge.label.x * zoom + offsetX) * dpr,
        (edge.label.y * zoom + offsetY) * dpr
      );

      ctx.fillStyle = opts.edgeShapeColor;
      ctx.strokeStyle = isSelected
        ? opts.selectedEdgeLineColor
        : opts.edgeLineColor;
      ctx.lineWidth = isSelected
        ? opts.selectedEdgeLineWidth
        : opts.edgeLineWidth;
      edge.label.shape.draw(ctx, edge.label.shape.path, edge.id);
    }
  }

  function drawBackground(
    left: number,
    top: number,
    right: number,
    bottom: number
  ) {
    if (!ctx) return;
    if (!opts.drawGrid) return;
    const gridSize = opts.gridSize;
    if (gridSize * zoom < 10) return;

    const startX = Math.floor(left / gridSize) * gridSize;
    const startY = Math.floor(top / gridSize) * gridSize;

    ctx.beginPath();
    if (opts.gridType === "dot") {
      const radius = opts.gridDotRadius;
      ctx.lineWidth = radius * 2;
      ctx.lineCap = "round";
      ctx.setLineDash([0, gridSize]);
      ctx.strokeStyle = opts.gridLineColor;
      for (let y = startY; y < bottom; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(right, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = "butt";
    } else {
      for (let x = startX; x < right; x += gridSize) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
      }
      for (let y = startY; y < bottom; y += gridSize) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
      }
      ctx.lineWidth = opts.gridLineWidth;
      ctx.strokeStyle = opts.gridLineColor;
      ctx.stroke();
    }
  }

  function drawGhostEdge(offsetX: number, offsetY: number) {
    if (!ctx) return;
    if (!ghostEdge) return;
    const sourceNode = nodes[ghostEdge.sourceId];
    if (!sourceNode) return;

    const dx = ghostEdge.x - sourceNode.x;
    const dy = ghostEdge.y - sourceNode.y;
    const angle = Math.atan2(dy, dx);
    const arrowSize = 10;

    const lineStartX = sourceNode.x;
    const lineStartY = sourceNode.y;
    const lineEndX = ghostEdge.x - Math.cos(angle) * (arrowSize - 2);
    const lineEndY = ghostEdge.y - Math.sin(angle) * (arrowSize - 2);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(halfWidth, halfHeight);
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraX, -cameraY);

    ctx.beginPath();
    ctx.moveTo(lineStartX, lineStartY);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.strokeStyle = opts.selectedNodeLineColor;
    ctx.lineWidth = opts.selectedEdgeLineWidth;
    ctx.stroke();

    ctx.setTransform(
      zoom * dpr,
      0,
      0,
      zoom * dpr,
      (ghostEdge.x * zoom + offsetX) * dpr,
      (ghostEdge.y * zoom + offsetY) * dpr
    );
    ctx.rotate(angle);
    ctx.fillStyle = opts.selectedEdgeLineColor;
    ctx.fill(sharedArrowPath);
  }

  function resize() {
    if (!ctx || !canvas) return;
    dpr = window.devicePixelRatio || 1;
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
    ctx = canvas.getContext("2d");
    if (ctx) {
      if (!canvas.style.width) canvas.style.width = `${canvas.width}px`;
      if (!canvas.style.height) canvas.style.height = `${canvas.height}px`;
      resize();
    }
  }

  function addNode(x: number, y: number, shape: GraphShape): number {
    const nodeId = generateId();
    const node: GraphNode = {
      id: nodeId,
      x,
      y,
      shape,
      cells: [],
      incomingEdges: new Set(),
      outgoingEdges: new Set()
    };
    nodes[nodeId] = node;
    insertNodeToGrid(node);
    return nodeId;
  }

  function addEdge(
    sourceId: number,
    targetId: number,
    label?: GraphShape
  ): number {
    if (sourceId === targetId) return -1;
    const sourceNode = nodes[sourceId];
    if (!sourceNode || !nodes[targetId]) return -1;

    for (const edgeId of sourceNode.outgoingEdges) {
      if (edges[edgeId]?.target === targetId) return -1;
    }
    for (const edgeId of sourceNode.incomingEdges) {
      if (edges[edgeId]?.source === targetId) return -1;
    }

    const edgeId = generateId();
    const edge: GraphEdge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      line: { sx: 0, sy: 0, tx: 0, ty: 0, cells: [] },
      arrow: { x: 0, y: 0, angle: 0, cells: [] }
    };

    if (label) {
      edge.label = {
        shape: label,
        x: 0,
        y: 0,
        cells: []
      };
    }

    edges[edgeId] = edge;

    if (nodes[sourceId]) nodes[sourceId].outgoingEdges.add(edgeId);
    if (nodes[targetId]) nodes[targetId].incomingEdges.add(edgeId);

    updateEdgeGeometry(edgeId);

    return edgeId;
  }

  function moveNodeTo(id: number, x: number, y: number, skipGrid = false) {
    const node = nodes[id];
    if (!node) return;
    if (!skipGrid) removeNodeFromGrid(node);
    node.x = x;
    node.y = y;
    if (!skipGrid) insertNodeToGrid(node);

    for (const edgeId of node.incomingEdges)
      updateEdgeGeometry(edgeId, skipGrid);
    for (const edgeId of node.outgoingEdges)
      updateEdgeGeometry(edgeId, skipGrid);
  }
  function moveNodeBy(id: number, dx: number, dy: number, skipGrid = false) {
    const node = nodes[id];
    if (!node) return;
    if (!skipGrid) removeNodeFromGrid(node);
    node.x += dx;
    node.y += dy;
    if (!skipGrid) insertNodeToGrid(node);

    for (const edgeId of node.incomingEdges)
      updateEdgeGeometry(edgeId, skipGrid);
    for (const edgeId of node.outgoingEdges)
      updateEdgeGeometry(edgeId, skipGrid);
  }
  function updateNodeGrid(id: number) {
    const node = nodes[id];
    if (!node) return;
    removeNodeFromGrid(node);
    insertNodeToGrid(node);

    for (const edgeId of node.incomingEdges) updateEdgeGrid(edgeId);
    for (const edgeId of node.outgoingEdges) updateEdgeGrid(edgeId);
  }
  function updateEdgeGrid(edgeId: number) {
    const edge = edges[edgeId];
    if (!edge) return;
    removeEdgeFromGrid(edge);
    insertEdgeToGrid(edge);
  }
  function removeItem(id: number) {
    if (nodes[id]) removeNode(id);
    else if (edges[id]) removeEdge(id);
  }
  function removeNode(id: number) {
    const node = nodes[id];
    if (!node) return;
    // Copy sets to array to avoid mutation issues during iteration
    const incoming = Array.from(node.incomingEdges);
    for (const edgeId of incoming) removeEdge(edgeId);
    const outgoing = Array.from(node.outgoingEdges);
    for (const edgeId of outgoing) removeEdge(edgeId);

    removeNodeFromGrid(node);
    delete nodes[id];
    selectedItems.delete(id);
  }
  function removeEdge(id: number) {
    const edge = edges[id];
    if (!edge) return;

    removeFromGrid(edge.id, edge.line.cells);
    removeFromGrid(edge.id, edge.arrow.cells);
    if (edge.label) removeFromGrid(edge.id, edge.label.cells);

    const sourceNode = nodes[edge.source];
    if (sourceNode) sourceNode.outgoingEdges.delete(id);

    const targetNode = nodes[edge.target];
    if (targetNode) targetNode.incomingEdges.delete(id);

    removeEdgeFromGrid(edge);
    delete edges[id];
    selectedItems.delete(id);
  }

  function clear() {
    if (!ctx || !canvas) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = opts.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function unselect(ids?: number[]) {
    if (ids) {
      for (const id of ids) selectedItems.delete(id);
    } else {
      selectedItems.clear();
    }
  }
  function select(ids: number[]) {
    for (const id of ids) selectedItems.add(id);
  }
  function getSelectedItems() {
    return selectedItems;
  }
  function getItemAt(x: number, y: number): number | null {
    if (!ctx) return null;
    const cells = getCellsForBounds(x - 5, y - 5, x + 5, y + 5);
    const candidates = new Set<number>();
    const selectedCandidates = new Set<number>();

    for (const cell of cells) {
      const items = spatialGrid[cell];
      if (items) {
        for (const id of items) {
          if (selectedItems.has(id)) selectedCandidates.add(id);
          else candidates.add(id);
        }
      }
    }

    // Append selected candidates at the end so they are evaluated last (on top)
    for (const id of selectedCandidates) {
      candidates.add(id);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    let matchedNode: number | null = null;
    let matchedEdge: number | null = null;

    for (const id of candidates) {
      const node = nodes[id];
      if (node) {
        if (ctx.isPointInPath(node.shape.path, x - node.x, y - node.y)) {
          matchedNode = id;
        }
        continue;
      }

      const edge = edges[id];
      if (edge) {
        if (
          edge.label &&
          ctx.isPointInPath(
            edge.label.shape.path,
            x - edge.label.x,
            y - edge.label.y
          )
        ) {
          matchedEdge = id;
          continue;
        }

        const cos = Math.cos(-edge.arrow.angle);
        const sin = Math.sin(-edge.arrow.angle);
        const dx = x - edge.arrow.x;
        const dy = y - edge.arrow.y;
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        if (ctx.isPointInPath(sharedArrowPath, rx, ry)) {
          matchedEdge = id;
          continue;
        }

        const dist = pointToLineDistance(
          x,
          y,
          edge.line.sx,
          edge.line.sy,
          edge.line.tx,
          edge.line.ty
        );
        if (dist < 8) {
          matchedEdge = id;
        }
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (matchedNode !== null) return matchedNode;
    if (matchedEdge !== null) return matchedEdge;

    return null;
  }
  function zoomTo(value: number, targetX?: number, targetY?: number) {
    if (!canvas) return;
    const minZoom = opts.minZoom;
    const maxZoom = opts.maxZoom;

    const newZoom = Math.max(minZoom, Math.min(maxZoom, value));
    if (newZoom === zoom) return;

    const cx = targetX ?? halfWidth;
    const cy = targetY ?? halfHeight;

    const gx = (cx - halfWidth) / zoom + cameraX;
    const gy = (cy - halfHeight) / zoom + cameraY;

    zoom = newZoom;

    cameraX = gx - (cx - halfWidth) / zoom;
    cameraY = gy - (cy - halfHeight) / zoom;
  }
  function zoomBy(dv: number, targetX?: number, targetY?: number) {
    zoomTo(zoom + dv, targetX, targetY);
  }
  function panTo(x: number, y: number) {
    cameraX = x;
    cameraY = y;
  }
  function panBy(dx: number, dy: number) {
    cameraX -= dx / zoom;
    cameraY -= dy / zoom;
  }

  function screenToGraph(x: number, y: number): Pos {
    return {
      x: (x - halfWidth) / zoom + cameraX,
      y: (y - halfHeight) / zoom + cameraY
    };
  }
  function graphToScreen(x: number, y: number): Pos {
    return {
      x: (x - cameraX) * zoom + halfWidth,
      y: (y - cameraY) * zoom + halfHeight
    };
  }

  function setGhostEdge(sourceId: number | null, x?: number, y?: number) {
    if (sourceId === null || x === undefined || y === undefined) {
      ghostEdge = null;
    } else {
      ghostEdge = { sourceId, x, y };
    }
  }

  function flush() {
    if (isDirty) return;
    isDirty = true;

    requestAnimationFrame(() => {
      isDirty = false;
      if (!ctx || !canvas) return;
      clear();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(halfWidth, halfHeight);
      ctx.scale(zoom, zoom);
      ctx.translate(-cameraX, -cameraY);

      const left = -halfWidth / zoom + cameraX;
      const top = -halfHeight / zoom + cameraY;
      const right = halfWidth / zoom + cameraX;
      const bottom = halfHeight / zoom + cameraY;
      drawBackground(left, top, right, bottom);

      // Collect visible entities from the SHG,
      // arrange them into selected and unselected sets,
      // and draw them in the correct order.
      const visibleCells = getCellsForBounds(left, top, right, bottom);
      const visibleNodes = new Set<number>();
      const visibleEdges = new Set<number>();
      const visibleSelectedNodes = new Set<number>();
      const visibleSelectedEdges = new Set<number>();

      for (const cell of visibleCells) {
        if (spatialGrid[cell]) {
          for (const id of spatialGrid[cell]) {
            if (nodes[id]) {
              if (selectedItems.has(id)) visibleSelectedNodes.add(id);
              else visibleNodes.add(id);
            } else if (edges[id]) {
              if (selectedItems.has(id)) visibleSelectedEdges.add(id);
              else visibleEdges.add(id);
            }
          }
        }
      }

      for (const id of visibleSelectedNodes) visibleNodes.add(id);
      for (const id of visibleSelectedEdges) visibleEdges.add(id);

      // Calculate global transform offset
      const offsetX = halfWidth - cameraX * zoom;
      const offsetY = halfHeight - cameraY * zoom;

      // Draw Edges (behind nodes)
      ctx.font = opts.edgeFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Unselected Edges
      for (const edgeId of visibleEdges) {
        drawEdge(edgeId, offsetX, offsetY);
      }

      ctx.font = opts.nodeFont;
      ctx.fillStyle = opts.nodeShapeColor;
      // Unselected Nodes (EXCEPT ghost edge source node)
      for (const nodeId of visibleNodes) {
        if (ghostEdge && nodeId === ghostEdge.sourceId) continue;
        drawNode(nodeId, offsetX, offsetY);
      }

      // Draw ghost edge
      drawGhostEdge(offsetX, offsetY);

      // Draw the ghost edge source node on top
      if (ghostEdge && visibleNodes.has(ghostEdge.sourceId)) {
        ctx.fillStyle = opts.nodeShapeColor;
        drawNode(ghostEdge.sourceId, offsetX, offsetY);
      }

      // Reset to base transform so any outside context usage is unaffected
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }

  return {
    nodes,
    edges,
    resize,
    mount,
    getZoom: () => zoom,
    addNode,
    addEdge,
    moveNodeTo,
    moveNodeBy,
    updateNodeGrid,
    updateEdgeGrid,
    removeItem,
    removeNode,
    removeEdge,
    clear,
    unselect,
    select,
    getSelectedItems,
    getItemAt,
    zoomTo,
    zoomBy,
    panTo,
    panBy,
    screenToGraph,
    graphToScreen,
    setGhostEdge,
    flush
  };
}

const sharedArrowPath = new Path2D();
sharedArrowPath.moveTo(0, 0);
sharedArrowPath.lineTo(-10, -5);
sharedArrowPath.lineTo(-10, 5);
sharedArrowPath.closePath();

const defaultPath = new Path2D();
defaultPath.roundRect(-50, -25, 100, 50, 8);

export const defaultShape: GraphShape = {
  w: 100,
  h: 50,
  path: defaultPath,
  draw: (ctx, path, id) => {
    ctx.fill(path);
    ctx.stroke(path);

    ctx.fillStyle = "#475569";
    ctx.fillText(`Node ${id}`, 0, 0);
  }
};

export function createShape(shape: Partial<GraphShape> = {}): GraphShape {
  return {
    ...defaultShape,
    ...shape
  };
}

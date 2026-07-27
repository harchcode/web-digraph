/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  GraphRenderer,
  GraphShape,
  GraphNode,
  GraphEdge,
  Pos,
  GraphOptions
} from "./types.js";

export * from "./types.js";

let nextId = 1;
function generateId(): number {
  return nextId++;
}

export const defaultGraphOptions: GraphOptions = {
  drawGrid: true,
  gridSize: 50,
  shgCellSize: 500
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

  const getCellsForBounds = (
    left: number,
    top: number,
    right: number,
    bottom: number
  ): string[] => {
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
  };

  const getCellsForLine = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    thickness: number
  ): string[] => {
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
  };

  function getBoundaryIntersection(
    path: Path2D,
    cx: number,
    cy: number,
    ox: number,
    oy: number
  ): Pos {
    const dx = ox - cx;
    const dy = oy - cy;
    const e = (Math.abs(dx) + Math.abs(dy)) | 0;

    if (e === 0) return { x: cx, y: cy };

    let start = 0;
    let end = e;

    while (start <= end) {
      const mid = ((start + end) / 2) | 0;
      const px = cx + (mid / e) * dx;
      const py = cy + (mid / e) * dy;

      ctx!.save();
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      const isInside = ctx!.isPointInPath(path, px - cx, py - cy);
      ctx!.restore();

      if (isInside) {
        // Inside the shape, so boundary is further towards source (ox, oy)
        start = mid + 1;
      } else {
        // Outside the shape, so boundary is further towards target (cx, cy)
        end = mid - 1;
      }
    }

    const finalT = start / e;
    return { x: cx + finalT * dx, y: cy + finalT * dy };
  }

  const insertToGrid = (id: number, cells: string[]) => {
    for (const cell of cells) {
      if (!spatialGrid[cell]) spatialGrid[cell] = new Set();
      spatialGrid[cell].add(id);
    }
  };

  const removeFromGrid = (id: number, cells: string[]) => {
    if (!cells) return;
    for (const cell of cells) {
      spatialGrid[cell]?.delete(id);
      if (spatialGrid[cell]?.size === 0) delete spatialGrid[cell];
    }
  };

  const insertNodeToGrid = (node: GraphNode) => {
    const left = node.x - node.shape.w / 2;
    const right = node.x + node.shape.w / 2;
    const top = node.y - node.shape.h / 2;
    const bottom = node.y + node.shape.h / 2;
    node.cells = getCellsForBounds(left, top, right, bottom);
    insertToGrid(node.id, node.cells);
  };

  const removeNodeFromGrid = (node: GraphNode) => {
    removeFromGrid(node.id, node.cells);
    node.cells = [];
  };

  function updateEdgeGeometry(edgeId: number) {
    const edge = edges[edgeId];
    if (!edge) return;
    const sourceNode = nodes[edge.source];
    const targetNode = nodes[edge.target];
    if (!sourceNode || !targetNode) return;

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

    removeFromGrid(edge.id, edge.line.cells);
    removeFromGrid(edge.id, edge.arrow.cells);
    if (edge.label) removeFromGrid(edge.id, edge.label.cells);

    const lineEndX = targetIntersection.x - Math.cos(angle) * (arrowSize - 2);
    const lineEndY = targetIntersection.y - Math.sin(angle) * (arrowSize - 2);

    edge.line.sx = sourceNode.x;
    edge.line.sy = sourceNode.y;
    edge.line.tx = lineEndX;
    edge.line.ty = lineEndY;

    edge.line.cells = getCellsForLine(
      edge.line.sx,
      edge.line.sy,
      edge.line.tx,
      edge.line.ty,
      4
    );
    insertToGrid(edge.id, edge.line.cells);

    edge.arrow.x = targetIntersection.x;
    edge.arrow.y = targetIntersection.y;
    edge.arrow.angle = angle;

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
      // Use dead centers of nodes, shifted back by half the arrow height to remain centered
      edge.label.x =
        (sourceNode.x + targetNode.x) / 2 - Math.cos(angle) * (arrowSize / 2);
      edge.label.y =
        (sourceNode.y + targetNode.y) / 2 - Math.sin(angle) * (arrowSize / 2);

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

  return {
    nodes,
    edges,

    resize() {
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
        this.flush();
      }
    },

    mount(el: HTMLCanvasElement) {
      canvas = el;
      ctx = canvas.getContext("2d");
      if (ctx) {
        if (!canvas.style.width) canvas.style.width = `${canvas.width}px`;
        if (!canvas.style.height) canvas.style.height = `${canvas.height}px`;
        this.resize();
        window.addEventListener("resize", () => this.resize());
      }
    },

    addNode(x: number, y: number, shape: GraphShape): number {
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
    },

    addEdge(sourceId: number, targetId: number, label?: GraphShape): number {
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
    },

    moveNodeTo(id: number, x: number, y: number) {
      const node = nodes[id];
      if (!node) return;
      removeNodeFromGrid(node);
      node.x = x;
      node.y = y;
      insertNodeToGrid(node);

      for (const edgeId of node.incomingEdges) updateEdgeGeometry(edgeId);
      for (const edgeId of node.outgoingEdges) updateEdgeGeometry(edgeId);
    },
    moveNodeBy(id: number, dx: number, dy: number) {
      const node = nodes[id];
      if (!node) return;
      removeNodeFromGrid(node);
      node.x += dx;
      node.y += dy;
      insertNodeToGrid(node);

      for (const edgeId of node.incomingEdges) updateEdgeGeometry(edgeId);
      for (const edgeId of node.outgoingEdges) updateEdgeGeometry(edgeId);
    },
    removeItem(_id: number) {},
    removeNode(id: number) {
      const node = nodes[id];
      if (!node) return;
      removeNodeFromGrid(node);
      delete nodes[id];
    },
    removeEdge(_id: number) {},

    clear() {
      if (!ctx || !canvas) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    },

    unselect(_ids?: number[]) {},
    select(_ids: number[]) {},
    zoomTo(value: number, targetX?: number, targetY?: number) {
      if (!canvas) return;
      const minZoom = 0.1;
      const maxZoom = 5.0;

      const newZoom = Math.max(minZoom, Math.min(maxZoom, value));
      if (newZoom === zoom) return;

      const cx = targetX ?? halfWidth;
      const cy = targetY ?? halfHeight;

      const gx = (cx - halfWidth) / zoom + cameraX;
      const gy = (cy - halfHeight) / zoom + cameraY;

      zoom = newZoom;

      cameraX = gx - (cx - halfWidth) / zoom;
      cameraY = gy - (cy - halfHeight) / zoom;
    },
    zoomBy(dv: number, targetX?: number, targetY?: number) {
      this.zoomTo(zoom + dv, targetX, targetY);
    },
    panTo(x: number, y: number) {
      cameraX = x;
      cameraY = y;
    },
    panBy(dx: number, dy: number) {
      cameraX -= dx / zoom;
      cameraY -= dy / zoom;
    },

    screenToGraph(x: number, y: number): Pos {
      return {
        x: (x - halfWidth) / zoom + cameraX,
        y: (y - halfHeight) / zoom + cameraY
      };
    },
    graphToScreen(x: number, y: number): Pos {
      return {
        x: (x - cameraX) * zoom + halfWidth,
        y: (y - cameraY) * zoom + halfHeight
      };
    },

    flush() {
      if (isDirty) return;
      isDirty = true;

      requestAnimationFrame(() => {
        isDirty = false;
        if (!ctx || !canvas) return;
        this.clear();

        ctx.save();

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(halfWidth, halfHeight);
        ctx.scale(zoom, zoom);
        ctx.translate(-cameraX, -cameraY);

        const left = -halfWidth / zoom + cameraX;
        const top = -halfHeight / zoom + cameraY;
        const right = halfWidth / zoom + cameraX;
        const bottom = halfHeight / zoom + cameraY;
        const gridSize = opts.gridSize;

        if (opts.drawGrid && gridSize * zoom >= 10) {
          const startX = Math.floor(left / gridSize) * gridSize;
          const startY = Math.floor(top / gridSize) * gridSize;

          ctx.beginPath();
          for (let x = startX; x < right; x += gridSize) {
            ctx.moveTo(x, top);
            ctx.lineTo(x, bottom);
          }
          for (let y = startY; y < bottom; y += gridSize) {
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
          }

          ctx.lineWidth = 1;
          ctx.strokeStyle = "#e8e8e8";
          ctx.stroke();
        }

        // Collect visible entities from the SHG
        const visibleCells = getCellsForBounds(left, top, right, bottom);
        const visibleNodes = new Set<number>();
        const visibleEdges = new Set<number>();
        for (const cell of visibleCells) {
          if (spatialGrid[cell]) {
            for (const id of spatialGrid[cell]) {
              if (nodes[id]) visibleNodes.add(id);
              else if (edges[id]) visibleEdges.add(id);
            }
          }
        }

        // Calculate global transform offset
        const offsetX = halfWidth - cameraX * zoom;
        const offsetY = halfHeight - cameraY * zoom;

        // Draw Edges (behind nodes)
        ctx.strokeStyle = "#999999";
        ctx.fillStyle = "#999999";
        ctx.lineWidth = 2;
        ctx.font = "500 14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 1. Batch draw all edge lines
        ctx.beginPath();
        for (const edgeId of visibleEdges) {
          const edge = edges[edgeId];
          ctx.moveTo(edge.line.sx, edge.line.sy);
          ctx.lineTo(edge.line.tx, edge.line.ty);
        }
        ctx.stroke();

        // 2. Draw Arrows and Labels
        for (const edgeId of visibleEdges) {
          const edge = edges[edgeId];

          ctx.setTransform(
            zoom * dpr,
            0,
            0,
            zoom * dpr,
            (edge.arrow.x * zoom + offsetX) * dpr,
            (edge.arrow.y * zoom + offsetY) * dpr
          );
          ctx.rotate(edge.arrow.angle);
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
            edge.label.shape.draw(ctx, edge.label.shape.path, edge.id);
          }
        }

        // Set default styles for all nodes
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 2;

        // Draw visible nodes
        for (const nodeId of visibleNodes) {
          const node = nodes[nodeId];
          ctx.setTransform(
            zoom * dpr,
            0,
            0,
            zoom * dpr,
            (node.x * zoom + offsetX) * dpr,
            (node.y * zoom + offsetY) * dpr
          );
          node.shape.draw(ctx, node.shape.path, node.id);
        }

        ctx.restore();
      });
    },

    beginDragNode(_id: number) {},
    endDragNode(): Pos {
      return { x: 0, y: 0 };
    },
    beginDragEdge(_sourceId: number) {},
    endDragEdge(): number | undefined {
      return undefined;
    }
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
    ctx.save();
    ctx.fill(path);
    ctx.stroke(path);

    ctx.fillStyle = "#333333";
    ctx.fillText(`Node ${id}`, 0, 0);
    ctx.restore();
  }
};

export function createShape(shape: Partial<GraphShape> = {}): GraphShape {
  return {
    ...defaultShape,
    ...shape
  };
}

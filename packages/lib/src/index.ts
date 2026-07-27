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

      const sx = ((px - cameraX) * zoom + halfWidth) * dpr;
      const sy = ((py - cameraY) * zoom + halfHeight) * dpr;

      if (ctx!.isPointInPath(path, sx, sy)) {
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

  const insertNodeToGrid = (node: GraphNode) => {
    const left = node.x - node.shape.w / 2;
    const right = node.x + node.shape.w / 2;
    const top = node.y - node.shape.h / 2;
    const bottom = node.y + node.shape.h / 2;
    node.cells = getCellsForBounds(left, top, right, bottom);
    for (const cell of node.cells) {
      if (!spatialGrid[cell]) spatialGrid[cell] = new Set();
      spatialGrid[cell].add(node.id);
    }
  };

  const removeNodeFromGrid = (node: GraphNode) => {
    if (!node.cells) return;
    for (const cell of node.cells) {
      spatialGrid[cell]?.delete(node.id);
      if (spatialGrid[cell]?.size === 0) delete spatialGrid[cell];
    }
    node.cells = [];
  };

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
      const path = shape.createPath(x, y, shape.w, shape.h, nodeId);
      const node: GraphNode = { id: nodeId, x, y, shape, path, cells: [] };
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
        arrow: { x: 0, y: 0, cells: [] }
      };

      if (label) {
        edge.label = {
          shape: label,
          path: new Path2D(),
          x: 0,
          y: 0,
          cells: []
        };
      }

      edges[edgeId] = edge;
      return edgeId;
    },

    moveNodeTo(id: number, x: number, y: number) {
      const node = nodes[id];
      if (!node) return;
      removeNodeFromGrid(node);
      node.x = x;
      node.y = y;
      node.path = node.shape.createPath(
        node.x,
        node.y,
        node.shape.w,
        node.shape.h,
        node.id
      );
      insertNodeToGrid(node);
    },
    moveNodeBy(id: number, dx: number, dy: number) {
      const node = nodes[id];
      if (!node) return;
      removeNodeFromGrid(node);
      node.x += dx;
      node.y += dy;
      node.path = node.shape.createPath(
        node.x,
        node.y,
        node.shape.w,
        node.shape.h,
        node.id
      );
      insertNodeToGrid(node);
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
      ctx.resetTransform();
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

        // Collect visible nodes from the SHG
        const visibleCells = getCellsForBounds(left, top, right, bottom);
        const visibleNodes = new Set<number>();
        for (const cell of visibleCells) {
          if (spatialGrid[cell]) {
            for (const id of spatialGrid[cell]) {
              visibleNodes.add(id);
            }
          }
        }

        // Draw Edges (behind nodes)
        ctx.strokeStyle = "#999999";
        ctx.fillStyle = "#999999";
        ctx.lineWidth = 2;

        for (const edgeId in edges) {
          const edge = edges[edgeId];
          const sourceNode = nodes[edge.source];
          const targetNode = nodes[edge.target];
          if (!sourceNode || !targetNode) continue;

          // Simple AABB viewport culling for edges
          const minX = Math.min(sourceNode.x, targetNode.x);
          const maxX = Math.max(sourceNode.x, targetNode.x);
          const minY = Math.min(sourceNode.y, targetNode.y);
          const maxY = Math.max(sourceNode.y, targetNode.y);

          if (
            maxX < left - 100 ||
            minX > right + 100 ||
            maxY < top - 100 ||
            minY > bottom + 100
          ) {
            continue;
          }

          const targetIntersection = getBoundaryIntersection(
            targetNode.path,
            targetNode.x,
            targetNode.y,
            sourceNode.x,
            sourceNode.y
          );

          // Arrowhead math
          const dx = targetIntersection.x - sourceNode.x;
          const dy = targetIntersection.y - sourceNode.y;
          const angle = Math.atan2(dy, dx);
          const arrowSize = 10;

          // Draw Line (pull it back slightly so the thick line doesn't poke through the sharp arrow tip)
          const lineEndX =
            targetIntersection.x - Math.cos(angle) * (arrowSize - 2);
          const lineEndY =
            targetIntersection.y - Math.sin(angle) * (arrowSize - 2);

          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(lineEndX, lineEndY);
          ctx.stroke();

          ctx.save();
          ctx.translate(targetIntersection.x, targetIntersection.y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-arrowSize, -arrowSize / 2);
          ctx.lineTo(-arrowSize, arrowSize / 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Set default styles for all nodes
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 2;
        ctx.font = "500 14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Draw visible nodes
        for (const nodeId of visibleNodes) {
          const node = nodes[nodeId];
          node.shape.draw(
            ctx,
            node.x,
            node.y,
            node.shape.w,
            node.shape.h,
            node.path,
            node.id
          );
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

export const defaultShape: GraphShape = {
  w: 100,
  h: 50,
  createPath: (x, y, w, h, _id) => {
    const path = new Path2D();
    const left = x - w / 2;
    const top = y - h / 2;
    path.roundRect(left, top, w, h, 8);

    return path;
  },
  draw: (ctx, x, y, _w, _h, path, id) => {
    ctx.save();
    ctx.fill(path);
    ctx.stroke(path);

    ctx.fillStyle = "#333333";
    ctx.fillText(`Node ${id}`, x, y);
    ctx.restore();
  }
};

export function createShape(shape: Partial<GraphShape> = {}): GraphShape {
  return {
    ...defaultShape,
    ...shape
  };
}

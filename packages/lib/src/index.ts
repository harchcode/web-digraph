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

export function createGraphRenderer(options?: GraphOptions): GraphRenderer {
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

  const spatialGrid: Record<string, Set<number>> = {};
  const shgCellSize = options?.shgCellSize ?? 500;

  const getCellsForBounds = (
    left: number,
    top: number,
    right: number,
    bottom: number
  ): string[] => {
    const cells: string[] = [];
    const minX = Math.floor(left / shgCellSize);
    const maxX = Math.floor(right / shgCellSize);
    const minY = Math.floor(top / shgCellSize);
    const maxY = Math.floor(bottom / shgCellSize);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.push(`${x},${y}`);
      }
    }
    return cells;
  };

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
      const dpr = window.devicePixelRatio || 1;
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
      const node: GraphNode = { id: nodeId, x, y, shape };
      nodes[nodeId] = node;
      insertNodeToGrid(node);
      return nodeId;
    },

    addEdge(sourceId: number, targetId: number, shape: GraphShape): number {
      const edgeId = generateId();
      edges[edgeId] = {
        id: edgeId,
        source: sourceId,
        target: targetId,
        shape
      };
      return edgeId;
    },

    moveNodeTo(id: number, x: number, y: number) {
      const node = nodes[id];
      if (!node) return;
      removeNodeFromGrid(node);
      node.x = x;
      node.y = y;
      insertNodeToGrid(node);
    },
    moveNodeBy(id: number, dx: number, dy: number) {
      const node = nodes[id];
      if (!node) return;
      removeNodeFromGrid(node);
      node.x += dx;
      node.y += dy;
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

        if (options?.drawGrid) {
          let gridSize = options.gridSize ?? 50;
          const minPhysicalGridSize = 10;
          while (gridSize * zoom < minPhysicalGridSize) {
            gridSize *= 2;
          }
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

        // Draw visible nodes
        for (const nodeId of visibleNodes) {
          const node = nodes[nodeId];
          node.shape.drawContent(
            ctx,
            node.x,
            node.y,
            node.shape.w,
            node.shape.h,
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

export function createShape(shape?: Partial<GraphShape>): GraphShape {
  return {
    w: shape?.w ?? 100,
    h: shape?.h ?? 50,
    drawContent:
      shape?.drawContent ??
      ((ctx, x, y, w, h, id) => {
        const left = x - w / 2;
        const top = y - h / 2;

        ctx.save();

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(left, top, w, h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#333333";
        ctx.font = "500 14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`Node ${id}`, x, y);

        ctx.restore();
      }),
    createPath: shape?.createPath
  };
}

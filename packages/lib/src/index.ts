/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
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

  return {
    nodes,
    edges,

    resize() {
      if (!ctx || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const logicalWidth = rect.width;
      const logicalHeight = rect.height;

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
      nodes[nodeId] = {
        id: nodeId,
        x,
        y,
        shape
      };
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

    moveNodeTo(_id: number, _x: number, _y: number) {},
    moveNodeBy(_id: number, _dx: number, _dy: number) {},
    removeItem(_id: number) {},
    removeNode(_id: number) {},
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

      const cx = targetX ?? canvas.getBoundingClientRect().width / 2;
      const cy = targetY ?? canvas.getBoundingClientRect().height / 2;

      const gx = (cx - cameraX) / zoom;
      const gy = (cy - cameraY) / zoom;

      zoom = newZoom;

      cameraX = cx - gx * zoom;
      cameraY = cy - gy * zoom;
    },
    zoomBy(dv: number, targetX?: number, targetY?: number) {
      this.zoomTo(zoom + dv, targetX, targetY);
    },
    panTo(x: number, y: number) {
      cameraX = x;
      cameraY = y;
    },
    panBy(dx: number, dy: number) {
      cameraX += dx;
      cameraY += dy;
    },

    screenToGraph(x: number, y: number): Pos {
      return { x: (x - cameraX) / zoom, y: (y - cameraY) / zoom };
    },
    graphToScreen(x: number, y: number): Pos {
      return { x: x * zoom + cameraX, y: y * zoom + cameraY };
    },

    flush() {
      if (!ctx || !canvas) return;
      this.clear();

      ctx.save();
      ctx.translate(cameraX, cameraY);
      ctx.scale(zoom, zoom);

      if (options?.drawGrid) {
        const gridSize = options.gridSize ?? 50;
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;

        const left = -cameraX / zoom;
        const top = -cameraY / zoom;
        const right = left + logicalWidth / zoom;
        const bottom = top + logicalHeight / zoom;

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

        ctx.lineWidth = 1 / zoom;
        ctx.strokeStyle = "#e8e8e8";
        ctx.stroke();
      }

      // Draw all nodes
      for (const nodeId in nodes) {
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
        // Default rendering: a rounded rectangle with a shadow and text
        ctx.save();

        // Treat x,y as the center of the node
        const left = x - w / 2;
        const top = y - h / 2;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;

        ctx.beginPath();
        ctx.roundRect(left, top, w, h, 8);
        ctx.fill();
        ctx.stroke();

        // Reset shadow before drawing text so text isn't blurry
        ctx.shadowColor = "transparent";

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

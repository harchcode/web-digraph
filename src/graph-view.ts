import { drawBackground } from "./graph-renderer";

export type NodeShape = {
  render: (ctx: CanvasRenderingContext2D) => void;
  intersectionPoints: [number, number][];
};

export type EdgeShape = {
  render: (ctx: CanvasRenderingContext2D) => void;
};

export type GraphNode = {
  x: number;
  y: number;
  shape: EdgeShape;
};

export type GraphEdge = {
  source: GraphNode;
  target: GraphNode;
  shape: NodeShape;
};

export class GraphView<Node extends GraphNode, Edge extends GraphEdge> {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  transform: [number, number, number] = [1, 0, 0]; // [scale, tx, ty]
  nodes: Node[] = [];
  edges: Edge[] = [];
  hoveredNode: Node | undefined = undefined;
  hoveredEdge: Edge | undefined = undefined;
  pointerPos: [number, number] = [0, 0];
  movingNode: Node | undefined = undefined;
  moveNodePos: [number, number] = [0, 0];
  isCreatingEdge = false;
  dragLineSourceNode: Node | undefined = undefined;
  dragLineTargetPos: [number, number] = [0, 0];

  private isDrawing = false;
  private boundingRect: DOMRect;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement("canvas");

    const ctx = this.canvas.getContext("2d", { alpha: false });

    if (!ctx) {
      throw "Canvas is not supported in your browser.";
    }

    this.ctx = ctx;

    this.canvas.textContent = "Canvas is not supported in your browser.";
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.boundingRect = this.canvas.getBoundingClientRect();

    container.appendChild(this.canvas);

    this.requestDraw();
  }

  destroy(): void {
    // this._eventHandler.destroy();
  }

  requestDraw(): void {
    if (!this.isDrawing) {
      requestAnimationFrame(this.draw);
    }

    this.isDrawing = true;
  }

  draw = () => {
    this.isDrawing = false;

    drawBackground(this);
  };

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    this.boundingRect = this.canvas.getBoundingClientRect();

    this.requestDraw();
  }

  zoomTo(value: number, viewX?: number, viewY?: number): void {
    const { width, height } = this.canvas;
    const [scale, translateX, translateY] = this.transform;

    viewX = viewX || (width * 0.5 - translateX) / scale;
    viewY = viewY || (height * 0.5 - translateY) / scale;

    const newScale = Math.min(1000.0, Math.max(0.1, value));

    const deltaScale = newScale - scale;
    const offsetX = -(viewX * deltaScale);
    const offsetY = -(viewY * deltaScale);

    this.transform[0] += deltaScale;
    this.transform[1] += offsetX;
    this.transform[2] += offsetY;

    this.requestDraw();
  }

  setViewPosFromWindowPos(
    out: [number, number],
    windowX: number,
    windowY: number
  ) {
    const { left, top } = this.boundingRect;
    const [scale, translateX, translateY] = this.transform;

    out[0] = (windowX - left - translateX) / scale;
    out[1] = (windowY - top - translateY) / scale;
  }

  setViewPosFromCanvasPos(
    out: [number, number],
    canvasX: number,
    canvasY: number
  ) {
    const [scale, translateX, translateY] = this.transform;

    out[0] = (canvasX - translateX) / scale;
    out[1] = (canvasY - translateY) / scale;
  }
}

export function createGraphView<Node extends GraphNode, Edge extends GraphEdge>(
  container: HTMLElement
) {
  return new GraphView<Node, Edge>(container);
}

import { GraphRenderer } from "./graph-renderer";

export type GraphShape = {
  paths?: Path2D[];
  render?: <Node extends GraphNode, Edge extends GraphEdge>(
    ctx: CanvasRenderingContext2D,
    nodeOrEdge: Node | Edge,
    isHovered: boolean
  ) => void;
  size: [number, number];
};

export type NodeShape = {
  paths?: Path2D[];
  render?: <Node extends GraphNode>(
    ctx: CanvasRenderingContext2D,
    node: Node,
    isHovered: boolean
  ) => void;
  setIntersectionPoint: <Node extends GraphNode>(
    out: [number, number],
    self: Node,
    other: Node
  ) => void;
  size: [number, number];
};

export type EdgeShape = {
  paths?: Path2D[];
  render?: <Edge extends GraphEdge>(
    ctx: CanvasRenderingContext2D,
    edge: Edge,
    isHovered: boolean
  ) => void;
  size: [number, number];
};

export type GraphNode = {
  x: number;
  y: number;
  shape: NodeShape;
};

export type GraphEdge = {
  source: GraphNode;
  target: GraphNode;
  shape: EdgeShape;
};

// const FPS = 60;
// const MPF = 1000 / FPS;
// const SPF = MPF * 0.001;

export class GraphView<Node extends GraphNode, Edge extends GraphEdge> {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  transform: [number, number, number] = [1, 0, 0]; // [scale, tx, ty]
  nodes: Node[];
  edges: Edge[];
  hoveredNode: Node | undefined = undefined;
  hoveredEdge: Edge | undefined = undefined;
  pointerPos: [number, number] = [0, 0];
  movingNode: Node | undefined = undefined;
  isCreatingEdge = false;
  dragLineSourcePos: [number, number] = [0, 0];

  private isDrawing = false;
  private boundingRect: DOMRect;
  private renderer: GraphRenderer<Node, Edge>;
  // private viewMoveTarget: [number, number] = [0, 0];

  // private startTime = 0;
  // private lastTime = 0;
  // private counter = 0;

  constructor(container: HTMLElement, nodes: Node[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;

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

    window.addEventListener("mousemove", this.handleMouseMove, {
      passive: true
    });

    this.renderer = new GraphRenderer(this);
    this.startDraw();
  }

  destroy = () => {
    window.removeEventListener("mousemove", this.handleMouseMove);
  };

  private handleMouseMove = (e: MouseEvent) => {
    this.pointerPos[0] = e.x;
    this.pointerPos[1] = e.y;
  };

  private requestDrawHandler = () => {
    this.isDrawing = false;
    this.draw();
  };

  requestDraw() {
    if (!this.isDrawing) {
      requestAnimationFrame(this.requestDrawHandler);
    }

    this.isDrawing = true;
  }

  // private update = (dt: number) => {
  //   const sx = this.viewMoveTarget[0] - this.transform[1];
  //   const sy = this.viewMoveTarget[1] - this.transform[2];

  //   const vx = sx;
  //   const vy = sy;

  //   this.transform[1] += vx * dt;
  //   this.transform[2] += vy * dt;

  //   if (
  //     this.transform[1] >= this.viewMoveTarget[0] &&
  //     this.transform[2] >= this.viewMoveTarget[1]
  //   ) {
  //     this.isMovingView = false;
  //   }
  // };

  // private run = (timestamp: number) => {
  //   const current = timestamp;
  //   const dt = current - this.lastTime;

  //   this.counter += dt;
  //   this.lastTime = current;

  //   while (this.counter > MPF) {
  //     this.update(SPF);

  //     this.counter -= MPF;
  //   }

  //   this.draw();

  //   requestAnimationFrame(this.run);
  // };

  // startDraw = () => {
  //   requestAnimationFrame(timestamp => {
  //     this.startTime = timestamp;
  //     this.lastTime = this.startTime;

  //     requestAnimationFrame(this.run);
  //   });
  // };

  startDraw = () => {
    requestAnimationFrame(this.startDraw);

    this.draw();
  };

  draw = () => {
    this.renderer.draw();
  };

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    this.boundingRect = this.canvas.getBoundingClientRect();
  }

  moveBy(x: number, y: number) {
    this.moveTo(this.transform[1] + x, this.transform[2] + y);
    // this.viewMoveTarget[0] += x;
    // this.viewMoveTarget[1] += y;
  }

  moveTo(x: number, y: number) {
    this.transform[1] = x;
    this.transform[2] = y;
    // this.viewMoveTarget[0] = x;
    // this.viewMoveTarget[1] = y;
  }

  zoomBy(value: number, viewX?: number, viewY?: number) {
    this.zoomTo(this.transform[0] + value, viewX, viewY);
  }

  zoomTo(value: number, viewX?: number, viewY?: number) {
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
  }

  beginDragLine(x: number, y: number) {
    this.isCreatingEdge = true;
    this.dragLineSourcePos[0] = x;
    this.dragLineSourcePos[1] = y;
  }

  endDragLine() {
    this.isCreatingEdge = false;
  }

  beginMoveNode(node: Node) {
    this.movingNode = node;
  }

  endMoveNode() {
    this.movingNode = undefined;
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

  getViewPosFromWindowPos(windowX: number, windowY: number) {
    const { left, top } = this.boundingRect;
    const [scale, translateX, translateY] = this.transform;

    return [
      (windowX - left - translateX) / scale,
      (windowY - top - translateY) / scale
    ];
  }

  getViewPosFromCanvasPos(canvasX: number, canvasY: number) {
    const [scale, translateX, translateY] = this.transform;

    return [(canvasX - translateX) / scale, (canvasY - translateY) / scale];
  }

  setCanvasPosFromWindowPos(
    out: [number, number],
    windowX: number,
    windowY: number
  ) {
    const { left, top } = this.boundingRect;

    out[0] = windowX - left;
    out[1] = windowY - top;
  }

  getCanvasPosFromWindowPos(windowX: number, windowY: number) {
    const { left, top } = this.boundingRect;

    return [windowX - left, windowY - top];
  }
}

export function createGraphView<Node extends GraphNode, Edge extends GraphEdge>(
  container: HTMLElement,
  nodes: Node[],
  edges: Edge[]
) {
  return new GraphView<Node, Edge>(container, nodes, edges);
}

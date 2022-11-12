import { defaultGraphOptions, GraphOptions } from "./utils";

const SIN_60 = Math.sin(Math.PI / 3);

export type GraphNode = {
  x: number;
  y: number;
  // shape: NodeShape;
};

export type GraphEdge = {
  source: GraphNode;
  target: GraphNode;
  // shape: EdgeShape;
};

export class GraphView<Node extends GraphNode, Edge extends GraphEdge> {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  private nodes: Node[] = [];
  private edges: Edge[] = [];

  private translateX = 0;
  private translateY = 0;
  private scale = 1;

  private viewX = 0;
  private viewY = 0;
  private viewW = 0;
  private viewH = 0;
  private boundingRect: DOMRect;

  private isDrawing = false;
  private options = defaultGraphOptions;

  constructor(container: HTMLElement, options: Partial<GraphOptions> = {}) {
    this.options = {
      ...this.options,
      ...options
    };

    this.canvas = document.createElement("canvas");
    this.canvas.textContent = "Canvas is not supported in your browser.";
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.boundingRect = this.canvas.getBoundingClientRect();

    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw "Canvas is not supported in your browser.";
    }

    this.ctx = ctx;

    this.requestDraw();

    container.appendChild(this.canvas);
  }

  setData(nodes: Node[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;

    this.requestDraw();
  }

  getTranslateX() {
    return this.translateX;
  }

  setTranslateX(v: number) {
    if (v === this.translateX) return;

    this.translateX = v;
    this.requestDraw();
  }

  getTranslateY() {
    return this.translateY;
  }

  setTranslateY(v: number) {
    if (v === this.translateY) return;

    this.translateY = v;
    this.requestDraw();
  }

  getScale() {
    return this.scale;
  }

  setScale(v: number) {
    if (v === this.scale) return;

    this.scale = v;
    this.requestDraw();
  }

  setTransform(translateX: number, translateY: number, scale: number) {
    if (
      translateX === this.translateX &&
      translateY === this.translateY &&
      scale === this.scale
    )
      return;

    this.translateX = translateX;
    this.translateY = translateY;
    this.scale = scale;

    this.requestDraw();
  }

  moveBy(x: number, y: number) {
    this.translateX += x;
    this.translateY += y;

    this.requestDraw();
  }

  zoomBy(value: number, targetX?: number, targetY?: number) {
    this.zoomTo(this.scale + value, targetX, targetY);
  }

  zoomTo(value: number, targetX?: number, targetY?: number) {
    const { scale, translateX, translateY, options } = this;
    const { width, height } = this.canvas;

    targetX = targetX || (width * 0.5 - translateX) / scale;
    targetY = targetY || (height * 0.5 - translateY) / scale;

    const newScale = Math.min(
      options.maxScale,
      Math.max(options.minScale, value)
    );

    const deltaScale = newScale - scale;
    const offsetX = -(targetX * deltaScale);
    const offsetY = -(targetY * deltaScale);

    this.scale += deltaScale;
    this.translateX += offsetX;
    this.translateY += offsetY;

    this.requestDraw();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    this.boundingRect = this.canvas.getBoundingClientRect();

    this.requestDraw();
  }

  private requestDraw() {
    if (!this.isDrawing) {
      requestAnimationFrame(this.requestDrawHandler);
    }

    this.isDrawing = true;
  }

  private requestDrawHandler = () => {
    this.isDrawing = false;
    this.draw();
  };

  private setView() {
    const { canvas, translateX, translateY, scale } = this;

    this.viewX = -translateX / scale;
    this.viewY = -translateY / scale;
    this.viewW = canvas.width / scale;
    this.viewH = canvas.height / scale;
  }

  private draw() {
    const {
      ctx,
      canvas,
      scale,
      translateX,
      translateY,
      options,
      nodes,
      edges
    } = this;

    ctx.fillStyle = options.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(scale, 0, 0, scale, translateX, translateY);

    this.setView();

    if (options.bgShowDots) this.drawBackground();

    ctx.strokeStyle = options.edgeLineColor;
    ctx.fillStyle = options.edgeLineColor;
    ctx.lineWidth = options.edgeLineWidth;

    for (const edge of edges) this.drawEdge(edge);

    ctx.strokeStyle = options.nodeLineColor;
    ctx.fillStyle = options.nodeColor;
    ctx.lineWidth = options.nodeLineWidth;
    for (const node of nodes) this.drawNode(node);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawEdgeLine(edge: Edge) {
    const { ctx } = this;
    const { source, target } = edge;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
  }

  private drawEdgeArrow(edge: Edge) {
    const { ctx, options } = this;
    const { source, target } = edge;

    const dx = target.x - source.x;
    const dy = target.y - source.y;

    const rad = Math.atan2(dy, dx);
    const sinr = Math.sin(rad);
    const cosr = Math.cos(rad);

    const ll = options.edgeArrowWidth * 0.5;

    const midx = (source.x + target.x) / 2;
    const midy = (source.y + target.y) / 2;
    const lsx = midx - options.edgeArrowHeight * cosr;
    const lsy = midy - options.edgeArrowHeight * sinr;
    const lp1x = lsx + ll * sinr;
    const lp1y = lsy - ll * cosr;
    const lp2x = lsx - ll * sinr;
    const lp2y = lsy + ll * cosr;

    ctx.beginPath();
    ctx.moveTo(midx, midy);
    ctx.lineTo(lp1x, lp1y);
    ctx.lineTo(lp2x, lp2y);
    ctx.closePath();
    ctx.fill();
  }

  private drawEdge(edge: Edge) {
    this.drawEdgeLine(edge);
    this.drawEdgeArrow(edge);
  }

  private drawNode(node: Node) {
    const { ctx } = this;

    ctx.beginPath();
    ctx.arc(node.x, node.y, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawBackground() {
    const { ctx, viewX, viewY, viewW, viewH, options } = this;

    const lw = options.bgLineWidth;
    const gap = options.bgLineGap;

    ctx.strokeStyle = options.bgDotColor;
    ctx.lineWidth = lw;

    const bl = viewX - lw * 0.5;
    const br = viewX + viewW + lw * 0.5;
    const bt = viewY - lw * 0.5;
    const bb = viewY + viewH + lw * 0.5;

    const ll = bl - (((bl % gap) - gap) % gap);
    const lr = br - (((br % gap) + gap) % gap);
    const lt = bt - (((bt % gap) - gap) % gap);
    const lb = bb - (((bb % gap) + gap) % gap);

    ctx.beginPath();

    for (let i = ll; i <= lr; i += gap) {
      ctx.moveTo(i, lt);
      ctx.lineTo(i, lb + gap);
    }

    ctx.lineCap = "round";
    ctx.setLineDash([0, gap]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = "square";
  }

  setViewPosFromWindowPos(
    out: [number, number],
    windowX: number,
    windowY: number
  ) {
    const { left, top } = this.boundingRect;
    const { scale, translateX, translateY } = this;

    out[0] = (windowX - left - translateX) / scale;
    out[1] = (windowY - top - translateY) / scale;
  }

  setViewPosFromCanvasPos(
    out: [number, number],
    canvasX: number,
    canvasY: number
  ) {
    const { scale, translateX, translateY } = this;

    out[0] = (canvasX - translateX) / scale;
    out[1] = (canvasY - translateY) / scale;
  }

  getViewPosFromWindowPos(windowX: number, windowY: number) {
    const { left, top } = this.boundingRect;
    const { scale, translateX, translateY } = this;

    return [
      (windowX - left - translateX) / scale,
      (windowY - top - translateY) / scale
    ];
  }

  getViewPosFromCanvasPos(canvasX: number, canvasY: number) {
    const { scale, translateX, translateY } = this;

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

export function createGraphView(container: HTMLElement) {
  return new GraphView(container);
}

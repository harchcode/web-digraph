import { defaultGraphOptions, GraphOptions } from "./utils";

export type GraphShape = {
  width: number;
  height: number;
  drawContent: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    id: number
  ) => void;
  drawPath: (
    path: Path2D,
    x: number,
    y: number,
    w: number,
    h: number,
    id: number
  ) => void;
};

export type GraphNode = {
  id: number;
  x: number;
  y: number;
};

export type GraphEdge = {
  id: number;
  sourceId: number;
  targetId: number;
};

const defaultNodeShape: GraphShape = {
  width: 160,
  height: 160,
  drawContent: (ctx, x, y, w, _h, id) => {
    ctx.fillText(`Node ID: ${id}`, x, y, w);
  },
  drawPath: (p, x, y, w) => {
    p.arc(x, y, w * 0.5, 0, Math.PI * 2);
    p.closePath();
  }
};

const defaultEdgeShape: GraphShape = {
  width: 48,
  height: 48,
  drawContent: (ctx, x, y, w, _h, id) => {
    ctx.fillText(id.toString(), x, y, w);
  },
  drawPath: (p, x, y, w, h) => {
    const wh = w * 0.5;
    const hh = h * 0.5;

    p.moveTo(x - wh, y);
    p.lineTo(x, y + wh);
    p.lineTo(x + wh, y);
    p.lineTo(x, y - hh);
    p.closePath();
  }
};

export function createNodeShape(shape?: Partial<GraphShape>): GraphShape {
  return {
    ...defaultNodeShape,
    ...shape
  };
}

export function createEdgeShape(shape?: Partial<GraphShape>): GraphShape {
  return {
    ...defaultEdgeShape,
    ...shape
  };
}

export class GraphView<Node extends GraphNode, Edge extends GraphEdge> {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private idMap: Record<number, Node | Edge> = {};
  private shapeMap: Record<number, GraphShape> = {};
  private pathMap: Record<number, Path2D> = {};
  private linePathMap: Record<number, Path2D> = {};
  private arrowPathMap: Record<number, Path2D> = {};
  private edgeContentPosMap: Record<number, [number, number]> = {};

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
    ctx.miterLimit;

    this.requestDraw();

    container.appendChild(this.canvas);
  }

  addNode(node: Node, shape: GraphShape) {
    if (this.idMap[node.id]) return;

    this.nodes.push(node);
    this.idMap[node.id] = node;

    const path = new Path2D();
    shape.drawPath(path, node.x, node.y, shape.width, shape.height, node.id);

    this.shapeMap[node.id] = shape;
    this.pathMap[node.id] = path;

    this.requestDraw();
  }

  addEdge(edge: Edge, shape: GraphShape) {
    if (this.idMap[edge.id]) return;

    const { idMap, options } = this;

    this.edges.push(edge);
    this.idMap[edge.id] = edge;
    this.shapeMap[edge.id] = shape;

    const { sourceId, targetId } = edge;

    const source = idMap[sourceId] as Node;
    const target = idMap[targetId] as Node;

    const dx = target.x - source.x;
    const dy = target.y - source.y;

    const rad = Math.atan2(dy, dx);
    const sinr = Math.sin(rad);
    const cosr = Math.cos(rad);

    const sip = this.getIntersectionPoint(
      target.x,
      target.y,
      source.x,
      source.y,
      this.pathMap[source.id]
    );
    const sipx = target.x - sip * dx;
    const sipy = target.y - sip * dy;

    const tip = this.getIntersectionPoint(
      source.x,
      source.y,
      target.x,
      target.y,
      this.pathMap[target.id]
    );
    const tipx = source.x + tip * dx;
    const tipy = source.y + tip * dy;

    const midx = (sipx + tipx - options.edgeArrowHeight * cosr) * 0.5;
    const midy = (sipy + tipy - options.edgeArrowHeight * sinr) * 0.5;

    const path = new Path2D();
    shape.drawPath(path, midx, midy, shape.width, shape.height, edge.id);

    this.pathMap[edge.id] = path;
    this.edgeContentPosMap[edge.id] = [midx, midy];

    const linePath = this.createEdgeLinePath(
      source.x,
      source.y,
      target.x,
      target.y
    );
    this.linePathMap[edge.id] = linePath;

    const arrowPath = this.createEdgeArrowPath(tipx, tipy, sinr, cosr);
    this.arrowPathMap[edge.id] = arrowPath;

    this.requestDraw();
  }

  private createEdgeLinePath(sx: number, sy: number, tx: number, ty: number) {
    const p = new Path2D();

    p.moveTo(sx, sy);
    p.lineTo(tx, ty);

    return p;
  }

  private createEdgeArrowPath(
    ix: number,
    iy: number,
    sinr: number,
    cosr: number
  ) {
    const { options } = this;

    const ll = options.edgeArrowWidth * 0.5;
    const lsx = ix - options.edgeArrowHeight * cosr;
    const lsy = iy - options.edgeArrowHeight * sinr;
    const lp1x = lsx + ll * sinr;
    const lp1y = lsy - ll * cosr;
    const lp2x = lsx - ll * sinr;
    const lp2y = lsy + ll * cosr;

    const p = new Path2D();

    p.moveTo(ix, iy);
    p.lineTo(lp1x, lp1y);
    p.lineTo(lp2x, lp2y);
    p.closePath();

    return p;
  }

  updateNode(id: number, node: Partial<Node>) {
    //
  }

  updateEdge(id: number, edge: Partial<Edge>) {
    //
  }

  removeNode(id: number) {
    //
  }

  removeEdge(id: number) {
    //
  }

  getNode(id: number): Node {
    return this.idMap[id] as Node;
  }

  getEdge(id: number): Edge {
    return this.idMap[id] as Edge;
  }

  getData() {
    return {
      nodes: this.nodes,
      edges: this.edges
    };
  }

  clear() {
    this.nodes = [];
    this.edges = [];
    this.idMap = {};
    this.shapeMap = {};
    this.pathMap = {};
    this.edgeContentPosMap = {};
    this.linePathMap = {};
    this.arrowPathMap = {};

    this.requestDraw();
  }

  // setData(nodes: Node[], edges: Edge[]) {
  //   this.nodes = nodes;
  //   this.edges = edges;

  //   this.requestDraw();
  // }

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

    for (const edge of edges) this.drawEdge(edge);

    for (const node of nodes) this.drawNode(node);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private getIntersectionPoint(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    path: Path2D
  ) {
    const { ctx } = this;

    const dx = tx - sx;
    const dy = ty - sy;

    let start = 0;
    let end = 10000;

    while (start <= end) {
      const mid = ((start + end) / 2) | 0;

      const x = sx + (mid / 10000) * dx;
      const y = sy + (mid / 10000) * dy;

      // const [vx, vy] = this.getCanvasPosFromViewPos(x, y);

      if (ctx.isPointInPath(path, x, y)) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }

    return start / 10000;
  }

  private drawEdge(edge: Edge) {
    const { ctx, options } = this;

    ctx.lineWidth = options.edgeLineWidth;

    // draw edge line
    const linePath = this.linePathMap[edge.id];
    ctx.strokeStyle = options.edgeLineColor;
    ctx.stroke(linePath);

    // draw edge arrow
    const arrowPath = this.arrowPathMap[edge.id];
    ctx.fillStyle = options.edgeLineColor;
    ctx.fill(arrowPath);

    // draw shape
    const path = this.pathMap[edge.id];

    ctx.fillStyle = options.edgeShapeColor;
    ctx.fill(path);
    ctx.stroke(path);

    // draw content
    const [x, y] = this.edgeContentPosMap[edge.id];
    const shape = this.shapeMap[edge.id];

    ctx.fillStyle = options.edgeContentColor;
    ctx.textAlign = options.edgeTextAlign;
    ctx.textBaseline = options.edgeTextBaseline;
    ctx.font = options.edgeFont;

    shape.drawContent(ctx, x, y, shape.width, shape.height, edge.id);
  }

  private drawNode(node: Node) {
    const { ctx, options } = this;

    // draw shape
    const path = this.pathMap[node.id];

    ctx.strokeStyle = options.nodeLineColor;
    ctx.fillStyle = options.nodeColor;
    ctx.lineWidth = options.nodeLineWidth;

    ctx.fill(path);
    ctx.stroke(path);

    // draw content
    const shape = this.shapeMap[node.id];

    ctx.fillStyle = options.nodeContentColor;
    ctx.textAlign = options.nodeTextAlign;
    ctx.textBaseline = options.nodeTextBaseline;
    ctx.font = options.nodeFont;

    shape.drawContent(ctx, node.x, node.y, shape.width, shape.height, node.id);
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

  getCanvasPosFromViewPos(viewX: number, viewY: number) {
    const { scale, translateX, translateY } = this;

    return [viewX * scale + translateX, viewY * scale + translateY];
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

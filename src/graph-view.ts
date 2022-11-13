import { GraphState } from "./graph-state";
import {
  defaultEdgeShape,
  defaultNodeShape,
  GraphEdge,
  GraphNode,
  GraphShape,
  GraphOptions
} from "./types";

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
  private state: GraphState<Node, Edge>;

  constructor(container: HTMLElement, options: Partial<GraphOptions> = {}) {
    this.state = new GraphState(container, options);

    this.requestDraw();

    container.appendChild(this.state.canvas);

    this.state.canvas.addEventListener("mousemove", e => {
      const { ctx, scale, translateX, translateY, nodes, edges, idMap } =
        this.state;
      const [vx, vy] = this.getViewPosFromWindowPos(e.x, e.y);

      const prevId = this.state.hoveredId;
      this.state.hoveredId = 0;

      for (const node of nodes) {
        if (this.isNodeHovered(vx, vy, node)) {
          this.state.hoveredId = node.id;
        }
      }

      for (const edge of edges) {
        if (this.isEdgeHovered(vx, vy, edge)) {
          this.state.hoveredId = edge.id;
        }
      }

      if (this.state.hoveredId === prevId) return;

      const prev = idMap[prevId] as Node | Edge | undefined;
      const curr = idMap[this.state.hoveredId] as Node | Edge | undefined;

      ctx.setTransform(scale, 0, 0, scale, translateX, translateY);
      this.setView();

      if (prev) {
        if ("x" in prev) {
          this.drawNode(prev, false);
        } else {
          this.drawEdge(prev, false);
        }
      }

      if (curr) {
        if ("x" in curr) {
          this.drawNode(curr, true);
        } else {
          this.drawEdge(curr, true);
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
    });
  }

  destroy() {
    //
  }

  addNode(node: Node, shape: GraphShape) {
    const { idMap, nodes, shapeMap, pathMap } = this.state;

    if (idMap[node.id]) return;

    nodes.push(node);
    idMap[node.id] = node;

    const path = new Path2D();
    shape.drawPath(path, node.x, node.y, shape.width, shape.height, node.id);

    shapeMap[node.id] = shape;
    pathMap[node.id] = path;

    this.requestDraw();
  }

  addEdge(edge: Edge, shape: GraphShape) {
    if (this.state.idMap[edge.id]) return;

    const {
      idMap,
      options,
      edges,
      shapeMap,
      pathMap,
      edgeContentPosMap,
      arrowPathMap,
      linePathMap
    } = this.state;

    edges.push(edge);
    idMap[edge.id] = edge;
    shapeMap[edge.id] = shape;

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
      pathMap[source.id]
    );
    const sipx = target.x - sip * dx + options.nodeLineWidth * cosr * 0.5;
    const sipy = target.y - sip * dy + options.nodeLineWidth * sinr * 0.5;

    const tip = this.getIntersectionPoint(
      source.x,
      source.y,
      target.x,
      target.y,
      pathMap[target.id]
    );
    const tipx = source.x + tip * dx - options.nodeLineWidth * cosr * 0.5;
    const tipy = source.y + tip * dy - options.nodeLineWidth * sinr * 0.5;

    const midx = (sipx + tipx - options.edgeArrowHeight * cosr) * 0.5;
    const midy = (sipy + tipy - options.edgeArrowHeight * sinr) * 0.5;

    const path = new Path2D();
    shape.drawPath(path, midx, midy, shape.width, shape.height, edge.id);

    pathMap[edge.id] = path;
    edgeContentPosMap[edge.id] = [midx, midy];

    const linePath = this.createEdgeLinePath(
      sipx,
      sipy,
      tipx - options.edgeArrowHeight * cosr,
      tipy - options.edgeArrowHeight * sinr
    );
    linePathMap[edge.id] = linePath;

    const arrowPath = this.createEdgeArrowPath(tipx, tipy, sinr, cosr);
    arrowPathMap[edge.id] = arrowPath;

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
    const { options } = this.state;

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

  // updateNode(id: number, node: Partial<Node>) {
  //   //
  // }

  // updateEdge(id: number, edge: Partial<Edge>) {
  //   //
  // }

  // removeNode(id: number) {
  //   //
  // }

  // removeEdge(id: number) {
  //   //
  // }

  getNode(id: number): Node {
    return this.state.idMap[id] as Node;
  }

  getEdge(id: number): Edge {
    return this.state.idMap[id] as Edge;
  }

  getData() {
    return {
      nodes: this.state.nodes,
      edges: this.state.edges
    };
  }

  clear() {
    this.state.nodes = [];
    this.state.edges = [];
    this.state.idMap = {};
    this.state.shapeMap = {};
    this.state.pathMap = {};
    this.state.edgeContentPosMap = {};
    this.state.linePathMap = {};
    this.state.arrowPathMap = {};

    this.requestDraw();
  }

  getTranslateX() {
    return this.state.translateX;
  }

  setTranslateX(v: number) {
    if (v === this.state.translateX) return;

    this.state.translateX = v;
    this.requestDraw();
  }

  getTranslateY() {
    return this.state.translateY;
  }

  setTranslateY(v: number) {
    if (v === this.state.translateY) return;

    this.state.translateY = v;
    this.requestDraw();
  }

  getScale() {
    return this.state.scale;
  }

  setScale(v: number) {
    if (v === this.state.scale) return;

    this.state.scale = v;
    this.requestDraw();
  }

  setTransform(translateX: number, translateY: number, scale: number) {
    if (
      translateX === this.state.translateX &&
      translateY === this.state.translateY &&
      scale === this.state.scale
    )
      return;

    this.state.translateX = translateX;
    this.state.translateY = translateY;
    this.state.scale = scale;

    this.requestDraw();
  }

  moveBy(x: number, y: number) {
    this.state.translateX += x;
    this.state.translateY += y;

    this.requestDraw();
  }

  zoomBy(value: number, targetX?: number, targetY?: number) {
    this.zoomTo(this.state.scale + value, targetX, targetY);
  }

  zoomTo(value: number, targetX?: number, targetY?: number) {
    const { scale, translateX, translateY, options } = this.state;
    const { width, height } = this.state.canvas;

    targetX = targetX || (width * 0.5 - translateX) / scale;
    targetY = targetY || (height * 0.5 - translateY) / scale;

    const newScale = Math.min(
      options.maxScale,
      Math.max(options.minScale, value)
    );

    const deltaScale = newScale - scale;
    const offsetX = -(targetX * deltaScale);
    const offsetY = -(targetY * deltaScale);

    this.state.scale += deltaScale;
    this.state.translateX += offsetX;
    this.state.translateY += offsetY;

    this.requestDraw();
  }

  resize(width: number, height: number): void {
    this.state.canvas.width = width;
    this.state.canvas.height = height;

    this.state.boundingRect = this.state.canvas.getBoundingClientRect();

    this.requestDraw();
  }

  private requestDraw() {
    if (!this.state.isDrawing) {
      requestAnimationFrame(this.requestDrawHandler);
    }

    this.state.isDrawing = true;
  }

  private requestDrawHandler = () => {
    this.state.isDrawing = false;
    this.draw();
  };

  private setView() {
    const { canvas, translateX, translateY, scale } = this.state;

    this.state.viewX = -translateX / scale;
    this.state.viewY = -translateY / scale;
    this.state.viewW = canvas.width / scale;
    this.state.viewH = canvas.height / scale;
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
      edges,
      hoveredId
    } = this.state;

    ctx.fillStyle = options.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(scale, 0, 0, scale, translateX, translateY);

    this.setView();

    if (options.bgShowDots) this.drawBackground();

    for (const edge of edges) this.drawEdge(edge, hoveredId === edge.id);
    for (const node of nodes) this.drawNode(node, hoveredId === node.id);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private getIntersectionPoint(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    path: Path2D
  ) {
    const { ctx } = this.state;

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

  private isEdgeHovered(x: number, y: number, edge: Edge) {
    const { ctx, pathMap, linePathMap, arrowPathMap } = this.state;

    return (
      ctx.isPointInPath(pathMap[edge.id], x, y) ||
      ctx.isPointInStroke(linePathMap[edge.id], x, y) ||
      ctx.isPointInPath(arrowPathMap[edge.id], x, y)
    );
  }

  private drawEdge(edge: Edge, hovered = false) {
    const {
      ctx,
      options,
      linePathMap,
      arrowPathMap,
      pathMap,
      edgeContentPosMap,
      shapeMap
    } = this.state;

    ctx.lineWidth = options.edgeLineWidth;
    ctx.strokeStyle = hovered
      ? options.edgeHoveredLineColor
      : options.edgeLineColor;

    // draw edge line
    const linePath = linePathMap[edge.id];
    ctx.stroke(linePath);

    // draw edge arrow
    const arrowPath = arrowPathMap[edge.id];
    ctx.fillStyle = hovered
      ? options.edgeHoveredLineColor
      : options.edgeLineColor;
    ctx.fill(arrowPath);

    // draw shape
    const path = pathMap[edge.id];

    ctx.fillStyle = options.edgeShapeColor;
    ctx.fill(path);
    ctx.stroke(path);

    // draw content
    const [x, y] = edgeContentPosMap[edge.id];
    const shape = shapeMap[edge.id];

    ctx.fillStyle = options.edgeContentColor;
    ctx.textAlign = options.edgeTextAlign;
    ctx.textBaseline = options.edgeTextBaseline;
    ctx.font = options.edgeFont;

    shape.drawContent(ctx, x, y, shape.width, shape.height, edge.id);
  }

  private isNodeHovered(x: number, y: number, node: Node) {
    const { ctx, pathMap } = this.state;

    return ctx.isPointInPath(pathMap[node.id], x, y);
  }

  private drawNode(node: Node, hovered = false) {
    const { ctx, options, pathMap, shapeMap } = this.state;

    // draw shape
    const path = pathMap[node.id];

    ctx.strokeStyle = hovered
      ? options.nodeHoveredLineColor
      : options.nodeLineColor;
    ctx.fillStyle = options.nodeColor;
    ctx.lineWidth = options.nodeLineWidth;

    ctx.fill(path);
    ctx.stroke(path);

    // draw content
    const shape = shapeMap[node.id];

    ctx.fillStyle = options.nodeContentColor;
    ctx.textAlign = options.nodeTextAlign;
    ctx.textBaseline = options.nodeTextBaseline;
    ctx.font = options.nodeFont;

    shape.drawContent(ctx, node.x, node.y, shape.width, shape.height, node.id);
  }

  private drawBackground() {
    const { ctx, viewX, viewY, viewW, viewH, options } = this.state;

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
    const { left, top } = this.state.boundingRect;
    const { scale, translateX, translateY } = this.state;

    out[0] = (windowX - left - translateX) / scale;
    out[1] = (windowY - top - translateY) / scale;
  }

  setViewPosFromCanvasPos(
    out: [number, number],
    canvasX: number,
    canvasY: number
  ) {
    const { scale, translateX, translateY } = this.state;

    out[0] = (canvasX - translateX) / scale;
    out[1] = (canvasY - translateY) / scale;
  }

  getViewPosFromWindowPos(windowX: number, windowY: number) {
    const { left, top } = this.state.boundingRect;
    const { scale, translateX, translateY } = this.state;

    return [
      (windowX - left - translateX) / scale,
      (windowY - top - translateY) / scale
    ];
  }

  getViewPosFromCanvasPos(canvasX: number, canvasY: number) {
    const { scale, translateX, translateY } = this.state;

    return [(canvasX - translateX) / scale, (canvasY - translateY) / scale];
  }

  getCanvasPosFromViewPos(viewX: number, viewY: number) {
    const { scale, translateX, translateY } = this.state;

    return [viewX * scale + translateX, viewY * scale + translateY];
  }

  setCanvasPosFromWindowPos(
    out: [number, number],
    windowX: number,
    windowY: number
  ) {
    const { left, top } = this.state.boundingRect;

    out[0] = windowX - left;
    out[1] = windowY - top;
  }

  getCanvasPosFromWindowPos(windowX: number, windowY: number) {
    const { left, top } = this.state.boundingRect;

    return [windowX - left, windowY - top];
  }
}

export function createGraphView(container: HTMLElement) {
  return new GraphView(container);
}

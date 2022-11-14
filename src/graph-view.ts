import { GraphRenderer } from "./graph-renderer";
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
  private renderer: GraphRenderer<Node, Edge>;

  constructor(container: HTMLElement, options: Partial<GraphOptions> = {}) {
    this.state = new GraphState(container, options);
    this.renderer = new GraphRenderer(this, this.state);

    this.requestDraw();

    container.appendChild(this.state.canvas);

    this.state.canvas.addEventListener("mousemove", e => {
      const { moveNodeIds, moveX, moveY, dragLineSourceNode } = this.state;

      const vp = this.getViewPosFromWindowPos(e.x, e.y);

      if (dragLineSourceNode) {
        this.state.dragLineX = vp[0];
        this.state.dragLineY = vp[1];

        this.requestDraw();
      }

      if (moveNodeIds.length === 0) {
        this.checkHover(vp[0], vp[1]);
        return;
      }

      const dx = vp[0] - moveX;
      const dy = vp[1] - moveY;

      this.state.moveX = vp[0];
      this.state.moveY = vp[1];

      for (const id of moveNodeIds) {
        this.moveNode(id, dx, dy);
      }
    });
  }

  destroy() {
    //
  }

  beginDragLine(node: Node) {
    this.state.dragLineSourceNode = node;
    this.state.dragLineX = node.x;
    this.state.dragLineY = node.y;
  }

  endDragLine() {
    const { hoveredId, idMap } = this.state;

    if (!this.state.dragLineSourceNode) return;

    let r = 0;
    if (hoveredId > 0 && hoveredId !== this.state.dragLineSourceNode.id) {
      r = hoveredId;
    }

    const s = this.state.dragLineSourceNode;

    this.state.dragLineSourceNode = undefined;

    this.requestDraw();

    const rn = idMap[r];
    return rn && this.isNode(rn) ? [s, rn] : undefined;
  }

  beginMoveNode(ids: number[], vx: number, vy: number) {
    this.state.moveNodeIds = ids;
    this.state.moveX = vx;
    this.state.moveY = vy;
    this.state.moveStartX = vx;
    this.state.moveStartY = vy;
  }

  endMoveNode() {
    const { moveX, moveY, moveStartX, moveStartY } = this.state;

    this.state.moveNodeIds.length = 0;

    this.requestDraw();

    return [moveX - moveStartX, moveY - moveStartY];
  }

  getHoveredId() {
    return this.state.hoveredId;
  }

  select(id: number) {
    this.state.selectedIdMap = { [id]: true };
    this.requestDraw();
  }

  addSelection(id: number) {
    this.state.selectedIdMap[id] = true;
    this.requestDraw();
  }

  removeSelection(id: number) {
    delete this.state.selectedIdMap[id];
    this.requestDraw();
  }

  clearSelection() {
    this.state.selectedIdMap = {};
    this.requestDraw();
  }

  private checkHover(vx: number, vy: number) {
    const { nodes, edges, idMap, selectedIdMap } = this.state;

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

    this.renderer.applyTransform();

    if (prev) {
      if ("x" in prev) {
        this.drawNode(prev, false, selectedIdMap[prev.id]);
      } else {
        this.drawEdge(prev, false, selectedIdMap[prev.id]);
      }
    }

    if (curr) {
      if ("x" in curr) {
        this.drawNode(curr, true, selectedIdMap[curr.id]);
      } else {
        this.drawEdge(curr, true, selectedIdMap[curr.id]);
      }
    }

    this.renderer.resetTransform();
  }

  addNode(node: Node, shape: GraphShape) {
    const { idMap, nodes, shapeMap, pathMap } = this.state;

    if (idMap[node.id]) return;

    nodes.push(node);
    idMap[node.id] = node;

    const path = shape.createPath(
      node.x,
      node.y,
      shape.width,
      shape.height,
      node.id
    );

    shapeMap[node.id] = shape;
    pathMap[node.id] = path;

    this.requestDraw();
  }

  addEdge(edge: Edge, shape: GraphShape) {
    const { idMap } = this.state;

    if (idMap[edge.id] || !idMap[edge.sourceId] || !idMap[edge.targetId])
      return;

    const { edges, shapeMap, sourceNodeIdToEdgesMap, targetNodeIdToEdgesMap } =
      this.state;

    edges.push(edge);
    idMap[edge.id] = edge;
    shapeMap[edge.id] = shape;

    if (sourceNodeIdToEdgesMap[edge.sourceId]) {
      sourceNodeIdToEdgesMap[edge.sourceId].push(edge);
    } else {
      sourceNodeIdToEdgesMap[edge.sourceId] = [edge];
    }

    if (targetNodeIdToEdgesMap[edge.targetId]) {
      targetNodeIdToEdgesMap[edge.targetId].push(edge);
    } else {
      targetNodeIdToEdgesMap[edge.targetId] = [edge];
    }

    this.createEdgePath(edge, shape);

    this.requestDraw();
  }

  private createEdgePath(edge: Edge, shape: GraphShape) {
    const {
      idMap,
      pathMap,
      options,
      edgeContentPosMap,
      linePathMap,
      arrowPathMap
    } = this.state;
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

    const path = shape.createPath(
      midx,
      midy,
      shape.width,
      shape.height,
      edge.id
    );

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

  private moveNode(id: number, dx: number, dy: number) {
    const {
      idMap,
      shapeMap,
      pathMap,
      sourceNodeIdToEdgesMap,
      targetNodeIdToEdgesMap
    } = this.state;

    const node = idMap[id] as Node | undefined;
    if (!node) return;

    node.x += dx;
    node.y += dy;

    const shape = shapeMap[id];

    const path = shape.createPath(
      node.x,
      node.y,
      shape.width,
      shape.height,
      node.id
    );

    pathMap[id] = path;

    const ses = sourceNodeIdToEdgesMap[id];
    const tes = targetNodeIdToEdgesMap[id];

    if (ses)
      for (const edge of ses) {
        this.createEdgePath(edge, shapeMap[edge.id]);
      }

    if (tes)
      for (const edge of tes) {
        this.createEdgePath(edge, shapeMap[edge.id]);
      }

    this.requestDraw();
  }

  updateNode(id: number, node: Partial<Node>) {
    const { idMap } = this.state;

    const curNode = idMap[id] as Node | undefined;
    if (!curNode) return;

    if ((node.x && node.x !== curNode.x) || (node.y && node.y !== curNode.y)) {
      this.moveNode(
        id,
        node.x ? node.x - curNode.x : 0,
        node.y ? node.y - curNode.y : 0
      );
    }

    for (const k in node) {
      if (k === "id") continue;

      curNode[k] = node[k] as Node[Extract<keyof Node, string>];
    }
  }

  updateEdge(id: number, edge: Partial<Edge>) {
    const { idMap } = this.state;

    const cur = idMap[id] as Edge | undefined;
    if (!cur) return;

    if (
      (edge.sourceId && edge.sourceId !== cur.sourceId) ||
      (edge.targetId && edge.targetId !== cur.targetId)
    ) {
      this.requestDraw();
    }

    for (const k in edge) {
      if (k === "id") continue;

      cur[k] = edge[k] as Edge[Extract<keyof Edge, string>];
    }
  }

  removeNode(id: number) {
    const node = this.state.idMap[id];

    if (!this.isNode(node)) return;

    delete this.state.idMap[id];
    delete this.state.pathMap[id];

    const ses = this.state.sourceNodeIdToEdgesMap[id];
    if (ses) for (const edge of ses) this.removeEdge(edge.id);

    const tes = this.state.sourceNodeIdToEdgesMap[id];
    if (tes) for (const edge of tes) this.removeEdge(edge.id);
  }

  removeEdge(id: number) {
    const edge = this.state.idMap[id];

    if (!this.isEdge(edge)) return;

    delete this.state.idMap[id];
    delete this.state.pathMap[id];
    delete this.state.linePathMap[id];
    delete this.state.arrowPathMap[id];

    const ses = this.state.sourceNodeIdToEdgesMap[edge.sourceId];
    if (ses)
      this.state.sourceNodeIdToEdgesMap[edge.sourceId] = ses.filter(
        e => e.id !== id
      );

    const tes = this.state.targetNodeIdToEdgesMap[edge.targetId];
    if (tes)
      this.state.targetNodeIdToEdgesMap[edge.targetId] = ses.filter(
        e => e.id !== id
      );
  }

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

  isNode(nodeOrEdge: Node | Edge): nodeOrEdge is Node {
    return "x" in nodeOrEdge;
  }

  isEdge(nodeOrEdge: Node | Edge): nodeOrEdge is Edge {
    return "sourceId" in nodeOrEdge;
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
      hoveredId,
      selectedIdMap,
      dragLineSourceNode
    } = this.state;

    ctx.fillStyle = options.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(scale, 0, 0, scale, translateX, translateY);

    this.state.setView();

    if (options.bgShowDots) this.drawBackground();

    if (dragLineSourceNode) this.drawDragLine();

    for (const edge of edges)
      this.drawEdge(edge, hoveredId === edge.id, selectedIdMap[edge.id]);

    for (const node of nodes)
      this.drawNode(node, hoveredId === node.id, selectedIdMap[node.id]);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawDragLine() {
    const { ctx, options, dragLineSourceNode, dragLineX, dragLineY } =
      this.state;

    if (!dragLineSourceNode) return;

    const sx = dragLineSourceNode.x;
    const sy = dragLineSourceNode.y;
    const tx = dragLineX;
    const ty = dragLineY;

    const dx = tx - sx;
    const dy = ty - sy;

    const rad = Math.atan2(dy, dx);
    const sinr = Math.sin(rad);
    const cosr = Math.cos(rad);

    const ll = options.edgeArrowWidth * 0.5;
    const lsx = tx - options.edgeArrowHeight * cosr;
    const lsy = ty - options.edgeArrowHeight * sinr;
    const lp1x = lsx + ll * sinr;
    const lp1y = lsy - ll * cosr;
    const lp2x = lsx - ll * sinr;
    const lp2y = lsy + ll * cosr;

    ctx.lineWidth = options.edgeLineWidth;
    ctx.strokeStyle = options.edgeLineColor;
    ctx.fillStyle = options.edgeLineColor;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(lp1x, lp1y);
    ctx.lineTo(lp2x, lp2y);
    ctx.closePath();
    ctx.fill();
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

    const e = (Math.abs(dx) + Math.abs(dy)) | 0;

    let start = 0;
    let end = e;

    while (start <= end) {
      const mid = ((start + end) / 2) | 0;

      const x = sx + (mid / e) * dx;
      const y = sy + (mid / e) * dy;

      // const [vx, vy] = this.getCanvasPosFromViewPos(x, y);

      if (ctx.isPointInPath(path, x, y)) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }

    return start / e;
  }

  private isEdgeHovered(x: number, y: number, edge: Edge) {
    const { ctx, pathMap, linePathMap, arrowPathMap } = this.state;

    return (
      ctx.isPointInPath(pathMap[edge.id], x, y) ||
      ctx.isPointInStroke(linePathMap[edge.id], x, y) ||
      ctx.isPointInPath(arrowPathMap[edge.id], x, y)
    );
  }

  private drawEdge(edge: Edge, hovered = false, selected = false) {
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
    ctx.strokeStyle = selected
      ? options.edgeSelectedLineColor
      : hovered
      ? options.edgeHoveredLineColor
      : options.edgeLineColor;

    // draw edge line
    const linePath = linePathMap[edge.id];
    ctx.stroke(linePath);

    // draw edge arrow
    const arrowPath = arrowPathMap[edge.id];
    ctx.fillStyle = selected
      ? options.edgeSelectedLineColor
      : hovered
      ? options.edgeHoveredLineColor
      : options.edgeLineColor;
    ctx.fill(arrowPath);

    // draw shape
    const path = pathMap[edge.id];

    ctx.fillStyle = selected
      ? options.edgeSelectedShapeColor
      : options.edgeShapeColor;
    ctx.fill(path);
    ctx.stroke(path);

    // draw content
    const [x, y] = edgeContentPosMap[edge.id];
    const shape = shapeMap[edge.id];

    ctx.fillStyle = selected
      ? options.edgeSelectedContentColor
      : options.edgeContentColor;
    ctx.textAlign = options.edgeTextAlign;
    ctx.textBaseline = options.edgeTextBaseline;
    ctx.font = options.edgeFont;

    shape.drawContent(ctx, x, y, shape.width, shape.height, edge.id);
  }

  private isNodeHovered(x: number, y: number, node: Node) {
    const { ctx, pathMap } = this.state;

    return ctx.isPointInPath(pathMap[node.id], x, y);
  }

  private drawNode(node: Node, hovered = false, selected = false) {
    const { ctx, options, pathMap, shapeMap } = this.state;

    // draw shape
    const path = pathMap[node.id];

    ctx.strokeStyle = selected
      ? options.nodeSelectedLineColor
      : hovered
      ? options.nodeHoveredLineColor
      : options.nodeLineColor;
    ctx.fillStyle = selected ? options.nodeSelectedColor : options.nodeColor;
    ctx.lineWidth = options.nodeLineWidth;

    ctx.fill(path);
    ctx.stroke(path);

    // draw content
    const shape = shapeMap[node.id];

    ctx.fillStyle = selected
      ? options.nodeSelectedContentColor
      : options.nodeContentColor;
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

  getCanvasPosFromWindowPos(windowX: number, windowY: number) {
    const { left, top } = this.state.boundingRect;

    return [windowX - left, windowY - top];
  }
}

export function createGraphView(container: HTMLElement) {
  return new GraphView(container);
}

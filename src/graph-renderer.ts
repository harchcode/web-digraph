import { GraphState } from "./graph-state";
import { GraphView } from "./graph-view";
import { GraphEdge, GraphNode, GraphShape } from "./types";

export class GraphRenderer<Node extends GraphNode, Edge extends GraphEdge> {
  private state: GraphState<Node, Edge>;
  private view: GraphView<Node, Edge>;

  constructor(view: GraphView<Node, Edge>, state: GraphState<Node, Edge>) {
    this.view = view;
    this.state = state;
  }

  applyTransform() {
    const { ctx, scale, translateX, translateY } = this.state;

    ctx.setTransform(scale, 0, 0, scale, translateX, translateY);
    this.state.setView();
  }

  resetTransform() {
    this.state.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  requestDraw() {
    if (!this.state.isDrawing) {
      requestAnimationFrame(this.requestDrawHandler);
    }

    this.state.isDrawing = true;
  }

  requestDrawHandler = () => {
    this.state.isDrawing = false;
    this.draw();
  };

  getIntersectionPoint(
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

      if (ctx.isPointInPath(path, x, y)) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }

    return start / e;
  }

  createEdgePath(edge: Edge, shape: GraphShape) {
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

  createEdgeLinePath(sx: number, sy: number, tx: number, ty: number) {
    const p = new Path2D();

    p.moveTo(sx, sy);
    p.lineTo(tx, ty);

    return p;
  }

  createEdgeArrowPath(ix: number, iy: number, sinr: number, cosr: number) {
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

  draw() {
    const {
      ctx,
      canvas,
      options,
      nodes,
      edges,
      hoveredId,
      selectedIdMap,
      dragLineSourceNode
    } = this.state;

    ctx.fillStyle = options.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.applyTransform();

    if (options.bgShowDots) this.drawBackground();

    if (dragLineSourceNode) this.drawDragLine();

    for (const edge of edges)
      this.drawEdge(edge, hoveredId === edge.id, selectedIdMap[edge.id]);

    for (const node of nodes)
      this.drawNode(node, hoveredId === node.id, selectedIdMap[node.id]);

    this.resetTransform();
  }

  drawDragLine() {
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

  drawEdge(edge: Edge, hovered = false, selected = false) {
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

  drawNode(node: Node, hovered = false, selected = false) {
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

  drawBackground() {
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
}

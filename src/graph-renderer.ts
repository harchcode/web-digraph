import { GraphState } from "./graph-state";
import { GraphView } from "./graph-view";
import {
  EdgeDrawData,
  GraphDataType,
  GraphEdge,
  GraphNode,
  GraphShape,
  NodeDrawData
} from "./types";
import { isLineInsideRect, lineIntersect, rectIntersect } from "./utils";

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
    const { options, nodes, drawData } = this.state;
    const { sourceId, targetId } = edge;

    const source = nodes[sourceId];
    const target = nodes[targetId] as Node;

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
      drawData[source.id].path
    );
    const lineSourceX =
      target.x - sip * dx + options.nodeLineWidth * cosr * 0.5;
    const lineSourceY =
      target.y - sip * dy + options.nodeLineWidth * sinr * 0.5;

    const tip = this.getIntersectionPoint(
      source.x,
      source.y,
      target.x,
      target.y,
      drawData[target.id].path
    );
    const lineTargetX =
      source.x + tip * dx - options.nodeLineWidth * cosr * 0.5;
    const lineTargetY =
      source.y + tip * dy - options.nodeLineWidth * sinr * 0.5;

    const shapeX =
      (lineSourceX + lineTargetX - options.edgeArrowHeight * cosr) * 0.5;
    const shapeY =
      (lineSourceY + lineTargetY - options.edgeArrowHeight * sinr) * 0.5;

    const path = shape.createPath(
      shapeX,
      shapeY,
      shape.width,
      shape.height,
      edge.id
    );

    const linePath = this.createEdgeLinePath(
      lineSourceX,
      lineSourceY,
      lineTargetX - options.edgeArrowHeight * cosr,
      lineTargetY - options.edgeArrowHeight * sinr
    );

    const arrowPath = this.createEdgeArrowPath(
      lineTargetX,
      lineTargetY,
      sinr,
      cosr
    );

    const data = drawData[edge.id] as EdgeDrawData | undefined;

    if (!data) {
      drawData[edge.id] = {
        type: GraphDataType.EDGE,
        shape,
        path,
        linePath,
        arrowPath,
        lineSourceX,
        lineSourceY,
        lineTargetX,
        lineTargetY,
        shapeX,
        shapeY
      };
    } else {
      data.type = GraphDataType.EDGE;
      data.shape = shape;
      data.path = path;
      data.linePath = linePath;
      data.arrowPath = arrowPath;
      data.lineSourceX = lineSourceX;
      data.lineSourceY = lineSourceY;
      data.lineTargetX = lineTargetX;
      data.lineTargetY = lineTargetY;
      data.shapeX = shapeX;
      data.shapeY = shapeY;
    }
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

    for (const edge of Object.values(edges))
      this.drawEdge(edge, hoveredId === edge.id, selectedIdMap[edge.id]);

    for (const node of Object.values(nodes))
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
    const { ctx, options, drawData } = this.state;

    const data = drawData[edge.id] as EdgeDrawData;

    ctx.lineWidth = options.edgeLineWidth;
    ctx.strokeStyle = selected
      ? options.edgeSelectedLineColor
      : hovered
      ? options.edgeHoveredLineColor
      : options.edgeLineColor;

    // draw edge line
    if (this.isEdgeLineInView(edge)) {
      ctx.stroke(data.linePath);
    }

    // draw edge arrow
    if (this.isEdgeArrowInView(edge)) {
      ctx.fillStyle = selected
        ? options.edgeSelectedLineColor
        : hovered
        ? options.edgeHoveredLineColor
        : options.edgeLineColor;

      ctx.fill(data.arrowPath);
    }

    // draw shape and content
    const shape = data.shape;

    if (this.isEdgeShapeInView(edge)) {
      // draw shape

      ctx.fillStyle = selected
        ? options.edgeSelectedShapeColor
        : options.edgeShapeColor;
      ctx.fill(data.path);
      ctx.stroke(data.path);

      // draw content
      ctx.fillStyle = selected
        ? options.edgeSelectedContentColor
        : options.edgeContentColor;
      ctx.textAlign = options.edgeTextAlign;
      ctx.textBaseline = options.edgeTextBaseline;
      ctx.font = options.edgeFont;

      shape.drawContent(
        ctx,
        data.shapeX,
        data.shapeY,
        shape.width,
        shape.height,
        edge.id
      );
    }
  }

  isNodeInView(node: Node) {
    const { drawData, viewX, viewY, viewW, viewH } = this.state;

    const { shape } = drawData[node.id] as NodeDrawData;

    return rectIntersect(
      node.x - shape.width * 0.5,
      node.y - shape.height * 0.5,
      shape.width,
      shape.height,
      viewX,
      viewY,
      viewW,
      viewH
    );
  }

  isEdgeInView(edge: Edge) {
    return (
      this.isEdgeArrowInView(edge) ||
      this.isEdgeLineInView(edge) ||
      this.isEdgeShapeInView(edge)
    );
  }

  isEdgeLineInView(edge: Edge) {
    const { options, viewX, viewY, viewW, viewH, drawData } = this.state;

    const data = drawData[edge.id] as EdgeDrawData;

    const sx = data.lineSourceX;
    const sy = data.lineSourceY;
    const tx = data.lineTargetX;
    const ty = data.lineTargetY;

    const lsz = Math.max(options.edgeLineWidth, options.nodeLineWidth);
    const vx = viewX - lsz;
    const vy = viewY - lsz;
    const vw = viewW + lsz * 2;
    const vh = viewH + lsz * 2;

    return (
      isLineInsideRect(sx, sy, tx, ty, vx, vy, vw, vh) ||
      lineIntersect(sx, sy, tx, ty, vx, vy, vx, vy + vh) ||
      lineIntersect(sx, sy, tx, ty, vx, vy + vh, vx + vw, vy + vh) ||
      lineIntersect(sx, sy, tx, ty, vx + vw, vy + vh, vx + vw, vy) ||
      lineIntersect(sx, sy, tx, ty, vx + vw, vy, vx, vy)
    );
  }

  isEdgeArrowInView(edge: Edge) {
    const { options, drawData, viewX, viewY, viewW, viewH } = this.state;

    const data = drawData[edge.id] as EdgeDrawData;
    const tx = data.lineTargetX;
    const ty = data.lineTargetY;

    const lsz = Math.max(options.edgeLineWidth, options.nodeLineWidth);
    const vx = viewX - lsz;
    const vy = viewY - lsz;
    const vw = viewW + lsz * 2;
    const vh = viewH + lsz * 2;
    const sz = Math.max(options.edgeArrowWidth, options.edgeArrowHeight);

    return rectIntersect(tx - sz, ty - sz, sz * 2, sz * 2, vx, vy, vw, vh);
  }

  isEdgeShapeInView(edge: Edge) {
    const { options, drawData, viewX, viewY, viewW, viewH } = this.state;

    const data = drawData[edge.id] as EdgeDrawData;

    const lsz = Math.max(options.edgeLineWidth, options.nodeLineWidth);
    const vx = viewX - lsz;
    const vy = viewY - lsz;
    const vw = viewW + lsz * 2;
    const vh = viewH + lsz * 2;

    const shape = data.shape;

    return rectIntersect(
      data.shapeX - shape.width * 0.5,
      data.shapeY - shape.height * 0.5,
      shape.width,
      shape.height,
      vx,
      vy,
      vw,
      vh
    );
  }

  drawNode(node: Node, hovered = false, selected = false) {
    const { ctx, options, drawData } = this.state;

    const data = drawData[node.id] as NodeDrawData;

    // check is in view
    const shape = data.shape;
    if (!this.isNodeInView(node)) return;

    // draw shape
    ctx.strokeStyle = selected
      ? options.nodeSelectedLineColor
      : hovered
      ? options.nodeHoveredLineColor
      : options.nodeLineColor;
    ctx.fillStyle = selected ? options.nodeSelectedColor : options.nodeColor;
    ctx.lineWidth = options.nodeLineWidth;

    ctx.fill(data.path);
    ctx.stroke(data.path);

    // draw content

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

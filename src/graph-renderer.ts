import { GraphState } from "./graph-state";
import { GraphView } from "./graph-view";
import { GraphEdge, GraphNode, GraphShape, RedrawType } from "./types";
import { isLineInsideRect, lineIntersect, rectIntersect } from "./utils";

export class GraphRenderer<Node extends GraphNode, Edge extends GraphEdge> {
  private state: GraphState<Node, Edge>;
  private view: GraphView<Node, Edge>;

  private isDrawing = false;
  private redrawType = RedrawType.ALL;
  private cp: [number, number] = [0, 0];

  private moveEdgeIds = new Set<number>();
  private exludeIds: Set<number> | undefined = new Set<number>();

  constructor(view: GraphView<Node, Edge>, state: GraphState<Node, Edge>) {
    this.view = view;
    this.state = state;
  }

  requestDraw(redrawType = RedrawType.ALL, excludeIds?: Set<number>) {
    if (!this.isDrawing) {
      this.redrawType = redrawType;
      this.exludeIds = excludeIds;

      requestAnimationFrame(this.requestDrawHandler);
    }

    this.isDrawing = true;
  }

  requestDrawHandler = () => {
    this.isDrawing = false;

    this.draw(this.redrawType, this.exludeIds);
  };

  applyClip(
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ) {
    const { scale, translateX, translateY, viewX, viewY, viewW, viewH } =
      this.state;

    ctx.restore();
    ctx.save();

    ctx.setTransform(scale, 0, 0, scale, translateX, translateY);

    ctx.clearRect(viewX, viewY, viewW, viewH);
    ctx.beginPath();
    ctx.rect(dx, dy, dw, dh);
    ctx.clip();
  }

  applyTransform() {
    const {
      scale,
      translateX,
      translateY,
      bgCtx,
      nodeCtx,
      moveEdgeCtx,
      edgeCtx,
      moveNodeCtx
    } = this.state;

    this.state.setView();

    const { options, viewX, viewY, viewW, viewH } = this.state;

    const xt = -options.height * 0.5;
    const xr = options.width * 0.5;
    const xb = options.height * 0.5;
    const xl = -options.width * 0.5;

    const dl = Math.max(viewX, xl);
    const dt = Math.max(viewY, xt);
    const dr = Math.min(viewX + viewW, xr);
    const db = Math.min(viewY + viewH, xb);

    if (dl > viewX || dt > viewY || dr < viewX + viewW || db < viewY + viewH) {
      bgCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
      this.applyClip(nodeCtx, dl, dt, dr - dl, db - dt);
      this.applyClip(edgeCtx, dl, dt, dr - dl, db - dt);
      this.applyClip(moveNodeCtx, dl, dt, dr - dl, db - dt);
      this.applyClip(moveEdgeCtx, dl, dt, dr - dl, db - dt);
    } else {
      bgCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
      nodeCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
      moveEdgeCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
      edgeCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
      moveNodeCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
    }
  }

  draw = (
    redrawType = RedrawType.ALL,
    excludeIds?: Set<number>,
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) => {
    const { edgeCtx, nodeCtx, nodes, edges } = this.state;

    if (redrawType === RedrawType.MOVE) {
      this.drawMove();
      return;
    }

    if (redrawType === RedrawType.ALL) this.drawBackground(vx, vy, vw, vh);

    this.state.quad.getDataInRegion(vx, vy, vw, vh, this.state.drawIds);

    if (redrawType !== RedrawType.EDGES) nodeCtx.clearRect(vx, vy, vw, vh);
    if (redrawType !== RedrawType.NODES) edgeCtx.clearRect(vx, vy, vw, vh);

    for (const id of this.state.drawIds) {
      if (excludeIds && excludeIds.has(id)) continue;

      if (redrawType !== RedrawType.EDGES && nodes[id])
        this.drawNode(nodes[id], false, vx, vy, vw, vh);

      if (redrawType !== RedrawType.NODES && edges[id])
        this.drawEdge(edges[id], false, vx, vy, vw, vh);
    }
  };

  drawMove = (
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) => {
    const { nodes, edges, nodeData, moveNodeCtx, moveEdgeCtx } = this.state;

    moveNodeCtx.clearRect(vx, vy, vw, vh);
    moveEdgeCtx.clearRect(vx, vy, vw, vh);

    this.moveEdgeIds.clear();

    for (const nodeId of this.state.moveNodeIds) {
      const ndd = nodeData[nodeId];

      for (const eid of ndd.sourceOfEdgeIds) {
        this.moveEdgeIds.add(eid);
      }

      for (const eid of ndd.targetOfEdgeIds) {
        this.moveEdgeIds.add(eid);
      }
    }

    for (const id of this.moveEdgeIds) {
      const edge = edges[id];

      this.drawEdge(edge, true, vx, vy, vw, vh);
    }

    for (const id of this.state.moveNodeIds) {
      const node = nodes[id];

      this.drawNode(node, true, vx, vy, vw, vh);
    }
  };

  drawNode(
    node: Node,
    isMove = false,
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    const { nodeCtx, moveNodeCtx, options, nodeData } = this.state;

    if (!this.isNodeInView(node, vx, vy, vw, vh)) return;

    const ctx = isMove ? moveNodeCtx : nodeCtx;

    const selected = this.state.selectedIds.has(node.id);
    const hovered = this.state.hoveredId === node.id;

    const data = nodeData[node.id];

    // check is in view
    const shape = data.shape;

    // draw shape
    ctx.strokeStyle = selected
      ? options.nodeSelectedLineColor
      : hovered
      ? options.nodeHoveredLineColor
      : options.nodeLineColor;
    ctx.fillStyle = selected ? options.nodeSelectedColor : options.nodeColor;
    ctx.lineWidth = options.nodeLineWidth;

    if (!data.path) {
      this.createNodePath(node);
    }

    if (data.path) {
      ctx.fill(data.path);
      ctx.stroke(data.path);
    }

    // draw content
    ctx.fillStyle = selected
      ? options.nodeSelectedContentColor
      : options.nodeContentColor;
    ctx.textAlign = options.nodeTextAlign;
    ctx.textBaseline = options.nodeTextBaseline;
    ctx.font = options.nodeFont;

    shape.drawContent(ctx, node.x, node.y, shape.width, shape.height, node.id);
  }

  drawEdge(
    edge: Edge,
    isMove = false,
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    const { edgeCtx, moveEdgeCtx, options, edgeData } = this.state;

    const ctx = isMove ? moveEdgeCtx : edgeCtx;

    const selected = this.state.selectedIds.has(edge.id);
    const hovered = this.state.hoveredId === edge.id;

    const data = edgeData[edge.id];

    ctx.lineWidth = options.edgeLineWidth;
    ctx.strokeStyle = selected
      ? options.edgeSelectedLineColor
      : hovered
      ? options.edgeHoveredLineColor
      : options.edgeLineColor;

    // draw edge line
    if (this.isEdgeLineInView(edge, vx, vy, vw, vh)) {
      if (data.linePath) ctx.stroke(data.linePath);
    }

    // draw edge arrow
    if (this.isEdgeArrowInView(edge, vx, vy, vw, vh)) {
      ctx.fillStyle = selected
        ? options.edgeSelectedLineColor
        : hovered
        ? options.edgeHoveredLineColor
        : options.edgeLineColor;

      if (data.arrowPath) ctx.fill(data.arrowPath);
    }

    // draw shape and content
    const shape = data.shape;

    if (this.isEdgeShapeInView(edge, vx, vy, vw, vh)) {
      if (!data.path || !data.shapeX || !data.shapeY) return;

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

  drawBackground(
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    const { bgCtx, options } = this.state;

    const xt = -options.height * 0.5;
    const xr = options.width * 0.5;
    const xb = options.height * 0.5;
    const xl = -options.width * 0.5;

    const dl = Math.max(vx, xl);
    const dt = Math.max(vy, xt);
    const dr = Math.min(vx + vw, xr);
    const db = Math.min(vy + vh, xb);

    if (dl > vx || dt > vy || dr < vx + vw || db < vy + vh) {
      bgCtx.fillStyle = options.bgOutboundColor;
      bgCtx.fillRect(vx, vy, vw, vh);

      bgCtx.fillStyle = options.bgBorderColor;
      bgCtx.fillRect(
        dl - options.bgBorderWidth,
        dt - options.bgBorderWidth,
        dr - dl + options.bgBorderWidth * 2,
        db - dt + options.bgBorderWidth * 2
      );
    }

    bgCtx.fillStyle = options.bgColor;
    bgCtx.fillRect(dl, dt, dr - dl, db - dt);

    if (!options.bgShowDots) return;

    const lw = options.bgLineWidth;
    const gap = options.bgLineGap;

    bgCtx.strokeStyle = options.bgDotColor;
    bgCtx.lineWidth = lw;

    const bl = dl - lw * 0.5;
    const br = dr + lw * 0.5;
    const bt = dt - lw * 0.5;
    const bb = db + lw * 0.5;

    const ll = bl - (((bl % gap) - gap) % gap);
    const lr = br - (((br % gap) + gap) % gap);
    const lt = bt - (((bt % gap) - gap) % gap);
    const lb = bb - (((bb % gap) + gap) % gap);

    bgCtx.beginPath();

    for (let i = ll; i <= lr; i += gap) {
      bgCtx.moveTo(i, lt);
      bgCtx.lineTo(i, lb + gap);
    }

    bgCtx.lineCap = "round";
    bgCtx.setLineDash([0, gap]);
    bgCtx.stroke();
    bgCtx.setLineDash([]);
    bgCtx.lineCap = "square";
  }

  clearDragLine = () => {
    const { moveEdgeCtx, viewX, viewY, viewW, viewH } = this.state;
    moveEdgeCtx.clearRect(viewX, viewY, viewW, viewH);
  };

  isNodeInView(
    node: Node,
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    const { nodeData } = this.state;

    const { shape } = nodeData[node.id];

    return rectIntersect(
      node.x - shape.width * 0.5,
      node.y - shape.height * 0.5,
      shape.width,
      shape.height,
      vx,
      vy,
      vw,
      vh
    );
  }

  createNodePath(node: Node) {
    const { nodeData } = this.state;

    const data = nodeData[node.id];

    data.path = data.shape.createPath(
      node.x,
      node.y,
      data.shape.width,
      data.shape.height,
      node.id
    );
  }

  isEdgeInView(
    edge: Edge,
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    return (
      this.isEdgeArrowInView(edge, vx, vy, vw, vh) ||
      this.isEdgeLineInView(edge, vx, vy, vw, vh) ||
      this.isEdgeShapeInView(edge, vx, vy, vw, vh)
    );
  }

  isEdgeLineInView(
    edge: Edge,
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    const { options, edgeData } = this.state;

    const data = edgeData[edge.id];

    if (
      data.lineSourceX === undefined ||
      data.lineSourceY === undefined ||
      data.lineTargetX === undefined ||
      data.lineTargetY === undefined
    )
      this.createEdgePath(edge, data.shape);

    if (
      data.lineSourceX === undefined ||
      data.lineSourceY === undefined ||
      data.lineTargetX === undefined ||
      data.lineTargetY === undefined
    )
      return;

    const sx = data.lineSourceX;
    const sy = data.lineSourceY;
    const tx = data.lineTargetX;
    const ty = data.lineTargetY;

    const lsz = Math.max(options.edgeLineWidth, options.nodeLineWidth);
    vx -= lsz;
    vy -= lsz;
    vw += lsz * 2;
    vh += lsz * 2;

    return (
      isLineInsideRect(sx, sy, tx, ty, vx, vy, vw, vh) ||
      lineIntersect(sx, sy, tx, ty, vx, vy, vx, vy + vh) ||
      lineIntersect(sx, sy, tx, ty, vx, vy + vh, vx + vw, vy + vh) ||
      lineIntersect(sx, sy, tx, ty, vx + vw, vy + vh, vx + vw, vy) ||
      lineIntersect(sx, sy, tx, ty, vx + vw, vy, vx, vy)
    );
  }

  isEdgeArrowInView(
    edge: Edge,
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    const { options, edgeData } = this.state;

    const data = edgeData[edge.id];

    if (data.lineTargetX === undefined || data.lineTargetY === undefined)
      this.createEdgePath(edge, data.shape);
    if (data.lineTargetX === undefined || data.lineTargetY === undefined)
      return;

    const tx = data.lineTargetX;
    const ty = data.lineTargetY;

    const lsz = Math.max(options.edgeLineWidth, options.nodeLineWidth);
    vx -= lsz;
    vy -= lsz;
    vw += lsz * 2;
    vh += lsz * 2;
    const sz = Math.max(options.edgeArrowWidth, options.edgeArrowHeight);

    return rectIntersect(tx - sz, ty - sz, sz * 2, sz * 2, vx, vy, vw, vh);
  }

  isEdgeShapeInView(
    edge: Edge,
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    const { options, edgeData } = this.state;

    const data = edgeData[edge.id];

    if (data.shapeX === undefined || data.shapeY === undefined)
      this.createEdgePath(edge, data.shape);
    if (data.shapeX === undefined || data.shapeY === undefined) return;

    const lsz = Math.max(options.edgeLineWidth, options.nodeLineWidth);
    vx -= lsz;
    vy -= lsz;
    vw += lsz * 2;
    vh += lsz * 2;

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

  createEdgePath(edge: Edge, shape: GraphShape) {
    const { options, nodes, nodeData, edgeData } = this.state;
    const { sourceId, targetId } = edge;

    const source = nodes[sourceId];
    const sourceData = nodeData[sourceId];

    const target = nodes[targetId];
    const targetData = nodeData[targetId];

    if (!sourceData.path) this.createNodePath(source);
    if (!targetData.path) this.createNodePath(target);

    if (!sourceData.path) return;
    if (!targetData.path) return;

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
      sourceData.path
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
      targetData.path
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

    const data = edgeData[edge.id];

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

  getIntersectionPoint(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    path: Path2D
  ) {
    const { bgCtx } = this.state;

    const dx = tx - sx;
    const dy = ty - sy;

    const e = (Math.abs(dx) + Math.abs(dy)) | 0;

    let start = 0;
    let end = e;

    while (start <= end) {
      const mid = ((start + end) / 2) | 0;

      const x = sx + (mid / e) * dx;
      const y = sy + (mid / e) * dy;

      this.view.canvasPosFromViewPos(this.cp, x, y);

      if (bgCtx.isPointInPath(path, this.cp[0], this.cp[1])) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }

    return start / e;
  }

  drawDragLine = () => {
    const {
      moveEdgeCtx,
      options,
      dragLineSourceNode,
      dragLineX,
      dragLineY,
      viewX,
      viewY,
      viewW,
      viewH
    } = this.state;

    if (!dragLineSourceNode) return;

    moveEdgeCtx.clearRect(viewX, viewY, viewW, viewH);

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

    moveEdgeCtx.lineWidth = options.edgeLineWidth;
    moveEdgeCtx.strokeStyle = options.edgeLineColor;
    moveEdgeCtx.fillStyle = options.edgeLineColor;

    moveEdgeCtx.beginPath();
    moveEdgeCtx.moveTo(sx, sy);
    moveEdgeCtx.lineTo(tx, ty);
    moveEdgeCtx.stroke();

    moveEdgeCtx.beginPath();
    moveEdgeCtx.moveTo(tx, ty);
    moveEdgeCtx.lineTo(lp1x, lp1y);
    moveEdgeCtx.lineTo(lp2x, lp2y);
    moveEdgeCtx.closePath();
    moveEdgeCtx.fill();
  };
}

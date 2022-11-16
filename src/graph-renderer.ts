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

  requestDraw() {
    if (!this.state.isDrawing) {
      requestAnimationFrame(this.requestDrawHandler);
    }

    this.state.isDrawing = true;
  }

  requestDrawHandler = () => {
    this.state.isDrawing = false;
    this.drawAll();
  };

  applyTransform() {
    const { scale, translateX, translateY, bgCtx, nodeCtx, edgeCtx, moveCtx } =
      this.state;

    bgCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
    nodeCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
    edgeCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
    moveCtx.setTransform(scale, 0, 0, scale, translateX, translateY);

    this.state.setView();
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
      const [cx, cy] = this.view.getCanvasPosFromViewPos(x, y);

      if (bgCtx.isPointInPath(path, cx, cy)) {
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

  clear = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  drawUncoveredRegion = (
    ovx: number,
    ovy: number,
    ovw: number,
    ovh: number,
    nvx = this.state.viewX,
    nvy = this.state.viewY,
    nvw = this.state.viewW,
    nvh = this.state.viewH
  ) => {
    const ovt = ovy;
    const ovr = ovx + ovw;
    const ovb = ovy + ovh;
    const ovl = ovx;

    const nvt = nvy;
    const nvr = nvx + nvw;
    const nvb = nvy + nvh;
    const nvl = nvx;

    // const ct = Math.max(ovt, nvt);
    // const cr = Math.min(ovr, nvr);
    // const cb = Math.min(ovb, nvb);
    // const cl = Math.max(ovl, nvl);

    const { bgCtx, nodeCtx, edgeCtx, moveCtx } = this.state;

    bgCtx.drawImage(bgCtx.canvas, ovx, ovy);

    moveCtx.clearRect(nvx, nvy, nvw, nvh);
    moveCtx.drawImage(edgeCtx.canvas, nvx, nvy, nvw, nvh);
    edgeCtx.clearRect(nvx, nvy, nvw, nvh);
    edgeCtx.drawImage(moveCtx.canvas, ovx, ovy);

    moveCtx.clearRect(nvx, nvy, nvw, nvh);
    moveCtx.drawImage(nodeCtx.canvas, nvx, nvy, nvw, nvh);
    nodeCtx.clearRect(nvx, nvy, nvw, nvh);
    nodeCtx.drawImage(moveCtx.canvas, ovx, ovy);

    if (nvt < ovt) {
      const tt = nvt;
      const tr = nvr;
      const tb = ovt;
      const tl = nvl;

      // console.log("atas");
      this.drawAll(tl, tt, tr - tl, tb - tt);
    }

    if (nvr > ovr) {
      const rt = Math.max(nvt, ovt);
      const rr = nvr;
      const rb = Math.min(nvb, ovb);
      const rl = ovr;

      // console.log("kanan");
      this.drawAll(rl, rt, rr - rl, rb - rt);
    }

    if (nvb > ovb) {
      const bt = ovb;
      const br = nvr;
      const bb = nvb;
      const bl = nvl;

      // console.log(bt, br, bb, bl);
      this.drawAll(bl, bt, br - bl, bb - bt);
    }

    if (nvl < ovl) {
      const lt = Math.max(nvt, ovt);
      const lr = ovl;
      const lb = Math.min(nvb, ovb);
      const ll = nvl;

      // console.log(lt, lr, lb, ll);
      this.drawAll(ll, lt, lr - ll, lb - lt);
    }
  };

  drawAll = (
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) => {
    const { edgeCtx, nodeCtx, nodes, edges } = this.state;

    nodeCtx.clearRect(vx, vy, vw, vh);
    edgeCtx.clearRect(vx, vy, vw, vh);

    this.drawBackground(vx, vy, vw, vh);

    for (const edge of Object.values(edges))
      this.drawEdge(edge, false, vx, vy, vw, vh);
    for (const node of Object.values(nodes))
      this.drawNode(node, false, vx, vy, vw, vh);
  };

  redrawNodes = (excludeIds?: Set<number>) => {
    const { nodes, nodeCtx, viewX, viewY, viewW, viewH } = this.state;

    nodeCtx.clearRect(viewX, viewY, viewW, viewH);

    for (const node of Object.values(nodes)) {
      if (excludeIds && excludeIds.has(node.id)) continue;

      this.drawNode(node);
    }
  };

  redrawEdges = (excludeIds?: Set<number>) => {
    const { edges, edgeCtx, viewX, viewY, viewW, viewH } = this.state;

    edgeCtx.clearRect(viewX, viewY, viewW, viewH);

    for (const edge of Object.values(edges)) {
      if (excludeIds && excludeIds.has(edge.id)) continue;

      this.drawEdge(edge);
    }
  };

  clearNodes = () => {
    const { nodeCtx, viewX, viewY, viewW, viewH } = this.state;
    nodeCtx.clearRect(viewX, viewY, viewW, viewH);
  };

  clearEdges = () => {
    const { edgeCtx, viewX, viewY, viewW, viewH } = this.state;
    edgeCtx.clearRect(viewX, viewY, viewW, viewH);
  };

  clearMove = () => {
    const { moveCtx, viewX, viewY, viewW, viewH } = this.state;
    moveCtx.clearRect(viewX, viewY, viewW, viewH);
  };

  drawDragLine = () => {
    const {
      moveCtx,
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

    moveCtx.clearRect(viewX, viewY, viewW, viewH);

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

    moveCtx.lineWidth = options.edgeLineWidth;
    moveCtx.strokeStyle = options.edgeLineColor;
    moveCtx.fillStyle = options.edgeLineColor;

    moveCtx.beginPath();
    moveCtx.moveTo(sx, sy);
    moveCtx.lineTo(tx, ty);
    moveCtx.stroke();

    moveCtx.beginPath();
    moveCtx.moveTo(tx, ty);
    moveCtx.lineTo(lp1x, lp1y);
    moveCtx.lineTo(lp2x, lp2y);
    moveCtx.closePath();
    moveCtx.fill();
  };

  drawEdge(
    edge: Edge,
    isMove = false,
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    const { edgeCtx, moveCtx, options, drawData } = this.state;

    const ctx = isMove ? moveCtx : edgeCtx;

    const selected = this.state.selectedIds.has(edge.id);
    const hovered = this.state.hoveredId === edge.id;

    const data = drawData[edge.id] as EdgeDrawData;

    ctx.lineWidth = options.edgeLineWidth;
    ctx.strokeStyle = selected
      ? options.edgeSelectedLineColor
      : hovered
      ? options.edgeHoveredLineColor
      : options.edgeLineColor;

    // draw edge line
    if (this.isEdgeLineInView(edge, vx, vy, vw, vh)) {
      ctx.stroke(data.linePath);
    }

    // draw edge arrow
    if (this.isEdgeArrowInView(edge, vx, vy, vw, vh)) {
      ctx.fillStyle = selected
        ? options.edgeSelectedLineColor
        : hovered
        ? options.edgeHoveredLineColor
        : options.edgeLineColor;

      ctx.fill(data.arrowPath);
    }

    // draw shape and content
    const shape = data.shape;

    if (this.isEdgeShapeInView(edge, vx, vy, vw, vh)) {
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

  isNodeInView(
    node: Node,
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    const { drawData } = this.state;

    const { shape } = drawData[node.id] as NodeDrawData;

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
    const { options, drawData } = this.state;

    const data = drawData[edge.id] as EdgeDrawData;

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
    const { options, drawData } = this.state;

    const data = drawData[edge.id] as EdgeDrawData;
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
    const { options, drawData } = this.state;

    const data = drawData[edge.id] as EdgeDrawData;

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

  drawNode(
    node: Node,
    isMove = false,
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    const { nodeCtx, moveCtx, options, drawData } = this.state;

    const ctx = isMove ? moveCtx : nodeCtx;

    const selected = this.state.selectedIds.has(node.id);
    const hovered = this.state.hoveredId === node.id;

    const data = drawData[node.id] as NodeDrawData;

    // check is in view
    const shape = data.shape;
    if (this.isNodeInView(node, vx, vy, vw, vh)) {
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

      shape.drawContent(
        ctx,
        node.x,
        node.y,
        shape.width,
        shape.height,
        node.id
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

    bgCtx.fillStyle = options.bgColor;
    bgCtx.fillRect(vx, vy, vw, vh);

    if (!options.bgShowDots) return;

    const lw = options.bgLineWidth;
    const gap = options.bgLineGap;

    bgCtx.strokeStyle = options.bgDotColor;
    bgCtx.lineWidth = lw;

    const bl = vx - lw * 0.5;
    const br = vx + vw + lw * 0.5;
    const bt = vy - lw * 0.5;
    const bb = vy + vh + lw * 0.5;

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
}

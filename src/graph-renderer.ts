import { GENode, GEEdge, GEGridType } from "./types";
import { GEState } from "./state";

const TEXT_ALIGN = "center";
const TEXT_BASELINE = "middle";
const LINE_CAP_ROUND = "round";
const LINE_CAP_SQUARE = "square";

export class GEGraphRenderer {
  state: GEState;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(view: GEState, canvas: HTMLCanvasElement) {
    this.state = view;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
  }

  requestDraw(): void {
    if (!this.state.isDrawing) {
      requestAnimationFrame(this.draw);
    }

    this.state.isDrawing = true;
  }

  draw = (): void => {
    this.state.isDrawing = false;
    this.state.hoveredNodeId = 0;
    this.state.hoveredEdgeId = 0;

    this.drawBackground();

    this.ctx.transform(
      this.state.scale,
      0,
      0,
      this.state.scale,
      this.state.translateX,
      this.state.translateY
    );

    this.drawGraph();

    this.ctx.resetTransform();
  };

  drawBackground(): void {
    const { canvas, ctx } = this;
    const { translateX, translateY, scale, options } = this.state;

    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!options.showGrid) return;

    const lw = options.gridLineWidth * scale;
    const gap = options.gridDotGap * scale;

    const offsetX = (translateX % gap) - lw;
    const offsetY = (translateY % gap) - lw;

    ctx.strokeStyle = options.gridColor;
    ctx.lineWidth = lw;

    if (options.gridType === GEGridType.DOTS) {
      ctx.beginPath();

      for (let i = offsetX; i < canvas.width + lw; i += gap) {
        ctx.moveTo(i, offsetY);
        ctx.lineTo(i, canvas.height + lw);
      }

      ctx.lineCap = LINE_CAP_ROUND;
      ctx.setLineDash([0, gap]);
      ctx.stroke();
      ctx.setLineDash([0]);
      ctx.lineCap = LINE_CAP_SQUARE;
    } else {
      ctx.beginPath();

      for (let i = offsetX; i < canvas.width + lw; i += gap) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
      }

      for (let i = offsetY; i < canvas.height + lw; i += gap) {
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
      }

      ctx.stroke();
    }
  }

  drawGraph(): void {
    this.state.graph.edges.forEach(this.drawEdge);

    this.drawDragLine();

    this.state.graph.nodes.forEach(this.drawNode);
  }

  isNodeOutOfView(node: GENode): boolean {
    const { canvas } = this;
    const { translateX, translateY, scale } = this.state;

    return (
      (node.x + node.r) * scale + translateX < 0 ||
      (node.y + node.r) * scale + translateY < 0 ||
      (node.x - node.r) * scale + translateX > canvas.width ||
      (node.y - node.r) * scale + translateY > canvas.height
    );
  }

  isEdgeOutOfView(edge: GEEdge): boolean {
    const { canvas } = this;
    const { translateX, translateY, scale, graph, options } = this.state;

    const source = graph.nodes.get(edge.sourceNodeId);
    const target = graph.nodes.get(edge.targetNodeId);

    const sourceX = source.x * scale + translateX;
    const sourceY = source.y * scale + translateY;
    const targetX = target.x * scale + translateX;
    const targetY = target.y * scale + translateY;

    return (
      (sourceX < -options.edgeRectWidth && targetX < -options.edgeRectWidth) ||
      (sourceY < -options.edgeRectHeight &&
        targetY < -options.edgeRectHeight) ||
      (sourceX > canvas.width + options.edgeRectWidth &&
        targetX > canvas.width + options.edgeRectWidth) ||
      (sourceY > canvas.height + options.edgeRectHeight &&
        targetY > canvas.height + options.edgeRectHeight)
    );
  }

  drawNode = (node: GENode): void => {
    if (this.isNodeOutOfView(node)) return;

    const { ctx } = this;
    const { pointerCanvasX, pointerCanvasY, options } = this.state;

    ctx.strokeStyle = options.nodeStrokeColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);

    if (ctx.isPointInPath(pointerCanvasX, pointerCanvasY)) {
      this.state.hoveredNodeId = node.id;
    }

    if (node.id === this.state.selectedNodeId) {
      ctx.strokeStyle = options.nodeSelectedColor;
      ctx.fillStyle = options.nodeSelectedColor;
    } else if (node.id === this.state.hoveredNodeId) {
      ctx.strokeStyle = options.nodeSelectedColor;
      ctx.fillStyle = options.nodeColor;
    } else {
      ctx.strokeStyle = options.nodeStrokeColor;
      ctx.fillStyle = options.nodeColor;
    }

    ctx.fill();
    ctx.stroke();

    if (node.id === this.state.selectedNodeId) {
      ctx.fillStyle = options.nodeSelectedTextColor;
    } else {
      ctx.fillStyle = options.nodeTextColor;
    }

    ctx.font = options.nodeTextStyle;
    ctx.textAlign = TEXT_ALIGN;
    ctx.textBaseline = TEXT_BASELINE;

    ctx.fillText(node.text, node.x, node.y);
  };

  drawDragLine(): void {
    if (!this.state.isCreatingEdge) return;

    const { ctx } = this;
    const { pointerViewX, pointerViewY, graph, options } = this.state;

    const targetX = pointerViewX;
    const targetY = pointerViewY;

    const source = graph.nodes.get(this.state.drageLineSourceNodeId);
    const dx = targetX - source.x;
    const dy = targetY - source.y;

    const rad = Math.atan2(dy, dx);
    const sinr = Math.sin(rad);
    const cosr = Math.cos(rad);

    // calculate the start and end points of the line
    const startX = source.x;
    const startY = source.y;
    const endX = targetX - cosr * 3;
    const endY = targetY - sinr * 3;
    const edgeLineOffset =
      options.edgeArrowLength * Math.cos(options.edgeArrowRadian);
    const lineEndX = targetX - cosr * edgeLineOffset;
    const lineEndY = targetY - sinr * edgeLineOffset;

    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - options.edgeArrowLength * Math.cos(rad - options.edgeArrowRadian),
      endY - options.edgeArrowLength * Math.sin(rad - options.edgeArrowRadian)
    );
    ctx.lineTo(
      endX - options.edgeArrowLength * Math.cos(rad + options.edgeArrowRadian),
      endY - options.edgeArrowLength * Math.sin(rad + options.edgeArrowRadian)
    );
    ctx.lineTo(endX, endY);
    ctx.closePath();

    ctx.strokeStyle = options.edgeLineColor;
    ctx.fillStyle = options.edgeLineColor;

    ctx.stroke();
    ctx.fill();
  }

  drawEdge = (edge: GEEdge): void => {
    if (this.isEdgeOutOfView(edge)) return;

    const { ctx } = this;
    const { pointerCanvasX, pointerCanvasY, graph, options } = this.state;

    const source = graph.nodes.get(edge.sourceNodeId);
    const target = graph.nodes.get(edge.targetNodeId);
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    const rad = Math.atan2(dy, dx);
    const sinr = Math.sin(rad);
    const cosr = Math.cos(rad);

    // calculate the start and end points of the line
    const startX = source.x + cosr * source.r;
    const startY = source.y + sinr * source.r;
    const endX = target.x - cosr * (target.r + 3);
    const endY = target.y - sinr * (target.r + 3);
    const edgeLineOffset =
      options.edgeArrowLength * Math.cos(options.edgeArrowRadian);
    const lineEndX = target.x - cosr * (target.r + edgeLineOffset);
    const lineEndY = target.y - sinr * (target.r + edgeLineOffset);

    ctx.lineWidth = 2;

    const midX = (startX + endX) * 0.5;
    const midY = (startY + endY) * 0.5;

    // this is just to check if the rect is hovered
    ctx.beginPath();
    this.roundedRect(
      midX - options.edgeRectWidth * 0.5,
      midY - options.edgeRectHeight * 0.5,
      options.edgeRectWidth,
      options.edgeRectHeight
    );

    if (
      ctx.isPointInPath(pointerCanvasX, pointerCanvasY) ||
      ctx.isPointInStroke(pointerCanvasX, pointerCanvasY)
    ) {
      this.state.hoveredEdgeId = edge.id;
    }

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - options.edgeArrowLength * Math.cos(rad - options.edgeArrowRadian),
      endY - options.edgeArrowLength * Math.sin(rad - options.edgeArrowRadian)
    );
    ctx.lineTo(
      endX - options.edgeArrowLength * Math.cos(rad + options.edgeArrowRadian),
      endY - options.edgeArrowLength * Math.sin(rad + options.edgeArrowRadian)
    );
    ctx.lineTo(endX, endY);
    ctx.closePath();

    if (
      ctx.isPointInPath(pointerCanvasX, pointerCanvasY) ||
      ctx.isPointInStroke(pointerCanvasX, pointerCanvasY)
    ) {
      this.state.hoveredEdgeId = edge.id;
    }

    if (edge.id === this.state.selectedEdgeId) {
      ctx.strokeStyle = options.edgeLineSelectedColor;
      ctx.fillStyle = options.edgeLineSelectedColor;
    } else if (edge.id === this.state.hoveredEdgeId) {
      ctx.strokeStyle = options.edgeLineHoverColor;
      ctx.fillStyle = options.edgeLineHoverColor;
    } else {
      ctx.strokeStyle = options.edgeLineColor;
      ctx.fillStyle = options.edgeLineColor;
    }

    ctx.stroke();
    ctx.fill();

    ctx.beginPath();
    this.roundedRect(
      midX - options.edgeRectWidth * 0.5,
      midY - options.edgeRectHeight * 0.5,
      options.edgeRectWidth,
      options.edgeRectHeight
    );

    if (edge.id === this.state.selectedEdgeId) {
      ctx.fillStyle = options.edgeLineSelectedColor;
    } else {
      ctx.fillStyle = options.edgeRectFillColor;
    }

    ctx.fill();
    ctx.stroke();

    if (edge.id === this.state.selectedEdgeId) {
      ctx.fillStyle = options.edgeSelectedTextColor;
    } else {
      ctx.fillStyle = options.edgeTextColor;
    }
    ctx.font = options.edgeTextStyle;
    ctx.textAlign = TEXT_ALIGN;
    ctx.textBaseline = TEXT_BASELINE;
    ctx.fillText(edge.text, midX, midY);
  };

  roundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius = 8
  ): void {
    const { ctx } = this;

    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

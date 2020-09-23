import { GEGraph } from "./graph";
import { GENode, GEEdge } from "./types";
import { GEView } from "./view";

export const NODE_RADIUS = 80;
const EDGE_ARROW_LEN = 16;
const EDGE_ARROW_RAD = Math.PI / 6;
const EDGE_LINE_OFF = EDGE_ARROW_LEN * Math.cos(EDGE_ARROW_RAD);
const EDGE_RECT_WIDTH = 48;
const EDGE_RECT_HEIGHT = 24;
const BG_COLOR = "#EDF2F7";
const BG_CIRCLE_COLOR = "#CBD5E0";
const BG_CIRCLE_RADIUS = 8;
const BG_CIRCLE_GAP = 128;
const NODE_FILL_COLOR = "white";
const NODE_HOVER_COLOR = "#B2F5EA";
const NODE_SELECTED_COLOR = "#FED7E2";
const NODE_STROKE_COLOR = "black";
const EDGE_LINE_COLOR = "black";
const EDGE_LINE_HOVER_COLOR = "#81E6D9";
const EDGE_LINE_SELECTED_COLOR = "#FBB6CE";
const EDGE_RECT_FILL_COLOR = "white";
const EDGE_TEXT_COLOR = "#1A202C";
const EDGE_TEXT_FONT = "16px sans-serif";
const EDGE_TEXT_ALIGN = "center";
const EDGE_TEXT_BASELINE = "middle";
const EDGE_TEXT = "35";

export class GEGraphRenderer {
  graph: GEGraph;
  view: GEView;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(graph: GEGraph, view: GEView, canvas: HTMLCanvasElement) {
    this.graph = graph;
    this.view = view;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
  }

  draw = (): void => {
    this.view.isDrawing = false;
    this.view.hoveredNodeId = 0;
    this.view.hoveredEdgeId = 0;

    this.drawBackground();

    this.ctx.transform(
      this.view.scale,
      0,
      0,
      this.view.scale,
      this.view.translateX,
      this.view.translateY
    );

    this.drawGraph();

    this.ctx.resetTransform();
  };

  drawBackground(): void {
    const { canvas, ctx } = this;
    const { translateX, translateY, scale } = this.view;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const r = BG_CIRCLE_RADIUS * scale;
    const gap = BG_CIRCLE_GAP * scale;

    const offsetX = (translateX % gap) - r;
    const offsetY = (translateY % gap) - r;

    for (let i = offsetX; i < canvas.width + r; i += gap) {
      for (let j = offsetY; j < canvas.height + r; j += gap) {
        ctx.beginPath();
        ctx.arc(i, j, r, 0, Math.PI * 2);

        ctx.fillStyle = BG_CIRCLE_COLOR;
        ctx.fill();
      }
    }
  }

  drawGraph(): void {
    this.graph.edges.forEach(this.drawEdge);

    this.drawDragLine();

    this.graph.nodes.forEach(this.drawNode);
  }

  isNodeOutOfView(node: GENode): boolean {
    const { canvas } = this;
    const { translateX, translateY, scale } = this.view;

    return (
      (node.x + NODE_RADIUS) * scale + translateX < 0 ||
      (node.y + NODE_RADIUS) * scale + translateY < 0 ||
      (node.x - NODE_RADIUS) * scale + translateX > canvas.width ||
      (node.y - NODE_RADIUS) * scale + translateY > canvas.height
    );
  }

  isEdgeOutOfView(edge: GEEdge): boolean {
    const { canvas } = this;
    const { translateX, translateY, scale } = this.view;

    const source = this.graph.nodes.get(edge.sourceNodeId);
    const target = this.graph.nodes.get(edge.targetNodeId);

    const sourceX = source.x * scale + translateX;
    const sourceY = source.y * scale + translateY;
    const targetX = target.x * scale + translateX;
    const targetY = target.y * scale + translateY;

    return (
      (sourceX < -EDGE_RECT_WIDTH && targetX < -EDGE_RECT_WIDTH) ||
      (sourceY < -EDGE_RECT_HEIGHT && targetY < -EDGE_RECT_HEIGHT) ||
      (sourceX > canvas.width + EDGE_RECT_WIDTH &&
        targetX > canvas.width + EDGE_RECT_WIDTH) ||
      (sourceY > canvas.height + EDGE_RECT_HEIGHT &&
        targetY > canvas.height + EDGE_RECT_HEIGHT)
    );
  }

  drawNode = (node: GENode): void => {
    if (this.isNodeOutOfView(node)) return;

    const { ctx } = this;
    const { pointerCanvasX, pointerCanvasY } = this.view;

    ctx.strokeStyle = NODE_STROKE_COLOR;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);

    if (ctx.isPointInPath(pointerCanvasX, pointerCanvasY)) {
      this.view.hoveredNodeId = node.id;
    }

    if (node.id === this.view.selectedNodeId) {
      ctx.fillStyle = NODE_SELECTED_COLOR;
    } else if (node.id === this.view.hoveredNodeId) {
      ctx.fillStyle = NODE_HOVER_COLOR;
    } else {
      ctx.fillStyle = NODE_FILL_COLOR;
    }

    ctx.fill();
    ctx.stroke();
  };

  drawDragLine(): void {
    if (!this.view.isCreatingEdge) return;

    const { ctx } = this;
    const { pointerViewX, pointerViewY } = this.view;

    const targetX = pointerViewX;
    const targetY = pointerViewY;

    const source = this.graph.nodes.get(this.view.drageLineSourceNodeId);
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
    const lineEndX = targetX - cosr * EDGE_LINE_OFF;
    const lineEndY = targetY - sinr * EDGE_LINE_OFF;

    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - EDGE_ARROW_LEN * Math.cos(rad - EDGE_ARROW_RAD),
      endY - EDGE_ARROW_LEN * Math.sin(rad - EDGE_ARROW_RAD)
    );
    ctx.lineTo(
      endX - EDGE_ARROW_LEN * Math.cos(rad + EDGE_ARROW_RAD),
      endY - EDGE_ARROW_LEN * Math.sin(rad + EDGE_ARROW_RAD)
    );
    ctx.lineTo(endX, endY);
    ctx.closePath();

    ctx.strokeStyle = EDGE_LINE_COLOR;
    ctx.fillStyle = EDGE_LINE_COLOR;

    ctx.stroke();
    ctx.fill();
  }

  drawEdge = (edge: GEEdge): void => {
    if (this.isEdgeOutOfView(edge)) return;

    const source = this.graph.nodes.get(edge.sourceNodeId);
    const target = this.graph.nodes.get(edge.targetNodeId);
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    const rad = Math.atan2(dy, dx);
    const sinr = Math.sin(rad);
    const cosr = Math.cos(rad);

    // calculate the start and end points of the line
    const startX = source.x + cosr * NODE_RADIUS;
    const startY = source.y + sinr * NODE_RADIUS;
    const endX = target.x - cosr * (NODE_RADIUS + 3);
    const endY = target.y - sinr * (NODE_RADIUS + 3);
    const lineEndX = target.x - cosr * (NODE_RADIUS + EDGE_LINE_OFF);
    const lineEndY = target.y - sinr * (NODE_RADIUS + EDGE_LINE_OFF);

    const { ctx } = this;
    const { pointerCanvasX, pointerCanvasY } = this.view;

    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - EDGE_ARROW_LEN * Math.cos(rad - EDGE_ARROW_RAD),
      endY - EDGE_ARROW_LEN * Math.sin(rad - EDGE_ARROW_RAD)
    );
    ctx.lineTo(
      endX - EDGE_ARROW_LEN * Math.cos(rad + EDGE_ARROW_RAD),
      endY - EDGE_ARROW_LEN * Math.sin(rad + EDGE_ARROW_RAD)
    );
    ctx.lineTo(endX, endY);
    ctx.closePath();

    if (
      ctx.isPointInPath(pointerCanvasX, pointerCanvasY) ||
      ctx.isPointInStroke(pointerCanvasX, pointerCanvasY)
    ) {
      this.view.hoveredEdgeId = edge.id;
    }

    if (edge.id === this.view.selectedEdgeId) {
      ctx.strokeStyle = EDGE_LINE_SELECTED_COLOR;
      ctx.fillStyle = EDGE_LINE_SELECTED_COLOR;
    } else if (edge.id === this.view.hoveredEdgeId) {
      ctx.strokeStyle = EDGE_LINE_HOVER_COLOR;
      ctx.fillStyle = EDGE_LINE_HOVER_COLOR;
    } else {
      ctx.strokeStyle = EDGE_LINE_COLOR;
      ctx.fillStyle = EDGE_LINE_COLOR;
    }

    ctx.stroke();
    ctx.fill();

    const midX = (startX + endX) * 0.5;
    const midY = (startY + endY) * 0.5;

    ctx.fillStyle = EDGE_RECT_FILL_COLOR;
    ctx.beginPath();
    this.roundedRect(
      midX - EDGE_RECT_WIDTH * 0.5,
      midY - EDGE_RECT_HEIGHT * 0.5,
      EDGE_RECT_WIDTH,
      EDGE_RECT_HEIGHT
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = EDGE_TEXT_COLOR;
    ctx.font = EDGE_TEXT_FONT;
    ctx.textAlign = EDGE_TEXT_ALIGN;
    ctx.textBaseline = EDGE_TEXT_BASELINE;
    ctx.fillText(EDGE_TEXT, midX, midY);
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

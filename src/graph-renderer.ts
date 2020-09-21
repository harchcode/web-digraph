import { GEGraph } from "./graph";
import { GENode, GEEdge } from "./types";
import { getScreenToViewPosition } from "./utils";

export const NODE_RADIUS = 80;
const EDGE_ARROW_LEN = 16;
const EDGE_ARROW_RAD = Math.PI / 6;
const EDGE_LINE_OFF = EDGE_ARROW_LEN * Math.cos(EDGE_ARROW_RAD);
const EDGE_RECT_WIDTH = 48;
const EDGE_RECT_HEIGHT = 24;
const BG_COLOR = "#EDF2F7";
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
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  isDrawing = false;
  translateX = 0;
  translateY = 0;
  scale = 1;

  pointerScreenX = 0;
  pointerScreenY = 0;
  pointerViewX = 0;
  pointerViewY = 0;
  selectedNodeId = 0;
  selectedEdgeId = 0;
  hoveredNodeId = 0;
  hoveredEdgeId = 0;

  constructor(graph: GEGraph, canvas: HTMLCanvasElement) {
    this.graph = graph;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  setPointerPos(screenX: number, screenY: number): void {
    this.pointerScreenX = screenX;
    this.pointerScreenY = screenY;

    [this.pointerViewX, this.pointerViewY] = getScreenToViewPosition(
      this.canvas,
      screenX,
      screenY,
      this.translateX,
      this.translateY,
      this.scale
    );
  }

  setTransform(translateX: number, translateY: number, scale: number): void {
    this.translateX = translateX;
    this.translateY = translateY;
    this.scale = scale;
  }

  moveView(dx: number, dy: number): void {
    this.translateX += dx;
    this.translateY += dy;
  }

  zoomView(deltaScale: number): void {
    this.scale += deltaScale;
  }

  resizeCanvas(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    this.requestDraw();
  }

  requestDraw(): void {
    if (!this.isDrawing) {
      requestAnimationFrame(this.draw);
    }

    this.isDrawing = true;
  }

  draw = (): void => {
    this.isDrawing = false;
    this.hoveredNodeId = 0;
    this.hoveredEdgeId = 0;

    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.transform(
      this.scale,
      0,
      0,
      this.scale,
      this.translateX,
      this.translateY
    );

    this.drawGraph();

    this.ctx.resetTransform();
  };

  drawGraph(): void {
    this.graph.edges.forEach(this.drawEdge);
    this.graph.nodes.forEach(this.drawNode);
  }

  isNodeOutOfView(node: GENode): boolean {
    const { canvas, translateX, translateY, scale } = this;

    return (
      (node.x + NODE_RADIUS) * scale + translateX < 0 ||
      (node.y + NODE_RADIUS) * scale + translateY < 0 ||
      (node.x - NODE_RADIUS) * scale + translateX > canvas.width ||
      (node.y - NODE_RADIUS) * scale + translateY > canvas.height
    );
  }

  isEdgeOutOfView(edge: GEEdge): boolean {
    const { canvas, translateX, translateY, scale } = this;

    const source = this.graph.nodes.get(edge.sourceNodeId);
    const target = this.graph.nodes.get(edge.targetNodeId);

    const sourceX = source.x * scale + translateX;
    const sourceY = source.y * scale + translateY;
    const targetX = target.x * scale + translateX;
    const targetY = target.y * scale + translateY;

    return (
      (sourceX < 0 && targetX < 0) ||
      (sourceY < 0 && targetY < 0) ||
      (sourceX > canvas.width && targetX > canvas.width) ||
      (sourceY > canvas.height && targetY > canvas.height)
    );
  }

  drawNode = (node: GENode): void => {
    if (this.isNodeOutOfView(node)) return;

    const { ctx, pointerScreenX, pointerScreenY } = this;

    ctx.strokeStyle = NODE_STROKE_COLOR;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);

    if (
      this.hoveredNodeId <= 0 &&
      ctx.isPointInPath(pointerScreenX, pointerScreenY)
    ) {
      this.hoveredNodeId = node.id;
    }

    if (node.id === this.selectedNodeId) {
      ctx.fillStyle = NODE_SELECTED_COLOR;
    } else if (node.id === this.hoveredNodeId) {
      ctx.fillStyle = NODE_HOVER_COLOR;
    } else {
      ctx.fillStyle = NODE_FILL_COLOR;
    }

    ctx.fill();
    ctx.stroke();
  };

  drawEdge = (edge: GEEdge): void => {
    if (this.isEdgeOutOfView(edge)) return;

    const source = this.graph.nodes.get(edge.sourceNodeId);
    const target = this.graph.nodes.get(edge.targetNodeId);
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const rad = Math.atan2(dy, dx);

    // calculate the start and end points of the line
    const startX = source.x + Math.cos(rad) * NODE_RADIUS;
    const startY = source.y + Math.sin(rad) * NODE_RADIUS;
    const endX = target.x - Math.cos(rad) * (NODE_RADIUS + 3);
    const endY = target.y - Math.sin(rad) * (NODE_RADIUS + 3);
    const lineEndX = target.x - Math.cos(rad) * (NODE_RADIUS + EDGE_LINE_OFF);
    const lineEndY = target.y - Math.sin(rad) * (NODE_RADIUS + EDGE_LINE_OFF);

    const { ctx, pointerScreenX, pointerScreenY } = this;

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
      this.hoveredEdgeId <= 0 &&
      (ctx.isPointInPath(pointerScreenX, pointerScreenY) ||
        ctx.isPointInStroke(pointerScreenX, pointerScreenY))
    ) {
      this.hoveredEdgeId = edge.id;
    }

    if (edge.id === this.selectedEdgeId) {
      ctx.strokeStyle = EDGE_LINE_SELECTED_COLOR;
      ctx.fillStyle = EDGE_LINE_SELECTED_COLOR;
    } else if (edge.id === this.hoveredEdgeId) {
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

    ctx.lineWidth = 1;
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

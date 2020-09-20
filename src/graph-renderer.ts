import { GEGraph } from "./graph";
import { GENode, GEEdge } from "./types";

const NODE_RADIUS = 80;
const EDGE_ARROW_LEN = 16;
const EDGE_ARROW_RAD = Math.PI / 6;
const EDGE_LINE_OFF = EDGE_ARROW_LEN * Math.cos(EDGE_ARROW_RAD);
const EDGE_RECT_WIDTH = 48;
const EDGE_RECT_HEIGHT = 24;

export class GEGraphRenderer {
  graph: GEGraph;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(graph: GEGraph, canvas: HTMLCanvasElement) {
    this.graph = graph;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  draw(): void {
    this.ctx.fillStyle = "#EDF2F7";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGraph();
  }

  drawGraph(): void {
    this.graph.edges.forEach(edge => {
      this.drawEdge(edge);
    });

    this.graph.nodes.forEach(node => {
      this.drawNode(node);
    });
  }

  drawNode = (node: GENode): void => {
    const { ctx } = this;

    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    // ctx.shadowColor = "#718096";
    // ctx.shadowBlur = 4;
    // ctx.shadowOffsetX = 0;
    // ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);

    ctx.fill();
    ctx.stroke();
  };

  drawEdge = (edge: GEEdge): void => {
    const source = this.graph.nodes.get(edge.sourceNodeId);
    const target = this.graph.nodes.get(edge.targetNodeId);
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const rad = Math.atan2(dy, dx);

    // calculate the start and end points of the line
    const startX = source.x + Math.cos(rad) * NODE_RADIUS;
    const startY = source.y + Math.sin(rad) * NODE_RADIUS;
    const endX = target.x - Math.cos(rad) * NODE_RADIUS;
    const endY = target.y - Math.sin(rad) * NODE_RADIUS;
    const lineEndX = target.x - Math.cos(rad) * (NODE_RADIUS + EDGE_LINE_OFF);
    const lineEndY = target.y - Math.sin(rad) * (NODE_RADIUS + EDGE_LINE_OFF);

    const { ctx } = this;

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.beginPath();
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
    ctx.fill();

    const midX = (startX + endX) * 0.5;
    const midY = (startY + endY) * 0.5;

    ctx.fillStyle = "white";
    ctx.beginPath();
    this.roundedRect(
      midX - EDGE_RECT_WIDTH * 0.5,
      midY - EDGE_RECT_HEIGHT * 0.5,
      EDGE_RECT_WIDTH,
      EDGE_RECT_HEIGHT
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1A202C";
    ctx.lineWidth = 1;
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("35", midX, midY);
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

import { GraphEdge, GraphNode, GraphView } from "./graph-view";
import { circleIntersection } from "./utils";

const LINE_CAP_ROUND = "round";
const LINE_CAP_SQUARE = "square";
const BG_COLOR = "#F7FAFC";
const GRID_COLOR = "#CBD5E0";

const NODE_COLOR = "#fff";
const LINE_COLOR = "#000";
const NODE_SIZE = 100;
const EDGE_SIZE = 16;
const NODE_STROKE_WIDTH = 2;

const EDGE_ARROW_LENGTH = 16;
const EDGE_ARROW_RADIAN = Math.PI / 6;

const linePath = new Path2D();
linePath.rect(0, 0, 1, 1);

const oneOver3 = 1 / 3;
const twoOver3 = 1 - oneOver3;
const lineArrowPath = new Path2D();
lineArrowPath.moveTo(-oneOver3, -0.5);
lineArrowPath.lineTo(-oneOver3, 0.5);
lineArrowPath.lineTo(twoOver3, 0);
lineArrowPath.closePath();

export class GraphRenderer<Node extends GraphNode, Edge extends GraphEdge> {
  view: GraphView<Node, Edge>;
  canvasPos: [number, number] = [0, 0];
  pos: [number, number] = [0, 0];

  constructor(view: GraphView<Node, Edge>) {
    this.view = view;
  }

  setToViewTransform() {
    const { ctx } = this.view;
    const [scale, translateX, translateY] = this.view.transform;

    ctx.setTransform(scale, 0, 0, scale, translateX, translateY);
  }

  draw() {
    const { nodes, edges, pointerPos, ctx } = this.view;

    this.view.setCanvasPosFromWindowPos(
      this.canvasPos,
      pointerPos[0],
      pointerPos[1]
    );
    this.view.hoveredNode = undefined;
    this.view.hoveredEdge = undefined;

    this.drawBackground();

    this.setToViewTransform();

    for (const node of nodes) {
      if (this.isNodeOutOfView(node)) continue;

      this.drawNode(node);
    }
    for (const edge of edges) {
      if (this.isEdgeOutOfView(edge)) continue;

      this.drawEdge(edge);
    }

    ctx.resetTransform();
  }

  drawBackground() {
    const { canvas, ctx, transform } = this.view;
    const [scale, translateX, translateY] = transform;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lw = 8 * scale;
    const gap = 64 * scale;

    const offsetX = (translateX % gap) - lw;
    const offsetY = (translateY % gap) - lw;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = lw;

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
  }

  isEdgeOutOfView(edge: Edge): boolean {
    const { canvas } = this.view;
    const [scale, translateX, translateY] = this.view.transform;

    const source = edge.source;
    const target = edge.target;

    const sourceX = source.x * scale + translateX;
    const sourceY = source.y * scale + translateY;
    const targetX = target.x * scale + translateX;
    const targetY = target.y * scale + translateY;

    const r = (edge.shape.size || EDGE_SIZE) * 0.5;

    return (
      (sourceX < -r && targetX < -r) ||
      (sourceY < -r && targetY < -r) ||
      (sourceX > canvas.width + r && targetX > canvas.width + r) ||
      (sourceY > canvas.height + r && targetY > canvas.height + r)
    );
  }

  drawEdgeLine(startX: number, startY: number, endX: number, endY: number) {
    const { ctx } = this.view;
    const [scale, translateX, translateY] = this.view.transform;

    const dx = endX - startX;
    const dy = endY - startY;

    const rad = Math.atan2(dy, dx);
    const sinr = Math.sin(rad);
    const cosr = Math.cos(rad);

    const lineLen = Math.abs(dy / sinr);
    const halfWidth = NODE_STROKE_WIDTH * 0.5;

    ctx.strokeStyle = LINE_COLOR;
    ctx.fillStyle = LINE_COLOR;

    ctx.translate(startX + halfWidth * sinr, startY - halfWidth * cosr);
    ctx.rotate(rad);
    ctx.scale(lineLen - EDGE_SIZE, NODE_STROKE_WIDTH);

    ctx.fill(linePath);

    const offset = EDGE_SIZE * twoOver3 + 1;

    ctx.setTransform(
      scale * EDGE_SIZE,
      0,
      0,
      scale * EDGE_SIZE,
      translateX + (endX - offset * cosr) * scale,
      translateY + (endY - offset * sinr) * scale
    );

    ctx.rotate(rad);

    ctx.fill(lineArrowPath);
  }

  drawEdge(edge: Edge) {
    if (this.isEdgeOutOfView(edge)) return;

    const { ctx, pointerPos } = this.view;
    const [scale, translateX, translateY] = this.view.transform;
    const { paths, render, size = NODE_SIZE } = edge.shape;

    const source = edge.source;
    const target = edge.target;

    source.shape.setIntersectionPoint?.(this.pos, source, target) ||
      circleIntersection(this.pos, source, target);

    const [startX, startY] = this.pos;

    source.shape.setIntersectionPoint?.(this.pos, target, source) ||
      circleIntersection(this.pos, target, source);

    const [endX, endY] = this.pos;

    this.drawEdgeLine(startX, startY, endX, endY);

    const midX = (startX + endX) * 0.5;
    const midY = (startY + endY) * 0.5;

    const rsize = size * 0.01;
    const halfSize = size * 0.5;

    ctx.setTransform(
      scale * rsize,
      0,
      0,
      scale * rsize,
      translateX + (midX - halfSize) * scale,
      translateY + (midY - halfSize) * scale
    );

    ctx.fillStyle = NODE_COLOR;
    ctx.lineWidth = NODE_STROKE_WIDTH / rsize;

    if (render) {
      render(ctx, edge, false);
    } else if (paths) {
      for (const path of paths) {
        ctx.fill(path);
        ctx.stroke(path);
      }
    }

    if (paths) {
      for (const path of paths) {
        if (ctx.isPointInPath(path, pointerPos[0], pointerPos[1])) {
          this.view.hoveredEdge = edge;
        }
      }
    } else if (render) {
      if (ctx.isPointInPath(pointerPos[0], pointerPos[1])) {
        this.view.hoveredEdge = edge;
      }
    }

    this.setToViewTransform();
  }

  isNodeOutOfView(node: GraphNode) {
    const { canvas } = this.view;
    const [scale, translateX, translateY] = this.view.transform;

    const r = (node.shape.size || NODE_SIZE) * 0.5;

    return (
      (node.x + r) * scale + translateX < 0 ||
      (node.y + r) * scale + translateY < 0 ||
      (node.x - r) * scale + translateX > canvas.width ||
      (node.y - r) * scale + translateY > canvas.height
    );
  }

  drawNode(node: Node) {
    const { canvasPos } = this;
    const { ctx } = this.view;
    const { paths, render, size = NODE_SIZE } = node.shape;

    const rsize = size * 0.01;
    const halfSize = size * 0.5;

    ctx.transform(rsize, 0, 0, rsize, node.x - halfSize, node.y - halfSize);

    ctx.fillStyle = NODE_COLOR;
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = NODE_STROKE_WIDTH / rsize;

    if (render) {
      render(ctx, node, false);
    } else if (paths) {
      for (const path of paths) {
        ctx.fill(path);
        ctx.stroke(path);
      }
    }

    if (paths) {
      for (const path of paths) {
        if (ctx.isPointInPath(path, canvasPos[0], canvasPos[1])) {
          this.view.hoveredEdge = undefined;
          this.view.hoveredNode = node;
        }
      }
    } else if (render) {
      if (ctx.isPointInPath(canvasPos[0], canvasPos[1])) {
        this.view.hoveredEdge = undefined;
        this.view.hoveredNode = node;
      }
    }

    this.setToViewTransform();
  }
}

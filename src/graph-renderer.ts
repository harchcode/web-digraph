import {
  EdgeShape,
  GraphEdge,
  GraphNode,
  GraphShape,
  GraphView,
  NodeShape
} from "./graph-view";
import { circleIntersection } from "./utils";

const LINE_CAP_ROUND = "round";
const LINE_CAP_SQUARE = "square";
const BG_COLOR = "#F7FAFC";
const GRID_COLOR = "#CBD5E0";

const NODE_COLOR = "#fff";
const LINE_COLOR = "#000";
const HOVER_LINE_COLOR = "#4299E1";
const NODE_SIZE = 100;
const EDGE_SIZE = 16;
const NODE_STROKE_WIDTH = 2;

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
  viewPos: [number, number] = [0, 0];
  out: [number, number] = [0, 0];

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
    this.view.setViewPosFromWindowPos(
      this.viewPos,
      this.canvasPos[0],
      this.canvasPos[1]
    );

    this.view.hoveredNode = undefined;
    this.view.hoveredEdge = undefined;

    this.drawBackground();

    this.setToViewTransform();

    for (const edge of edges) {
      if (this.isEdgeOutOfView(edge)) continue;

      this.drawEdge(edge);
    }

    for (const node of nodes) {
      if (this.isNodeOutOfView(node)) continue;

      this.drawNode(node);
    }

    if (this.view.hoveredEdge) {
      this.drawEdge(this.view.hoveredEdge, true);
    }

    if (this.view.hoveredNode) {
      this.drawNode(this.view.hoveredNode, true);
    }

    if (this.view.isCreatingEdge) {
      this.drawEdgeLine(
        this.view.dragLineSourcePos[0],
        this.view.dragLineSourcePos[1],
        this.viewPos[0],
        this.viewPos[1]
      );
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
    const { size } = edge.shape;

    const source = edge.source;
    const target = edge.target;

    const rx = (size ? size[0] : EDGE_SIZE) * 0.5 * scale;
    const ry = (size ? size[1] : EDGE_SIZE) * 0.5 * scale;

    const sourceX = source.x * scale + translateX;
    const sourceY = source.y * scale + translateY;
    const targetX = target.x * scale + translateX;
    const targetY = target.y * scale + translateY;

    return (
      (sourceX < -rx && targetX < -rx) ||
      (sourceY < -ry && targetY < -ry) ||
      (sourceX > canvas.width + rx && targetX > canvas.width + rx) ||
      (sourceY > canvas.height + ry && targetY > canvas.height + ry)
    );
  }

  drawEdgeLine(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    edge?: Edge,
    hovered = false
  ) {
    const { canvasPos } = this;
    const { ctx } = this.view;
    const [scale, translateX, translateY] = this.view.transform;

    const dx = endX - startX;
    const dy = endY - startY;

    const rad = Math.atan2(dy, dx);
    const sinr = Math.sin(rad);
    const cosr = Math.cos(rad);

    const lineLen = dy === 0 ? dx : Math.abs(dy / sinr);
    const halfWidth = NODE_STROKE_WIDTH * 0.5;

    ctx.fillStyle = hovered ? HOVER_LINE_COLOR : LINE_COLOR;

    ctx.translate(startX + halfWidth * sinr, startY - halfWidth * cosr);
    ctx.rotate(rad);
    ctx.scale(lineLen - EDGE_SIZE, NODE_STROKE_WIDTH);

    ctx.fill(linePath);

    if (
      edge &&
      !hovered &&
      ctx.isPointInPath(linePath, canvasPos[0], canvasPos[1])
    ) {
      this.view.hoveredEdge = edge;
    }

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

    if (
      edge &&
      !hovered &&
      ctx.isPointInPath(lineArrowPath, canvasPos[0], canvasPos[1])
    ) {
      this.view.hoveredEdge = edge;
    }
  }

  drawShape(nodeOrEdge: Node | Edge, shape: GraphShape, hovered = false) {
    const { canvasPos } = this;
    const { ctx } = this.view;
    const { paths, render } = shape;

    ctx.fillStyle = NODE_COLOR;
    ctx.strokeStyle = hovered ? HOVER_LINE_COLOR : LINE_COLOR;
    ctx.lineWidth = NODE_STROKE_WIDTH;

    if (render) {
      render(ctx, nodeOrEdge, false);
    } else if (paths) {
      for (const path of paths) {
        ctx.fill(path);
        ctx.stroke(path);
      }
    }

    if (hovered) return;

    if (paths) {
      for (const path of paths) {
        if (ctx.isPointInPath(path, canvasPos[0], canvasPos[1])) {
          if ("x" in nodeOrEdge) {
            this.view.hoveredEdge = undefined;
            this.view.hoveredNode = nodeOrEdge;
          } else {
            this.view.hoveredEdge = nodeOrEdge;
          }
        }
      }
    } else if (render) {
      if (ctx.isPointInPath(canvasPos[0], canvasPos[1])) {
        if ("x" in nodeOrEdge) {
          this.view.hoveredEdge = undefined;
          this.view.hoveredNode = nodeOrEdge;
        } else {
          this.view.hoveredEdge = nodeOrEdge;
        }
      }
    }
  }

  drawEdge(edge: Edge, hovered = false) {
    const { ctx } = this.view;
    const [scale, translateX, translateY] = this.view.transform;
    const { size } = edge.shape;

    const source = edge.source;
    const target = edge.target;

    source.shape.setIntersectionPoint?.(this.out, source, target) ||
      circleIntersection(this.out, source, target);

    const [startX, startY] = this.out;

    source.shape.setIntersectionPoint?.(this.out, target, source) ||
      circleIntersection(this.out, target, source);

    const [endX, endY] = this.out;

    this.drawEdgeLine(startX, startY, endX, endY, edge, hovered);

    const midX = (startX + endX) * 0.5;
    const midY = (startY + endY) * 0.5;

    const rx = (size ? size[0] : NODE_SIZE) * 0.5;
    const ry = (size ? size[1] : NODE_SIZE) * 0.5;

    ctx.setTransform(
      scale,
      0,
      0,
      scale,
      translateX + (midX - rx) * scale,
      translateY + (midY - ry) * scale
    );

    this.drawShape(edge, edge.shape as GraphShape, hovered);

    this.setToViewTransform();
  }

  setShapeSize(out: [number, number], shape: NodeShape | EdgeShape) {
    const { size } = shape;

    if (Array.isArray(size)) {
      out[0] = size[0];
      out[1] = size[1];

      return;
    }

    out[0] = size || NODE_SIZE;
    out[1] = size || NODE_SIZE;
  }

  isNodeOutOfView(node: GraphNode) {
    const { canvas } = this.view;
    const [scale, translateX, translateY] = this.view.transform;
    const { size } = node.shape;

    const rx = (size ? size[0] : NODE_SIZE) * 0.5;
    const ry = (size ? size[1] : NODE_SIZE) * 0.5;

    return (
      (node.x + rx) * scale + translateX < 0 ||
      (node.y + ry) * scale + translateY < 0 ||
      (node.x - rx) * scale + translateX > canvas.width ||
      (node.y - ry) * scale + translateY > canvas.height
    );
  }

  drawNode(node: Node, hovered = false) {
    const { ctx } = this.view;
    const { size } = node.shape;

    const rx = (size ? size[0] : NODE_SIZE) * 0.5;
    const ry = (size ? size[1] : NODE_SIZE) * 0.5;

    ctx.translate(node.x - rx, node.y - ry);

    this.drawShape(node, node.shape as GraphShape, hovered);

    this.setToViewTransform();
  }
}

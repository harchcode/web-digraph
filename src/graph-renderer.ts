import { GraphEdge, GraphNode, GraphShape, GraphView } from "./graph-view";
import { getIntersectionsOfLineAndRect } from "./utils";

const LINE_CAP_ROUND = "round";
const LINE_CAP_SQUARE = "square";
const BG_COLOR = "#F7FAFC";
const GRID_COLOR = "#CBD5E0";

const NODE_COLOR = "#fff";
const LINE_COLOR = "#000";
const HOVER_LINE_COLOR = "#4299E1";
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
  int: [[number, number], [number, number]] = [
    [0, 0],
    [0, 0]
  ];

  constructor(view: GraphView<Node, Edge>) {
    this.view = view;
  }

  setToViewTransform() {
    const { ctx } = this.view;
    const [scale, translateX, translateY] = this.view.transform;

    ctx.setTransform(scale, 0, 0, scale, translateX, translateY);
  }

  draw() {
    const { nodes, edges, pointerPos, ctx, movingNode } = this.view;

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

    this.view.hoveredNode = movingNode;
    this.view.hoveredEdge = undefined;

    this.drawBackground();

    this.setToViewTransform();

    for (const edge of edges) {
      this.drawEdge(edge);
    }

    for (const node of nodes) {
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

  drawEdgeLine(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    edge?: Edge,
    hovered = false,
    arrowX = endX,
    arrowY = endY
  ) {
    const { canvasPos } = this;
    const { ctx, movingNode } = this.view;
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
    ctx.scale(
      lineLen - (endX === arrowX && endY === arrowY ? EDGE_SIZE : 0),
      NODE_STROKE_WIDTH
    );

    ctx.fill(linePath);

    if (
      !movingNode &&
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
      translateX + (arrowX - offset * cosr) * scale,
      translateY + (arrowY - offset * sinr) * scale
    );

    ctx.rotate(rad);

    ctx.fill(lineArrowPath);

    if (
      !movingNode &&
      edge &&
      !hovered &&
      ctx.isPointInPath(lineArrowPath, canvasPos[0], canvasPos[1])
    ) {
      this.view.hoveredEdge = edge;
    }
  }

  drawShape(nodeOrEdge: Node | Edge, shape: GraphShape, hovered = false) {
    const { canvasPos } = this;
    const { ctx, movingNode } = this.view;
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

    if (movingNode || hovered) return;

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

  getCloserPoint(
    x: number,
    y: number,
    p1: [number, number],
    p2: [number, number]
  ) {
    const l1x = x - p1[0];
    const l1y = y - p1[1];
    const l1 = l1x * l1x + l1y * l1y;

    const l2x = x - p2[0];
    const l2y = y - p2[1];
    const l2 = l2x * l2x + l2y * l2y;

    if (l1 > l2) return p2;
    else return p1;
  }

  drawEdge(edge: Edge, hovered = false) {
    const { ctx, canvas } = this.view;
    const [scale, translateX, translateY] = this.view.transform;
    const { size } = edge.shape;

    const source = edge.source;
    const target = edge.target;

    const viewWidth = canvas.width / scale;
    const viewHeight = canvas.height / scale;
    const viewLeft = -translateX / scale;
    const viewTop = -translateY / scale;
    const viewRight = viewLeft + viewWidth;
    const viewBottom = viewTop + viewHeight;

    // First get the intersection of line and the view rect
    const count = getIntersectionsOfLineAndRect(
      this.int,
      source.x,
      source.y,
      target.x,
      target.y,
      viewLeft + viewWidth * 0.5,
      viewTop + viewHeight * 0.5,
      viewWidth,
      viewHeight
    );

    // Do not render if it is out of view
    if (
      count === 0 &&
      (source.x < viewLeft ||
        source.x > viewRight ||
        source.y < viewTop ||
        source.y > viewBottom)
    ) {
      return;
    }

    source.shape.setIntersectionPoint(this.out, source, target);
    const [startX, startY] = this.out;

    target.shape.setIntersectionPoint(this.out, target, source);
    const [endX, endY] = this.out;

    let lineStartX = startX;
    let lineStartY = startY;
    let lineEndX = endX;
    let lineEndY = endY;

    if (count > 0) {
      if (
        this.isOutOfView(
          source.x,
          source.y,
          source.shape.size[0],
          source.shape.size[1]
        )
      ) {
        if (count === 1) {
          lineStartX = this.int[0][0];
          lineStartY = this.int[0][1];
        } else {
          const p = this.getCloserPoint(
            startX,
            startY,
            this.int[0],
            this.int[1]
          );

          lineStartX = p[0];
          lineStartY = p[1];
        }
      }

      if (
        this.isOutOfView(
          target.x,
          target.y,
          target.shape.size[0],
          target.shape.size[1]
        )
      ) {
        if (count === 1) {
          lineEndX = this.int[0][0];
          lineEndY = this.int[0][1];
        } else {
          const p = this.getCloserPoint(endX, endY, this.int[0], this.int[1]);

          lineEndX = p[0];
          lineEndY = p[1];
        }
      }
    }

    this.drawEdgeLine(
      lineStartX,
      lineStartY,
      lineEndX,
      lineEndY,
      edge,
      hovered,
      endX,
      endY
    );

    const midX = (startX + endX) * 0.5;
    const midY = (startY + endY) * 0.5;

    if (this.isOutOfView(midX, midY, edge.shape.size[0], edge.shape.size[1])) {
      this.setToViewTransform();
      return;
    }

    const rx = size[0] * 0.5;
    const ry = size[1] * 0.5;

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

  isOutOfView(x: number, y: number, w: number, h: number) {
    const { canvas } = this.view;
    const [scale, translateX, translateY] = this.view.transform;

    const rx = w * 0.5;
    const ry = h * 0.5;

    return (
      (x + rx) * scale + translateX < 0 ||
      (y + ry) * scale + translateY < 0 ||
      (x - rx) * scale + translateX > canvas.width ||
      (y - ry) * scale + translateY > canvas.height
    );
  }

  drawNode(node: Node, hovered = false) {
    const { ctx } = this.view;
    const { size } = node.shape;

    if (this.isOutOfView(node.x, node.y, size[0], size[1])) return;

    const rx = size[0] * 0.5;
    const ry = size[1] * 0.5;

    ctx.translate(node.x - rx, node.y - ry);

    this.drawShape(node, node.shape as GraphShape, hovered);

    this.setToViewTransform();
  }
}

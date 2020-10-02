import {
  GENode,
  GEEdge,
  GEGridType,
  GEShapes,
  GEShape,
  GEShapeName
} from "./types";
import { GEState } from "./state";
import {
  intersectLineCircleCenter,
  intersectLineRectCenter,
  instersectLinePolygonCenter
} from "./intersections";

const TEXT_ALIGN = "center";
const TEXT_BASELINE = "middle";
const LINE_CAP_ROUND = "round";
const LINE_CAP_SQUARE = "square";

const tmpPoint: [number, number] = [0, 0];

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
    const gap = options.gridGap * scale;

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

  getShapeBound(shapes: GEShapes): number {
    const shape = shapes[0];

    if (shape.shape === GEShapeName.CIRCLE) return shape.r;
    if (shape.shape === GEShapeName.RECTANGLE)
      return Math.max(shape.width, shape.height);

    let r = 0;

    shape.points.forEach(p => {
      r = Math.max(r, Math.max(p[0], p[1]));
    });

    return r;
  }

  isNodeOutOfView(node: GENode): boolean {
    const { canvas } = this;
    const { translateX, translateY, scale, options } = this.state;

    const r = this.getShapeBound(options.nodeTypes[node.type]);

    return (
      (node.x + r) * scale + translateX < 0 ||
      (node.y + r) * scale + translateY < 0 ||
      (node.x - r) * scale + translateX > canvas.width ||
      (node.y - r) * scale + translateY > canvas.height
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

    const r = this.getShapeBound(options.edgeTypes[edge.type]);

    return (
      (sourceX < -r && targetX < -r) ||
      (sourceY < -r && targetY < -r) ||
      (sourceX > canvas.width + r && targetX > canvas.width + r) ||
      (sourceY > canvas.height + r && targetY > canvas.height + r)
    );
  }

  shapePath = (x: number, y: number, shape: GEShape): void => {
    const { ctx } = this;

    if (shape.shape === GEShapeName.CIRCLE) {
      ctx.arc(x, y, shape.r, 0, Math.PI * 2);
    } else if (shape.shape === GEShapeName.RECTANGLE) {
      ctx.rect(
        x - shape.width * 0.5,
        y - shape.height * 0.5,
        shape.width,
        shape.height
      );
    } else {
      ctx.moveTo(x + shape.points[0][0], y + shape.points[0][1]);

      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(x + shape.points[i][0], y + shape.points[i][1]);
      }

      ctx.lineTo(x + shape.points[0][0], y + shape.points[0][1]);

      ctx.closePath();
    }
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

    ctx.lineWidth = options.edgeLineWidth;

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

  getInstersectionPoint = (
    sourceX: number,
    sourceY: number,
    node: GENode
  ): [number, number] => {
    const { options } = this.state;

    const shape = options.nodeTypes[node.type][0];

    if (shape.shape === GEShapeName.CIRCLE) {
      const int = intersectLineCircleCenter(
        sourceX,
        sourceY,
        node.x,
        node.y,
        shape.r,
        tmpPoint
      );

      if (int) return tmpPoint;
    } else if (shape.shape === GEShapeName.RECTANGLE) {
      const int = intersectLineRectCenter(
        sourceX,
        sourceY,
        node.x,
        node.y,
        shape.width,
        shape.height,
        tmpPoint
      );

      if (int) return tmpPoint;
    } else {
      const int = instersectLinePolygonCenter(
        sourceX,
        sourceY,
        node.x,
        node.y,
        shape.points,
        tmpPoint
      );

      if (int) return tmpPoint;
    }

    return [node.x, node.y];
  };

  drawSubShapes = (shapes: GEShapes, x: number, y: number): void => {
    const { ctx } = this;
    const { options } = this.state;

    if (shapes.length <= 1) return;

    for (let i = 1; i < shapes.length; i++) {
      const sh = shapes[i];

      ctx.beginPath();
      this.shapePath(x, y, sh);

      ctx.fillStyle = sh.color ? sh.color : options.defaultSubShapeColor;
      ctx.fill();
    }
  };

  drawSelectedShape = (
    shape: GEShape,
    x: number,
    y: number,
    color: string
  ): void => {
    const { ctx } = this;

    ctx.beginPath();
    this.shapePath(x, y, shape);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  };

  drawNode = (node: GENode): void => {
    if (this.isNodeOutOfView(node)) return;

    const { ctx } = this;
    const { pointerCanvasX, pointerCanvasY, options } = this.state;

    const shapes = options.nodeTypes[node.type];

    ctx.strokeStyle = options.nodeStrokeColor;
    ctx.lineWidth = options.nodeLineWidth;

    ctx.beginPath();
    this.shapePath(node.x, node.y, shapes[0]);

    if (ctx.isPointInPath(pointerCanvasX, pointerCanvasY)) {
      this.state.hoveredNodeId = node.id;
    }

    const selected = node.id === this.state.selectedNodeId;
    const hovered = node.id === this.state.hoveredNodeId;

    ctx.strokeStyle =
      selected || hovered ? options.nodeSelectedColor : options.nodeStrokeColor;
    ctx.fillStyle = shapes[0].color || options.nodeColor;

    ctx.fill();
    ctx.stroke();

    this.drawSubShapes(shapes, node.x, node.y);

    if (selected) {
      this.drawSelectedShape(
        shapes[0],
        node.x,
        node.y,
        options.nodeSelectedColor
      );
    }

    if (selected) {
      ctx.fillStyle = options.nodeSelectedTextColor;
    } else {
      ctx.fillStyle = options.nodeTextColor;
    }

    ctx.font = options.nodeTextStyle;
    ctx.textAlign = TEXT_ALIGN;
    ctx.textBaseline = TEXT_BASELINE;

    ctx.fillText(node.text, node.x, node.y);
  };

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
    const [startX, startY] = this.getInstersectionPoint(
      target.x,
      target.y,
      source
    );
    const [endX0, endY0] = this.getInstersectionPoint(
      source.x,
      source.y,
      target
    );

    const endX = endX0 - cosr * 3;
    const endY = endY0 - sinr * 3;
    const edgeLineOffset =
      options.edgeArrowLength * Math.cos(options.edgeArrowRadian);
    const lineEndX = endX - cosr * edgeLineOffset;
    const lineEndY = endY - sinr * edgeLineOffset;

    ctx.lineWidth = options.edgeLineWidth;

    const midX = (startX + endX) * 0.5;
    const midY = (startY + endY) * 0.5;

    // this is just to check if the rect is hovered
    ctx.beginPath();
    this.shapePath(midX, midY, options.edgeTypes[edge.type][0]);

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

    const selected = edge.id === this.state.selectedEdgeId;
    const hovered = edge.id === this.state.hoveredEdgeId;
    const shapes = options.edgeTypes[edge.type];

    if (selected || hovered) {
      ctx.strokeStyle = options.edgeLineSelectedColor;
      ctx.fillStyle = options.edgeLineSelectedColor;
    } else {
      ctx.strokeStyle = options.edgeLineColor;
      ctx.fillStyle = options.edgeLineColor;
    }

    ctx.stroke();
    ctx.fill();

    ctx.beginPath();
    this.shapePath(midX, midY, shapes[0]);

    ctx.fillStyle = shapes[0].color || options.edgeShapeFillColor;

    ctx.fill();
    ctx.stroke();

    this.drawSubShapes(shapes, midX, midY);

    if (selected) {
      this.drawSelectedShape(
        shapes[0],
        midX,
        midY,
        options.edgeLineSelectedColor
      );
    }

    if (selected) {
      ctx.fillStyle = options.edgeSelectedTextColor;
    } else {
      ctx.fillStyle = options.edgeTextColor;
    }
    ctx.font = options.edgeTextStyle;
    ctx.textAlign = TEXT_ALIGN;
    ctx.textBaseline = TEXT_BASELINE;
    ctx.fillText(edge.text, midX, midY);
  };
}

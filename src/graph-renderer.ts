import {
  GENode,
  GEEdge,
  GEGridType,
  GEShapes,
  GEShape,
  GEShapeName
} from "./types";
import { GEState } from "./state";
import { intersectLineRect, intersect } from "./intersections";

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

  getShapeBound(shapes: GEShapes): number {
    const shape = shapes.mainShape;

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

  getInstersectionPoint = (
    sourceX: number,
    sourceY: number,
    node: GENode
  ): [number, number] => {
    const { options } = this.state;

    const shape = options.nodeTypes[node.type].mainShape;

    if (shape.shape === GEShapeName.CIRCLE) {
      const dx = node.x - sourceX;
      const dy = node.y - sourceY;

      const rad = Math.atan2(dy, dx);
      const sinr = Math.sin(rad);
      const cosr = Math.cos(rad);

      return [node.x - cosr * shape.r, node.y - sinr * shape.r];
    } else if (shape.shape === GEShapeName.RECTANGLE) {
      const x1 = sourceX;
      const y1 = sourceY;
      const x2 = node.x;
      const y2 = node.y;

      const int = intersectLineRect(
        x1,
        y1,
        x2,
        y2,
        node.x,
        node.y,
        shape.width,
        shape.height
      );

      if (int) return int;
    } else {
      const x1 = sourceX;
      const y1 = sourceY;
      const x2 = node.x;
      const y2 = node.y;

      const len = shape.points.length;

      for (let i = 0; i < len; i++) {
        const nextIndex = i + 1 === len ? 0 : i + 1;

        const x3 = node.x + shape.points[i][0];
        const y3 = node.y + shape.points[i][1];
        const x4 = node.x + shape.points[nextIndex][0];
        const y4 = node.y + shape.points[nextIndex][1];

        const int = intersect(x1, y1, x2, y2, x3, y3, x4, y4);
        if (int) return int;
      }
    }

    return [node.x, node.y];
  };

  drawNode = (node: GENode): void => {
    if (this.isNodeOutOfView(node)) return;

    const { ctx } = this;
    const { pointerCanvasX, pointerCanvasY, options } = this.state;

    const shapes = options.nodeTypes[node.type];

    ctx.strokeStyle = options.nodeStrokeColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    this.shapePath(node.x, node.y, shapes.mainShape);

    if (ctx.isPointInPath(pointerCanvasX, pointerCanvasY)) {
      this.state.hoveredNodeId = node.id;
    }

    const selected = node.id === this.state.selectedNodeId;
    const hovered = node.id === this.state.hoveredNodeId;

    ctx.strokeStyle =
      selected || hovered ? options.nodeSelectedColor : options.nodeStrokeColor;
    ctx.fillStyle = options.nodeColor;

    ctx.fill();
    ctx.stroke();

    if (shapes.auxShapes) {
      shapes.auxShapes.forEach(sh => {
        ctx.beginPath();
        this.shapePath(node.x, node.y, sh);

        ctx.fillStyle = sh.color ? sh.color : options.defaultAuxShapeColor;
        ctx.fill();
      });
    }

    if (selected) {
      ctx.beginPath();
      this.shapePath(node.x, node.y, shapes.mainShape);
      ctx.fillStyle = options.nodeSelectedColor;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1.0;
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

    ctx.lineWidth = 2;

    const midX = (startX + endX) * 0.5;
    const midY = (startY + endY) * 0.5;

    // this is just to check if the rect is hovered
    ctx.beginPath();
    this.shapePath(midX, midY, options.edgeTypes[edge.type].mainShape);

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
    this.shapePath(midX, midY, shapes.mainShape);

    ctx.fillStyle = options.edgeRectFillColor;

    ctx.fill();
    ctx.stroke();

    if (shapes.auxShapes) {
      shapes.auxShapes.forEach(sh => {
        ctx.beginPath();
        this.shapePath(midX, midY, sh);

        ctx.fillStyle = sh.color ? sh.color : options.defaultAuxShapeColor;
        ctx.fill();
      });
    }

    if (selected) {
      ctx.beginPath();
      this.shapePath(midX, midY, shapes.mainShape);
      ctx.fillStyle = options.edgeLineSelectedColor;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1.0;
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

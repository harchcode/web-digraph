import { GraphHandler } from "./graph-handler";
import { GraphRenderer } from "./graph-renderer";
import { GraphState } from "./graph-state";
import {
  defaultEdgeShape,
  defaultNodeShape,
  GraphEdge,
  GraphNode,
  GraphShape,
  GraphOptions,
  GraphDataType,
  NodeDrawData
} from "./types";

export function createNodeShape(shape?: Partial<GraphShape>): GraphShape {
  return {
    ...defaultNodeShape,
    ...shape
  };
}

export function createEdgeShape(shape?: Partial<GraphShape>): GraphShape {
  return {
    ...defaultEdgeShape,
    ...shape
  };
}

export class GraphView<Node extends GraphNode, Edge extends GraphEdge> {
  private state: GraphState<Node, Edge>;
  private renderer: GraphRenderer<Node, Edge>;
  private handler: GraphHandler<Node, Edge>;

  constructor(container: HTMLElement, options: Partial<GraphOptions> = {}) {
    this.state = new GraphState(container, options);
    this.renderer = new GraphRenderer(this, this.state);
    this.handler = new GraphHandler(this, this.state, this.renderer);

    this.renderer.applyTransform();
    this.renderer.drawAll();

    container.appendChild(this.state.bgCtx.canvas);
    container.appendChild(this.state.edgeCtx.canvas);
    container.appendChild(this.state.dragCtx.canvas);
    container.appendChild(this.state.nodeCtx.canvas);
    container.appendChild(this.state.moveCtx.canvas);

    const resizeObserver = new ResizeObserver(() => {
      this.resize();
    });

    resizeObserver.observe(container);

    this.handler.init();
  }

  resize(): void {
    this.state.bgCtx.canvas.width = this.state.container.clientWidth;
    this.state.bgCtx.canvas.height = this.state.container.clientHeight;
    this.state.edgeCtx.canvas.width = this.state.container.clientWidth;
    this.state.edgeCtx.canvas.height = this.state.container.clientHeight;
    this.state.nodeCtx.canvas.width = this.state.container.clientWidth;
    this.state.nodeCtx.canvas.height = this.state.container.clientHeight;
    this.state.moveCtx.canvas.width = this.state.container.clientWidth;
    this.state.moveCtx.canvas.height = this.state.container.clientHeight;

    this.state.boundingRect = this.state.container.getBoundingClientRect();

    this.renderer.applyTransform();
    this.renderer.drawAll();
  }

  viewPosFromWindowPos(
    out: [number, number],
    windowX: number,
    windowY: number
  ) {
    const { left, top } = this.state.boundingRect;
    const { scale, translateX, translateY } = this.state;

    out[0] = (windowX - left - translateX) / scale;
    out[1] = (windowY - top - translateY) / scale;
  }

  viewPosFromCanvasPos(
    out: [number, number],
    canvasX: number,
    canvasY: number
  ) {
    const { scale, translateX, translateY } = this.state;

    out[0] = (canvasX - translateX) / scale;
    out[1] = (canvasY - translateY) / scale;
  }

  canvasPosFromViewPos(out: [number, number], viewX: number, viewY: number) {
    const { scale, translateX, translateY } = this.state;

    out[0] = viewX * scale + translateX;
    out[1] = viewY * scale + translateY;
  }

  canvasPosFromWindowPos(
    out: [number, number],
    windowX: number,
    windowY: number
  ) {
    const { left, top } = this.state.boundingRect;

    out[0] = windowX - left;
    out[1] = windowY - top;
  }
  getTranslateX() {
    return this.state.translateX;
  }

  getTranslateY() {
    return this.state.translateY;
  }

  getScale() {
    return this.state.scale;
  }

  setTransform(translateX: number, translateY: number, scale: number) {
    if (
      translateX === this.state.translateX &&
      translateY === this.state.translateY &&
      scale === this.state.scale
    )
      return;

    this.state.translateX = translateX;
    this.state.translateY = translateY;
    this.state.scale = scale;

    this.renderer.applyTransform();
    this.renderer.requestDraw();
  }

  moveBy(x: number, y: number) {
    this.state.translateX += x;
    this.state.translateY += y;

    this.renderer.applyTransform();

    this.renderer.requestDraw();
  }

  zoomBy(value: number, targetX?: number, targetY?: number) {
    this.zoomTo(this.state.scale + value, targetX, targetY);
  }

  zoomTo(value: number, targetX?: number, targetY?: number) {
    const { scale, translateX, translateY, options } = this.state;
    const { width, height } = this.state.bgCtx.canvas;

    targetX = targetX || (width * 0.5 - translateX) / scale;
    targetY = targetY || (height * 0.5 - translateY) / scale;

    const newScale = Math.min(
      options.maxScale,
      Math.max(options.minScale, value)
    );

    const deltaScale = newScale - scale;
    const offsetX = -(targetX * deltaScale);
    const offsetY = -(targetY * deltaScale);

    this.state.scale += deltaScale;
    this.state.translateX += offsetX;
    this.state.translateY += offsetY;

    this.renderer.applyTransform();
    this.renderer.requestDraw();
  }

  beginMoveView() {
    this.state.isMovingView = true;
  }

  endMoveView() {
    this.state.isMovingView = false;
  }
}

export function createGraphView(container: HTMLElement) {
  return new GraphView(container);
}

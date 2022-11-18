import { GraphHandler } from "./graph-handler";
import { GraphRenderer, RedrawType } from "./graph-renderer";
import { GraphState } from "./graph-state";
import {
  defaultEdgeShape,
  defaultNodeShape,
  GraphEdge,
  GraphNode,
  GraphShape,
  GraphOptions,
  GraphDataType
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
  private isBatching = false;

  constructor(container: HTMLElement, options: Partial<GraphOptions> = {}) {
    this.state = new GraphState(container, options);
    this.renderer = new GraphRenderer(this, this.state);
    this.handler = new GraphHandler(this, this.state, this.renderer);

    this.renderer.applyTransform();
    this.renderer.draw();

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

  destroy() {
    this.handler.destroy();
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
    this.renderer.draw();
  }

  startBatch() {
    this.isBatching = true;
  }

  endBatch(redrawType: RedrawType = RedrawType.ALL) {
    this.isBatching = false;

    this.renderer.requestDraw(redrawType);
  }

  addNode(node: Node, shape: GraphShape): boolean {
    const { nodes, edges, nodeData } = this.state;

    if (nodes[node.id] || edges[node.id]) return false;

    nodes[node.id] = node;

    nodeData[node.id] = {
      type: GraphDataType.NODE,
      shape,
      sourceOfEdgeIds: new Set(),
      targetOfEdgeIds: new Set()
    };

    this.state.quad.insert(
      node.id,
      node.x - shape.width * 0.5,
      node.y - shape.height * 0.5,
      shape.width,
      shape.height
    );

    if (!this.isBatching) this.renderer.drawNode(node);

    return true;
  }

  addEdge(edge: Edge, shape: GraphShape): boolean {
    const { nodes, edges, nodeData, edgeData } = this.state;

    if (nodes[edge.id] || edges[edge.id]) return false;
    if (!nodes[edge.sourceId] || !nodes[edge.targetId]) return false;

    const snd = nodeData[edge.sourceId];
    const tnd = nodeData[edge.targetId];

    for (const eid of snd.sourceOfEdgeIds) {
      if (edges[eid].targetId === edge.targetId) return false;
    }

    for (const eid of tnd.targetOfEdgeIds) {
      if (edges[eid].sourceId === edge.sourceId) return false;
    }

    edges[edge.id] = edge;

    snd.sourceOfEdgeIds.add(edge.id);
    tnd.targetOfEdgeIds.add(edge.id);

    edgeData[edge.id] = {
      type: GraphDataType.EDGE,
      shape
    };

    const source = nodes[edge.sourceId];
    const target = nodes[edge.targetId];

    // console.log(
    //   edge.id,
    //   Math.min(source.x, target.x),
    //   Math.min(source.y, target.y),
    //   Math.max(Math.abs(source.x - target.x), shape.width),
    //   Math.max(Math.abs(source.y - target.y), shape.height)
    // );

    this.state.quad.insert(
      edge.id,
      Math.min(source.x, target.x),
      Math.min(source.y, target.y),
      Math.max(Math.abs(source.x - target.x), shape.width),
      Math.max(Math.abs(source.y - target.y), shape.height)
    );

    if (!this.isBatching) this.renderer.drawEdge(edge);

    return true;
  }

  clear() {
    this.state.nodes = {};
    this.state.edges = {};
    this.state.nodeData = {};
    this.state.edgeData = {};
    this.state.selectedIds.clear();
    this.state.moveNodeIds = [];
    this.state.dragLineSourceNode = undefined;
    this.state.quad.clear();

    if (!this.isBatching) {
      this.renderer.clearNodes();
      this.renderer.clearEdges();
    }
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

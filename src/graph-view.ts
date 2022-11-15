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
  NodeDrawData,
  EdgeDrawData
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

    this.renderer.requestDraw();

    container.appendChild(this.state.canvas);

    this.handler.init();
  }

  destroy() {
    this.handler.destroy();
  }

  beginDragLine() {
    const { hoveredId, nodes } = this.state;

    if (!hoveredId) return;

    const node = nodes[hoveredId];

    if (!node) return;

    this.state.dragLineSourceNode = node;
    this.state.dragLineX = node.x;
    this.state.dragLineY = node.y;
  }

  endDragLine(): [Node, Node] | undefined {
    const { hoveredId, nodes } = this.state;

    if (!this.state.dragLineSourceNode) return;

    let r = 0;
    if (hoveredId > 0 && hoveredId !== this.state.dragLineSourceNode.id) {
      r = hoveredId;
    }

    const s = this.state.dragLineSourceNode;

    this.state.dragLineSourceNode = undefined;

    this.renderer.requestDraw();

    const rn = nodes[r];
    return rn ? [s, rn] : undefined;
  }

  beginMoveView() {
    this.state.isMovingView = true;
  }

  endMoveView() {
    this.state.isMovingView = false;
  }

  beginMoveNodes(nodeIds: number[], vx: number, vy: number) {
    this.state.moveNodeIds = nodeIds;
    this.state.moveX = vx;
    this.state.moveY = vy;
  }

  endMoveNodes() {
    this.state.moveNodeIds.length = 0;

    this.renderer.requestDraw();
  }

  getHoveredId() {
    return this.state.hoveredId;
  }

  select(id: number) {
    this.state.selectedIdMap = { [id]: true };
    this.renderer.requestDraw();
  }

  addSelection(id: number) {
    this.state.selectedIdMap[id] = true;
    this.renderer.requestDraw();
  }

  removeSelection(id: number) {
    delete this.state.selectedIdMap[id];
    this.renderer.requestDraw();
  }

  clearSelection() {
    this.state.selectedIdMap = {};
    this.renderer.requestDraw();
  }

  getSelection() {
    return Object.keys(this.state.selectedIdMap).map(k => Number(k));
  }

  getSelectedNodeIds() {
    return this.getSelection().filter(id => {
      return this.state.nodes[id] !== undefined;
    });
  }

  getSelectedEdgeIds() {
    return this.getSelection().filter(id => {
      return this.state.edges[id] !== undefined;
    });
  }

  addNode(node: Node, shape: GraphShape): boolean {
    const { nodes, edges, drawData } = this.state;

    if (nodes[node.id] || edges[node.id]) return false;

    nodes[node.id] = node;

    const path = shape.createPath(
      node.x,
      node.y,
      shape.width,
      shape.height,
      node.id
    );

    drawData[node.id] = {
      type: GraphDataType.NODE,
      shape,
      path,
      sourceOfEdgeIds: new Set(),
      targetOfEdgeIds: new Set()
    };

    this.renderer.requestDraw();

    return true;
  }

  addEdge(edge: Edge, shape: GraphShape): boolean {
    const { nodes, edges, drawData } = this.state;

    if (nodes[edge.id] || edges[edge.id]) return false;
    if (!nodes[edge.sourceId] || !nodes[edge.targetId]) return false;

    edges[edge.id] = edge;

    const snd = drawData[edge.sourceId] as NodeDrawData;
    snd.sourceOfEdgeIds.add(edge.id);

    const tnd = drawData[edge.targetId] as NodeDrawData;
    tnd.targetOfEdgeIds.add(edge.id);

    this.renderer.createEdgePath(edge, shape);

    this.renderer.requestDraw();

    return true;
  }

  moveNode(id: number, dx: number, dy: number): boolean {
    const { drawData, nodes, edges } = this.state;

    if (!nodes[id]) return false;

    const node = nodes[id];
    const ndd = drawData[id] as NodeDrawData;

    node.x += dx;
    node.y += dy;

    const shape = ndd.shape;

    const path = shape.createPath(
      node.x,
      node.y,
      shape.width,
      shape.height,
      node.id
    );

    ndd.path = path;

    for (const edgeId of ndd.sourceOfEdgeIds) {
      const edge = edges[edgeId];
      const edd = drawData[edgeId];

      this.renderer.createEdgePath(edge, edd.shape);
    }

    for (const edgeId of ndd.targetOfEdgeIds) {
      const edge = edges[edgeId];
      const edd = drawData[edgeId];

      this.renderer.createEdgePath(edge, edd.shape);
    }

    this.renderer.requestDraw();

    return true;
  }

  updateNode(id: number, node: Partial<Node>): boolean {
    const { nodes } = this.state;

    if (!nodes[id]) return false;
    const cur = nodes[id];

    if ((node.x && node.x !== cur.x) || (node.y && node.y !== cur.y)) {
      this.moveNode(
        id,
        node.x ? node.x - cur.x : 0,
        node.y ? node.y - cur.y : 0
      );
    }

    for (const k in node) {
      if (k === "id") continue;

      cur[k] = node[k] as Node[Extract<keyof Node, string>];
    }

    return true;
  }

  updateEdge(id: number, edge: Partial<Edge>): boolean {
    const { edges } = this.state;

    if (!edges[id]) return false;
    const cur = edges[id];

    if (
      (edge.sourceId && edge.sourceId !== cur.sourceId) ||
      (edge.targetId && edge.targetId !== cur.targetId)
    ) {
      this.renderer.requestDraw();
    }

    for (const k in edge) {
      if (k === "id") continue;

      cur[k] = edge[k] as Edge[Extract<keyof Edge, string>];
    }

    return true;
  }

  remove(id: number): boolean {
    if (this.state.nodes[id]) return this.removeNode(id);
    if (this.state.edges[id]) return this.removeEdge(id);

    return false;
  }

  removeNode(id: number): boolean {
    const { nodes, drawData } = this.state;

    if (!nodes[id]) return false;
    const ndd = drawData[id] as NodeDrawData;

    for (const edgeId of ndd.sourceOfEdgeIds) {
      this.removeEdge(edgeId);
    }

    for (const edgeId of ndd.targetOfEdgeIds) {
      this.removeEdge(edgeId);
    }

    delete this.state.nodes[id];
    delete this.state.drawData[id];

    this.renderer.requestDraw();

    return true;
  }

  removeEdge(id: number): boolean {
    const { edges, drawData } = this.state;

    if (!edges[id]) return false;
    const edge = edges[id];

    const sndd = drawData[edge.sourceId] as NodeDrawData;
    sndd.sourceOfEdgeIds.delete(id);

    const tndd = drawData[edge.targetId] as NodeDrawData;
    tndd.targetOfEdgeIds.delete(id);

    delete this.state.edges[id];
    delete this.state.drawData[id];

    this.renderer.requestDraw();

    return true;
  }

  getNode(id: number): Node | undefined {
    return this.state.nodes[id];
  }

  getEdge(id: number): Edge | undefined {
    return this.state.edges[id];
  }

  getData() {
    return {
      nodes: Object.values(this.state.nodes),
      edges: Object.values(this.state.edges)
    };
  }

  clear() {
    this.state.nodes = {};
    this.state.edges = {};
    this.state.drawData = {};

    this.renderer.requestDraw();
  }

  getTranslateX() {
    return this.state.translateX;
  }

  setTranslateX(v: number) {
    if (v === this.state.translateX) return;

    this.state.translateX = v;
    this.renderer.requestDraw();
  }

  getTranslateY() {
    return this.state.translateY;
  }

  setTranslateY(v: number) {
    if (v === this.state.translateY) return;

    this.state.translateY = v;
    this.renderer.requestDraw();
  }

  getScale() {
    return this.state.scale;
  }

  setScale(v: number) {
    if (v === this.state.scale) return;

    this.state.scale = v;
    this.renderer.requestDraw();
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

    this.renderer.requestDraw();
  }

  moveBy(x: number, y: number) {
    this.state.translateX += x;
    this.state.translateY += y;

    this.renderer.requestDraw();
  }

  zoomBy(value: number, targetX?: number, targetY?: number) {
    this.zoomTo(this.state.scale + value, targetX, targetY);
  }

  zoomTo(value: number, targetX?: number, targetY?: number) {
    const { scale, translateX, translateY, options } = this.state;
    const { width, height } = this.state.canvas;

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

    this.renderer.requestDraw();
  }

  resize(width: number, height: number): void {
    this.state.canvas.width = width;
    this.state.canvas.height = height;

    this.state.boundingRect = this.state.canvas.getBoundingClientRect();

    this.renderer.requestDraw();
  }

  getViewPosFromWindowPos(windowX: number, windowY: number) {
    const { left, top } = this.state.boundingRect;
    const { scale, translateX, translateY } = this.state;

    return [
      (windowX - left - translateX) / scale,
      (windowY - top - translateY) / scale
    ];
  }

  getViewPosFromCanvasPos(canvasX: number, canvasY: number) {
    const { scale, translateX, translateY } = this.state;

    return [(canvasX - translateX) / scale, (canvasY - translateY) / scale];
  }

  getCanvasPosFromViewPos(viewX: number, viewY: number) {
    const { scale, translateX, translateY } = this.state;

    return [viewX * scale + translateX, viewY * scale + translateY];
  }

  getCanvasPosFromWindowPos(windowX: number, windowY: number) {
    const { left, top } = this.state.boundingRect;

    return [windowX - left, windowY - top];
  }
}

export function createGraphView(container: HTMLElement) {
  return new GraphView(container);
}

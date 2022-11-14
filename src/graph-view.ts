import { GraphHandler } from "./graph-handler";
import { GraphRenderer } from "./graph-renderer";
import { GraphState } from "./graph-state";
import {
  defaultEdgeShape,
  defaultNodeShape,
  GraphEdge,
  GraphNode,
  GraphShape,
  GraphOptions
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
    const { hoveredId, idMap } = this.state;

    if (!hoveredId) return;

    const node = idMap[hoveredId];

    if (!this.isNode(node)) return;

    this.state.dragLineSourceNode = node;
    this.state.dragLineX = node.x;
    this.state.dragLineY = node.y;
  }

  endDragLine(): [Node, Node] | undefined {
    const { hoveredId, idMap } = this.state;

    if (!this.state.dragLineSourceNode) return;

    let r = 0;
    if (hoveredId > 0 && hoveredId !== this.state.dragLineSourceNode.id) {
      r = hoveredId;
    }

    const s = this.state.dragLineSourceNode;

    this.state.dragLineSourceNode = undefined;

    this.renderer.requestDraw();

    const rn = idMap[r];
    return rn && this.isNode(rn) ? [s, rn] : undefined;
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
      const nodeOrEdge = this.state.idMap[id];

      return this.isNode(nodeOrEdge);
    });
  }

  getSelectedEdgeIds() {
    return this.getSelection().filter(id => {
      const nodeOrEdge = this.state.idMap[id];

      return this.isEdge(nodeOrEdge);
    });
  }

  addNode(node: Node, shape: GraphShape) {
    const { idMap, nodes, shapeMap, pathMap } = this.state;

    if (idMap[node.id]) return;

    nodes.push(node);
    idMap[node.id] = node;

    const path = shape.createPath(
      node.x,
      node.y,
      shape.width,
      shape.height,
      node.id
    );

    shapeMap[node.id] = shape;
    pathMap[node.id] = path;

    this.renderer.requestDraw();
  }

  addEdge(edge: Edge, shape: GraphShape) {
    const { idMap } = this.state;

    if (idMap[edge.id] || !idMap[edge.sourceId] || !idMap[edge.targetId])
      return;

    const { edges, shapeMap, sourceNodeIdToEdgesMap, targetNodeIdToEdgesMap } =
      this.state;

    edges.push(edge);
    idMap[edge.id] = edge;
    shapeMap[edge.id] = shape;

    if (sourceNodeIdToEdgesMap[edge.sourceId]) {
      sourceNodeIdToEdgesMap[edge.sourceId].push(edge);
    } else {
      sourceNodeIdToEdgesMap[edge.sourceId] = [edge];
    }

    if (targetNodeIdToEdgesMap[edge.targetId]) {
      targetNodeIdToEdgesMap[edge.targetId].push(edge);
    } else {
      targetNodeIdToEdgesMap[edge.targetId] = [edge];
    }

    this.renderer.createEdgePath(edge, shape);

    this.renderer.requestDraw();
  }

  moveNode(id: number, dx: number, dy: number) {
    const {
      idMap,
      shapeMap,
      pathMap,
      sourceNodeIdToEdgesMap,
      targetNodeIdToEdgesMap
    } = this.state;

    const node = idMap[id] as Node | undefined;
    if (!node) return;

    node.x += dx;
    node.y += dy;

    const shape = shapeMap[id];

    const path = shape.createPath(
      node.x,
      node.y,
      shape.width,
      shape.height,
      node.id
    );

    pathMap[id] = path;

    const ses = sourceNodeIdToEdgesMap[id];
    const tes = targetNodeIdToEdgesMap[id];

    if (ses)
      for (const edge of ses) {
        this.renderer.createEdgePath(edge, shapeMap[edge.id]);
      }

    if (tes)
      for (const edge of tes) {
        this.renderer.createEdgePath(edge, shapeMap[edge.id]);
      }

    this.renderer.requestDraw();
  }

  updateNode(id: number, node: Partial<Node>) {
    const { idMap } = this.state;

    const curNode = idMap[id] as Node | undefined;
    if (!curNode) return;

    if ((node.x && node.x !== curNode.x) || (node.y && node.y !== curNode.y)) {
      this.moveNode(
        id,
        node.x ? node.x - curNode.x : 0,
        node.y ? node.y - curNode.y : 0
      );
    }

    for (const k in node) {
      if (k === "id") continue;

      curNode[k] = node[k] as Node[Extract<keyof Node, string>];
    }
  }

  updateEdge(id: number, edge: Partial<Edge>) {
    const { idMap } = this.state;

    const cur = idMap[id] as Edge | undefined;
    if (!cur) return;

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
  }

  remove(id: number) {
    const nodeOrEdge = this.state.idMap[id];

    if (this.isNode(nodeOrEdge)) this.removeNode(id);
    if (this.isEdge(nodeOrEdge)) this.removeEdge(id);
  }

  removeNode(id: number) {
    const node = this.state.idMap[id];

    if (!this.isNode(node)) return;

    delete this.state.idMap[id];
    delete this.state.pathMap[id];

    this.state.nodes = this.state.nodes.filter(n => n.id !== id);

    const ses = this.state.sourceNodeIdToEdgesMap[id];
    if (ses) for (const edge of ses) this.removeEdge(edge.id);

    const tes = this.state.targetNodeIdToEdgesMap[id];
    if (tes) for (const edge of tes) this.removeEdge(edge.id);

    this.renderer.requestDraw();
  }

  removeEdge(id: number) {
    const edge = this.state.idMap[id];

    if (!this.isEdge(edge)) return;

    delete this.state.idMap[id];
    delete this.state.pathMap[id];
    delete this.state.linePathMap[id];
    delete this.state.arrowPathMap[id];

    this.state.edges = this.state.edges.filter(n => n.id !== id);

    const ses = this.state.sourceNodeIdToEdgesMap[edge.sourceId];
    if (ses)
      this.state.sourceNodeIdToEdgesMap[edge.sourceId] = ses.filter(
        e => e.id !== id
      );

    const tes = this.state.targetNodeIdToEdgesMap[edge.targetId];
    if (tes)
      this.state.targetNodeIdToEdgesMap[edge.targetId] = ses.filter(
        e => e.id !== id
      );

    this.renderer.requestDraw();
  }

  getNode(id: number): Node {
    return this.state.idMap[id] as Node;
  }

  getEdge(id: number): Edge {
    return this.state.idMap[id] as Edge;
  }

  getData() {
    return {
      nodes: this.state.nodes,
      edges: this.state.edges
    };
  }

  clear() {
    this.state.nodes = [];
    this.state.edges = [];
    this.state.idMap = {};
    this.state.shapeMap = {};
    this.state.pathMap = {};
    this.state.edgeContentPosMap = {};
    this.state.linePathMap = {};
    this.state.arrowPathMap = {};

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

  isNode(nodeOrEdge?: Node | Edge): nodeOrEdge is Node {
    if (!nodeOrEdge) return false;
    return "x" in nodeOrEdge;
  }

  isEdge(nodeOrEdge?: Node | Edge): nodeOrEdge is Edge {
    if (!nodeOrEdge) return false;
    return "sourceId" in nodeOrEdge;
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

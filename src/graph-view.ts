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

  private nodeCount = 0;
  private edgeCount = 0;

  constructor(container: HTMLElement, options: Partial<GraphOptions> = {}) {
    this.state = new GraphState(container, options);
    this.renderer = new GraphRenderer(this, this.state);
    this.handler = new GraphHandler(this, this.state, this.renderer);

    this.setTransform(
      container.clientWidth * 0.5,
      container.clientHeight * 0.5,
      1
    );
    this.renderer.draw();

    container.appendChild(this.state.bgCtx.canvas);
    container.appendChild(this.state.edgeCtx.canvas);
    container.appendChild(this.state.moveEdgeCtx.canvas);
    container.appendChild(this.state.nodeCtx.canvas);
    container.appendChild(this.state.moveNodeCtx.canvas);

    this.handler.init();
  }

  destroy() {
    this.handler.destroy();
  }

  setOptions(options: Partial<GraphOptions> = {}) {
    this.state.options = {
      ...this.state.options,
      ...options
    };

    if (!this.isBatching) this.renderer.requestDraw();
  }

  resize(): void {
    this.state.bgCtx.canvas.width = this.state.container.clientWidth;
    this.state.bgCtx.canvas.height = this.state.container.clientHeight;
    this.state.edgeCtx.canvas.width = this.state.container.clientWidth;
    this.state.edgeCtx.canvas.height = this.state.container.clientHeight;
    this.state.nodeCtx.canvas.width = this.state.container.clientWidth;
    this.state.nodeCtx.canvas.height = this.state.container.clientHeight;
    this.state.moveNodeCtx.canvas.width = this.state.container.clientWidth;
    this.state.moveNodeCtx.canvas.height = this.state.container.clientHeight;

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

    this.nodeCount += 1;

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

    this.state.quad.insert(
      edge.id,
      Math.min(source.x, target.x),
      Math.min(source.y, target.y),
      Math.max(Math.abs(source.x - target.x), shape.width),
      Math.max(Math.abs(source.y - target.y), shape.height)
    );

    this.edgeCount += 1;

    if (!this.isBatching) this.renderer.drawEdge(edge);

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

  moveNode(id: number, dx: number, dy: number): boolean {
    const { nodeData, edgeData, nodes, edges } = this.state;

    if (!nodes[id]) return false;

    const node = nodes[id];
    const ndd = nodeData[id];

    ndd.path = undefined;

    for (const edgeId of ndd.sourceOfEdgeIds) {
      const edge = edges[edgeId];
      const source = node;
      const target = nodes[edge.targetId];
      const edd = edgeData[edgeId];

      this.state.quad.move(
        edge.id,
        Math.min(source.x, target.x),
        Math.min(source.y, target.y),
        Math.max(Math.abs(source.x - target.x), edd.shape.width),
        Math.max(Math.abs(source.y - target.y), edd.shape.height),
        Math.min(source.x + dx, target.x),
        Math.min(source.y + dy, target.y),
        Math.max(Math.abs(source.x + dx - target.x), edd.shape.width),
        Math.max(Math.abs(source.y + dy - target.y), edd.shape.height)
      );

      edd.arrowPath = undefined;
      edd.linePath = undefined;
      edd.path = undefined;
      edd.lineSourceX = undefined;
      edd.lineSourceY = undefined;
      edd.lineTargetX = undefined;
      edd.lineTargetY = undefined;
      edd.shapeX = undefined;
      edd.shapeY = undefined;
    }

    for (const edgeId of ndd.targetOfEdgeIds) {
      const edge = edges[edgeId];
      const source = nodes[edge.sourceId];
      const target = node;
      const edd = edgeData[edgeId];

      this.state.quad.move(
        edge.id,
        Math.min(source.x, target.x),
        Math.min(source.y, target.y),
        Math.max(Math.abs(source.x - target.x), edd.shape.width),
        Math.max(Math.abs(source.y - target.y), edd.shape.height),
        Math.min(source.x, target.x + dx),
        Math.min(source.y, target.y + dy),
        Math.max(Math.abs(source.x - target.x + dx), edd.shape.width),
        Math.max(Math.abs(source.y - target.y + dy), edd.shape.height)
      );

      edd.arrowPath = undefined;
      edd.linePath = undefined;
      edd.path = undefined;
      edd.lineSourceX = undefined;
      edd.lineSourceY = undefined;
      edd.lineTargetX = undefined;
      edd.lineTargetY = undefined;
      edd.shapeX = undefined;
      edd.shapeY = undefined;
    }

    this.state.quad.move(
      node.id,
      node.x - ndd.shape.width * 0.5,
      node.y - ndd.shape.height * 0.5,
      ndd.shape.width,
      ndd.shape.height,
      node.x + dx - ndd.shape.width * 0.5,
      node.y + dy - ndd.shape.height * 0.5,
      ndd.shape.width,
      ndd.shape.height
    );

    node.x += dx;
    node.y += dy;

    if (!this.isBatching) this.renderer.draw(RedrawType.NODES_AND_EDGES);

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
      this.changeEdgeSourceAndTarget(id, cur.sourceId, cur.targetId);
    }

    for (const k in edge) {
      if (k === "id") continue;

      cur[k] = edge[k] as Edge[Extract<keyof Edge, string>];
    }

    if (!this.isBatching) this.renderer.draw(RedrawType.EDGES);

    return true;
  }

  changeEdgeSourceAndTarget(
    id: number,
    sourceId: number,
    targetId: number
  ): boolean {
    const { nodes, edges, edgeData } = this.state;

    if (!edges[id]) return false;
    if (!nodes[sourceId] || !nodes[targetId]) return false;

    const cur = edges[id];

    if (sourceId === cur.sourceId && targetId === cur.targetId) return false;

    const data = edgeData[id];
    const curSource = nodes[cur.sourceId];
    const curTarget = nodes[cur.targetId];
    const newSource = nodes[cur.sourceId];
    const newTarget = nodes[cur.targetId];

    this.state.quad.move(
      id,
      Math.min(curSource.x, curTarget.x),
      Math.min(curSource.y, curTarget.y),
      Math.max(Math.abs(curSource.x - curTarget.x), data.shape.width),
      Math.max(Math.abs(curSource.y - curTarget.y), data.shape.height),
      Math.min(newSource.x, newTarget.x),
      Math.min(newSource.y, newTarget.y),
      Math.max(Math.abs(newSource.x - newTarget.x), data.shape.width),
      Math.max(Math.abs(newSource.y - newTarget.y), data.shape.height)
    );

    cur.sourceId = sourceId;
    cur.targetId = targetId;

    data.arrowPath = undefined;
    data.linePath = undefined;
    data.path = undefined;
    data.lineSourceX = undefined;
    data.lineSourceY = undefined;
    data.lineTargetX = undefined;
    data.lineTargetY = undefined;
    data.shapeX = undefined;
    data.shapeY = undefined;

    if (!this.isBatching) this.renderer.draw(RedrawType.EDGES);

    return true;
  }

  remove(id: number): boolean {
    if (this.state.nodes[id]) return this.removeNode(id);
    if (this.state.edges[id]) return this.removeEdge(id);

    return false;
  }

  removeNode(id: number): boolean {
    const { nodes, nodeData } = this.state;

    if (!nodes[id]) return false;

    const node = nodes[id];
    const data = nodeData[id];

    for (const edgeId of data.sourceOfEdgeIds) {
      this.removeEdge(edgeId);
    }

    for (const edgeId of data.targetOfEdgeIds) {
      this.removeEdge(edgeId);
    }

    this.state.quad.remove(
      id,
      node.x - data.shape.width * 0.5,
      node.y - data.shape.height * 0.5,
      data.shape.width,
      data.shape.height
    );

    delete this.state.nodes[id];
    delete this.state.nodeData[id];

    this.nodeCount -= 1;

    if (!this.isBatching) this.renderer.draw(RedrawType.NODES);

    return true;
  }

  removeEdge(id: number): boolean {
    const { nodes, edges, nodeData, edgeData } = this.state;

    if (!edges[id]) return false;
    const edge = edges[id];

    const sndd = nodeData[edge.sourceId];
    sndd.sourceOfEdgeIds.delete(id);

    const tndd = nodeData[edge.targetId];
    tndd.targetOfEdgeIds.delete(id);

    const data = edgeData[id];
    const source = nodes[edge.sourceId];
    const target = nodes[edge.targetId];

    this.state.quad.remove(
      id,
      Math.min(source.x, target.x),
      Math.min(source.y, target.y),
      Math.max(Math.abs(source.x - target.x), data.shape.width),
      Math.max(Math.abs(source.y - target.y), data.shape.height)
    );

    delete this.state.edges[id];
    delete this.state.edgeData[id];

    this.edgeCount -= 1;

    if (!this.isBatching) this.renderer.draw(RedrawType.EDGES);

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
      this.renderer.draw(RedrawType.NODES_AND_EDGES);
    }
  }

  getNodeCount() {
    return this.nodeCount;
  }

  getEdgeCount() {
    return this.edgeCount;
  }

  getHoveredId() {
    return this.state.hoveredId;
  }

  select(id: number) {
    const { nodes, edges, selectedIds } = this.state;

    if (this.isBatching) {
      selectedIds.clear();
      selectedIds.add(id);

      return;
    }

    const affectedIds = Array.from(selectedIds);
    affectedIds.push(id);

    selectedIds.clear();
    selectedIds.add(id);

    for (const id of affectedIds) {
      if (nodes[id]) this.renderer.drawNode(nodes[id]);
      if (edges[id]) this.renderer.drawEdge(edges[id]);
    }
  }

  addSelection(id: number) {
    const { nodes, edges, selectedIds } = this.state;

    selectedIds.add(id);

    if (this.isBatching) return;

    if (nodes[id]) this.renderer.drawNode(nodes[id]);
    if (edges[id]) this.renderer.drawEdge(edges[id]);
  }

  removeSelection(id: number) {
    const { nodes, edges, selectedIds } = this.state;

    selectedIds.delete(id);

    if (this.isBatching) return;

    if (nodes[id]) this.renderer.drawNode(nodes[id]);
    if (edges[id]) this.renderer.drawEdge(edges[id]);
  }

  clearSelection() {
    const { nodes, edges, selectedIds } = this.state;

    if (this.isBatching) {
      selectedIds.clear();

      return;
    }

    const affectedIds = Array.from(selectedIds);

    selectedIds.clear();

    for (const id of affectedIds) {
      if (nodes[id]) this.renderer.drawNode(nodes[id]);
      if (edges[id]) this.renderer.drawEdge(edges[id]);
    }
  }

  getSelection() {
    return Array.from(this.state.selectedIds);
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

  beginMoveNodes(nodeIds: number[], vx: number, vy: number) {
    const { nodeData } = this.state;

    const affectedIds = new Set(nodeIds);

    for (const id of nodeIds) {
      const dd = nodeData[id];

      for (const eid of dd.sourceOfEdgeIds) {
        affectedIds.add(eid);
      }

      for (const eid of dd.targetOfEdgeIds) {
        affectedIds.add(eid);
      }
    }

    this.state.moveNodeIds = nodeIds;
    this.state.moveX = vx;
    this.state.moveY = vy;

    this.renderer.draw(RedrawType.NODES_AND_EDGES, affectedIds);
    this.renderer.draw(RedrawType.MOVE);
  }

  endMoveNodes() {
    this.state.moveNodeIds.length = 0;

    this.renderer.draw(RedrawType.MOVE);
    this.renderer.draw(RedrawType.NODES_AND_EDGES);
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

    this.renderer.clearDragLine();

    if (!this.state.dragLineSourceNode) return;

    const source = this.state.dragLineSourceNode;
    this.state.dragLineSourceNode = undefined;

    if (!hoveredId || hoveredId === source.id) return;

    const target = nodes[hoveredId];

    return target ? [source, target] : undefined;
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

  isMovingView() {
    return this.state.isMovingView;
  }
}

export function createGraphView(
  container: HTMLElement,
  options: Partial<GraphOptions> = {}
) {
  return new GraphView(container, options);
}

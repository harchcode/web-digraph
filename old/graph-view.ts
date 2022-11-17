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
    this.renderer.drawAll();
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

    let r = 0;
    if (hoveredId > 0 && hoveredId !== this.state.dragLineSourceNode.id) {
      r = hoveredId;
    }

    const s = this.state.dragLineSourceNode;

    this.state.dragLineSourceNode = undefined;

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
    const { drawData, nodes, edges } = this.state;

    const affectedIds = new Set(nodeIds);

    this.renderer.redrawNodes(affectedIds);

    affectedIds.clear();

    for (const id of nodeIds) {
      const dd = drawData[id] as NodeDrawData;

      for (const eid of dd.sourceOfEdgeIds) {
        affectedIds.add(eid);
      }

      for (const eid of dd.targetOfEdgeIds) {
        affectedIds.add(eid);
      }
    }

    this.renderer.redrawEdges(affectedIds);

    for (const eid of affectedIds) {
      this.renderer.drawEdge(edges[eid], true);
    }

    for (const nid of nodeIds) {
      this.renderer.drawNode(nodes[nid], true);
    }

    this.state.moveNodeIds = nodeIds;
    this.state.moveX = vx;
    this.state.moveY = vy;
  }

  endMoveNodes() {
    const { moveNodeIds, drawData, nodes, edges } = this.state;

    for (const id of moveNodeIds) {
      this.renderer.drawNode(nodes[id]);
    }

    const isRendered: Record<number, boolean> = {};

    for (const id of moveNodeIds) {
      const dd = drawData[id] as NodeDrawData;

      for (const eid of dd.sourceOfEdgeIds) {
        if (isRendered[eid]) continue;

        isRendered[eid] = true;
        this.renderer.drawEdge(edges[eid]);
      }

      for (const eid of dd.targetOfEdgeIds) {
        if (isRendered[eid]) continue;

        isRendered[eid] = true;
        this.renderer.drawEdge(edges[eid]);
      }
    }

    this.renderer.clearMove();

    this.state.moveNodeIds.length = 0;
  }

  getHoveredId() {
    return this.state.hoveredId;
  }

  select(id: number) {
    const { nodes, edges, selectedIds } = this.state;

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

    if (nodes[id]) this.renderer.drawNode(nodes[id]);
    if (edges[id]) this.renderer.drawEdge(edges[id]);
  }

  removeSelection(id: number) {
    const { nodes, edges, selectedIds } = this.state;

    selectedIds.delete(id);

    if (nodes[id]) this.renderer.drawNode(nodes[id]);
    if (edges[id]) this.renderer.drawEdge(edges[id]);
  }

  clearSelection() {
    const { nodes, edges, selectedIds } = this.state;

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

    this.state.quad.insert(
      node.id,
      node.x - shape.width * 0.5,
      node.y - shape.height * 0.5,
      shape.width,
      shape.height
    );

    this.renderer.drawNode(node);

    return true;
  }

  addEdge(edge: Edge, shape: GraphShape): boolean {
    const { nodes, edges, drawData } = this.state;

    if (nodes[edge.id] || edges[edge.id]) return false;
    if (!nodes[edge.sourceId] || !nodes[edge.targetId]) return false;

    const snd = drawData[edge.sourceId] as NodeDrawData;
    const tnd = drawData[edge.targetId] as NodeDrawData;

    for (const eid of snd.sourceOfEdgeIds) {
      if (edges[eid].targetId === edge.targetId) return false;
    }

    for (const eid of tnd.targetOfEdgeIds) {
      if (edges[eid].sourceId === edge.sourceId) return false;
    }

    edges[edge.id] = edge;

    snd.sourceOfEdgeIds.add(edge.id);
    tnd.targetOfEdgeIds.add(edge.id);

    this.renderer.createEdgePath(edge, shape);

    const source = nodes[edge.sourceId];
    const target = nodes[edge.targetId];

    this.state.quad.insert(
      edge.id,
      Math.min(source.x, target.x),
      Math.min(source.y, target.y),
      Math.max(Math.abs(source.x - target.x), shape.width),
      Math.max(Math.abs(source.y - target.y), shape.height)
    );

    this.renderer.drawEdge(edge);

    // console.log(this.state.quad);

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

      this.renderer.drawEdge(edge, true);
    }

    for (const edgeId of ndd.targetOfEdgeIds) {
      const edge = edges[edgeId];
      const edd = drawData[edgeId];

      this.renderer.createEdgePath(edge, edd.shape);

      this.renderer.drawEdge(edge, true);
    }

    this.renderer.drawNode(node, true);

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
      this.renderer.redrawEdges();
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

    requestAnimationFrame(() => this.renderer.redrawNodes());

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

    requestAnimationFrame(() => this.renderer.redrawEdges());

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
    this.state.selectedIds.clear();
    this.state.moveNodeIds = [];
    this.state.dragLineSourceNode = undefined;
    this.state.quad.clear();

    this.renderer.clearNodes();
    this.renderer.clearEdges();
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
    // this.renderer.drawAll();
    this.renderer.requestDraw();
  }

  moveBy(x: number, y: number) {
    this.state.translateX += x;
    this.state.translateY += y;

    // const ovx = this.state.viewX;
    // const ovy = this.state.viewY;
    // const ovw = this.state.viewW;
    // const ovh = this.state.viewH;

    // requestAnimationFrame(() => {
    this.renderer.applyTransform();
    // this.renderer.drawAll();
    // this.renderer.drawUncoveredRegion(ovx, ovy, ovw, ovh);
    // });

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

    // const ovx = this.state.viewX;
    // const ovy = this.state.viewY;
    // const ovw = this.state.viewW;
    // const ovh = this.state.viewH;

    this.renderer.applyTransform();
    // this.renderer.drawUncoveredRegion(ovx, ovy, ovw, ovh);

    // this.renderer.drawAll();
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

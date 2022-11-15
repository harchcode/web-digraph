import { GraphRenderer } from "./graph-renderer";
import { GraphState } from "./graph-state";
import { GraphView } from "./graph-view";
import {
  EdgeDrawData,
  GraphEdge,
  NodeDrawData,
  GraphNode,
  GraphDataType
} from "./types";

export class GraphHandler<Node extends GraphNode, Edge extends GraphEdge> {
  private state: GraphState<Node, Edge>;
  private view: GraphView<Node, Edge>;
  private renderer: GraphRenderer<Node, Edge>;

  constructor(
    view: GraphView<Node, Edge>,
    state: GraphState<Node, Edge>,
    renderer: GraphRenderer<Node, Edge>
  ) {
    this.view = view;
    this.state = state;
    this.renderer = renderer;
  }

  handleMouseMove = (e: MouseEvent) => {
    const { moveNodeIds, moveX, moveY, dragLineSourceNode, isMovingView } =
      this.state;

    if (isMovingView && !dragLineSourceNode && moveNodeIds.length === 0) {
      this.view.moveBy(e.movementX, e.movementY);
      return;
    }

    const vp = this.view.getViewPosFromWindowPos(e.x, e.y);

    if (dragLineSourceNode) {
      this.state.dragLineX = vp[0];
      this.state.dragLineY = vp[1];

      this.renderer.requestDraw();
    }

    if (moveNodeIds.length === 0) {
      this.checkHover(vp[0], vp[1]);

      return;
    }

    const dx = vp[0] - moveX;
    const dy = vp[1] - moveY;

    this.state.moveX = vp[0];
    this.state.moveY = vp[1];

    for (const id of moveNodeIds) {
      this.view.moveNode(id, dx, dy);
    }
  };

  private isEdgeHovered(x: number, y: number, edge: Edge) {
    const { ctx, drawData } = this.state;

    const data = drawData[edge.id] as EdgeDrawData;

    return (
      ctx.isPointInPath(data.path, x, y) ||
      ctx.isPointInStroke(data.linePath, x, y) ||
      ctx.isPointInPath(data.arrowPath, x, y)
    );
  }

  private isNodeHovered(x: number, y: number, node: Node) {
    const { ctx, drawData } = this.state;

    const data = drawData[node.id] as NodeDrawData;

    return ctx.isPointInPath(data.path, x, y);
  }

  private checkHover(vx: number, vy: number) {
    const { nodes, edges, selectedIdMap } = this.state;

    const prevId = this.state.hoveredId;
    this.state.hoveredId = 0;

    for (const node of Object.values(nodes)) {
      if (!this.renderer.isNodeInView(node)) continue;

      if (this.isNodeHovered(vx, vy, node)) {
        this.state.hoveredId = node.id;
      }
    }

    for (const edge of Object.values(edges)) {
      if (!this.renderer.isEdgeInView(edge)) continue;

      if (this.isEdgeHovered(vx, vy, edge)) {
        this.state.hoveredId = edge.id;
      }
    }

    if (this.state.hoveredId === prevId) return;

    const currId = this.state.hoveredId;
    const prev = this.state.drawData[prevId];
    const curr = this.state.drawData[currId];

    this.renderer.applyTransform();

    if (prev) {
      if (prev.type === GraphDataType.NODE) {
        this.renderer.drawNode(nodes[prevId], false, selectedIdMap[prevId]);
      } else if (prev.type === GraphDataType.EDGE) {
        this.renderer.drawEdge(edges[prevId], false, selectedIdMap[prevId]);
      }
    }

    if (curr) {
      if (curr.type === GraphDataType.NODE) {
        this.renderer.drawNode(nodes[currId], true, selectedIdMap[currId]);
      } else if (curr.type === GraphDataType.EDGE) {
        this.renderer.drawEdge(edges[currId], true, selectedIdMap[currId]);
      }
    }

    this.renderer.resetTransform();
  }

  handleWheel = (e: WheelEvent) => {
    const pos = this.view.getViewPosFromWindowPos(e.x, e.y);

    this.view.zoomBy(-e.deltaY * 0.001, pos[0], pos[1]);
  };

  init() {
    const { container } = this.state;

    container.addEventListener("mousemove", this.handleMouseMove, {
      passive: true
    });
    container.addEventListener("wheel", this.handleWheel, { passive: true });
  }

  destroy() {
    const { container } = this.state;

    container.removeEventListener("mousemove", this.handleMouseMove);
    container.removeEventListener("wheel", this.handleWheel);
  }
}

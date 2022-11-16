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

  private vp: [number, number] = [0, 0];
  private cp: [number, number] = [0, 0];
  private dp: [number, number] = [0, 0];

  constructor(
    view: GraphView<Node, Edge>,
    state: GraphState<Node, Edge>,
    renderer: GraphRenderer<Node, Edge>
  ) {
    this.view = view;
    this.state = state;
    this.renderer = renderer;
  }

  moveBy = () => {
    this.view.moveBy(this.dp[0], this.dp[1]);
  };

  handleMouseMove = (e: MouseEvent) => {
    const { moveNodeIds, moveX, moveY, dragLineSourceNode, isMovingView } =
      this.state;

    // this.dp[0] = e.movementX;
    // this.dp[1] = e.movementY;

    if (isMovingView && !dragLineSourceNode && moveNodeIds.length === 0) {
      // requestAnimationFrame(() => {
      this.view.moveBy(e.movementX, e.movementY);
      // });

      return;
    }

    const vp = this.view.getViewPosFromWindowPos(e.x, e.y);
    const cp = this.view.getCanvasPosFromWindowPos(e.x, e.y);

    if (dragLineSourceNode) {
      this.state.dragLineX = vp[0];
      this.state.dragLineY = vp[1];

      requestAnimationFrame(this.renderer.drawDragLine);
    }

    if (moveNodeIds.length === 0) {
      requestAnimationFrame(() => this.checkHover(cp[0], cp[1]));

      return;
    }

    const dx = vp[0] - moveX;
    const dy = vp[1] - moveY;

    this.state.moveX = vp[0];
    this.state.moveY = vp[1];

    this.renderer.clearMove();

    for (const id of moveNodeIds) {
      this.view.moveNode(id, dx, dy);
    }
  };

  private isEdgeHovered(x: number, y: number, edge: Edge) {
    const { edgeCtx, drawData } = this.state;

    const data = drawData[edge.id] as EdgeDrawData;

    return (
      edgeCtx.isPointInPath(data.path, x, y) ||
      edgeCtx.isPointInStroke(data.linePath, x, y) ||
      edgeCtx.isPointInPath(data.arrowPath, x, y)
    );
  }

  private isNodeHovered(x: number, y: number, node: Node) {
    const { nodeCtx, drawData } = this.state;

    const data = drawData[node.id] as NodeDrawData;

    return nodeCtx.isPointInPath(data.path, x, y);
  }

  private checkHover(vx: number, vy: number) {
    const { nodes, edges } = this.state;

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

    if (prev) {
      if (prev.type === GraphDataType.NODE) {
        this.renderer.drawNode(nodes[prevId]);
      } else if (prev.type === GraphDataType.EDGE) {
        this.renderer.drawEdge(edges[prevId]);
      }
    }

    if (curr) {
      if (curr.type === GraphDataType.NODE) {
        this.renderer.drawNode(nodes[currId]);
      } else if (curr.type === GraphDataType.EDGE) {
        this.renderer.drawEdge(edges[currId]);
      }
    }
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

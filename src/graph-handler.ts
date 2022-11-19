import { GraphRenderer, RedrawType } from "./graph-renderer";
import { GraphState } from "./graph-state";
import { GraphView } from "./graph-view";
import { GraphEdge, GraphNode, GraphDataType } from "./types";

export class GraphHandler<Node extends GraphNode, Edge extends GraphEdge> {
  private state: GraphState<Node, Edge>;
  private view: GraphView<Node, Edge>;
  private renderer: GraphRenderer<Node, Edge>;

  private vp: [number, number] = [0, 0];
  private cp: [number, number] = [0, 0];

  constructor(
    view: GraphView<Node, Edge>,
    state: GraphState<Node, Edge>,
    renderer: GraphRenderer<Node, Edge>
  ) {
    this.view = view;
    this.state = state;
    this.renderer = renderer;
  }

  handleMove = (dwx: number, dwy: number, wx: number, wy: number) => {
    const { moveNodeIds, moveX, moveY, dragLineSourceNode, isMovingView } =
      this.state;

    if (isMovingView && !dragLineSourceNode && moveNodeIds.length === 0) {
      this.view.moveBy(dwx, dwy);

      return;
    }

    this.view.viewPosFromWindowPos(this.vp, wx, wy);

    if (dragLineSourceNode) {
      this.state.dragLineX = this.vp[0];
      this.state.dragLineY = this.vp[1];

      requestAnimationFrame(this.renderer.drawDragLine);
    }

    if (moveNodeIds.length === 0) {
      requestAnimationFrame(this.checkHover);

      return;
    }

    const dx = this.vp[0] - moveX;
    const dy = this.vp[1] - moveY;

    this.state.moveX = this.vp[0];
    this.state.moveY = this.vp[1];

    this.view.startBatch();

    for (const id of moveNodeIds) {
      this.view.moveNode(id, dx, dy);
    }

    this.view.endBatch(RedrawType.MOVE);
  };

  handleMouseMove = (e: MouseEvent) => {
    this.handleMove(e.movementX, e.movementY, e.x, e.y);
  };

  private isEdgeHovered(x: number, y: number, edge: Edge): boolean {
    const { edgeCtx, edgeData } = this.state;

    const data = edgeData[edge.id];

    if (!data.path || !data.linePath || !data.arrowPath) return false;

    return (
      edgeCtx.isPointInPath(data.path, x, y) ||
      edgeCtx.isPointInStroke(data.linePath, x, y) ||
      edgeCtx.isPointInPath(data.arrowPath, x, y)
    );
  }

  private isNodeHovered(x: number, y: number, node: Node): boolean {
    const { nodeCtx, nodeData } = this.state;

    const data = nodeData[node.id];

    return data.path ? nodeCtx.isPointInPath(data.path, x, y) : false;
  }

  private checkHover = () => {
    const { nodes, edges } = this.state;

    const prevId = this.state.hoveredId;
    this.state.hoveredId = 0;

    this.view.canvasPosFromViewPos(this.cp, this.vp[0], this.vp[1]);
    this.state.quad.getDataInRegion(
      this.vp[0] - 1,
      this.vp[1] - 1,
      2,
      2,
      this.state.drawIds
    );

    for (const id of this.state.drawIds) {
      if (nodes[id] && this.isNodeHovered(this.cp[0], this.cp[1], nodes[id]))
        this.state.hoveredId = id;

      if (edges[id] && this.isEdgeHovered(this.cp[0], this.cp[1], edges[id]))
        this.state.hoveredId = id;
    }

    if (this.state.hoveredId === prevId) return;

    const currId = this.state.hoveredId;
    const prev = this.state.nodeData[prevId] || this.state.edgeData[prevId];
    const curr = this.state.nodeData[currId] || this.state.edgeData[currId];

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
  };

  handleWheel = (e: WheelEvent) => {
    this.view.viewPosFromWindowPos(this.vp, e.x, e.y);

    this.view.zoomBy(-e.deltaY * 0.001, this.vp[0], this.vp[1]);
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

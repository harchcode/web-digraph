import { GraphRenderer } from "./graph-renderer";
import { GraphState } from "./graph-state";
import { GraphView } from "./graph-view";
import { GraphEdge, GraphNode } from "./types";

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
    const { moveNodeIds, moveX, moveY, dragLineSourceNode } = this.state;

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
    const { ctx, pathMap, linePathMap, arrowPathMap } = this.state;

    return (
      ctx.isPointInPath(pathMap[edge.id], x, y) ||
      ctx.isPointInStroke(linePathMap[edge.id], x, y) ||
      ctx.isPointInPath(arrowPathMap[edge.id], x, y)
    );
  }

  private isNodeHovered(x: number, y: number, node: Node) {
    const { ctx, pathMap } = this.state;

    return ctx.isPointInPath(pathMap[node.id], x, y);
  }

  private checkHover(vx: number, vy: number) {
    const { nodes, edges, idMap, selectedIdMap } = this.state;

    const prevId = this.state.hoveredId;
    this.state.hoveredId = 0;

    for (const node of nodes) {
      if (this.isNodeHovered(vx, vy, node)) {
        this.state.hoveredId = node.id;
      }
    }

    for (const edge of edges) {
      if (this.isEdgeHovered(vx, vy, edge)) {
        this.state.hoveredId = edge.id;
      }
    }

    if (this.state.hoveredId === prevId) return;

    const prev = idMap[prevId] as Node | Edge | undefined;
    const curr = idMap[this.state.hoveredId] as Node | Edge | undefined;

    this.renderer.applyTransform();

    if (prev) {
      if ("x" in prev) {
        this.renderer.drawNode(prev, false, selectedIdMap[prev.id]);
      } else {
        this.renderer.drawEdge(prev, false, selectedIdMap[prev.id]);
      }
    }

    if (curr) {
      if ("x" in curr) {
        this.renderer.drawNode(curr, true, selectedIdMap[curr.id]);
      } else {
        this.renderer.drawEdge(curr, true, selectedIdMap[curr.id]);
      }
    }

    this.renderer.resetTransform();
  }

  init() {
    this.state.container.addEventListener("mousemove", this.handleMouseMove);
  }

  destroy() {
    this.state.container.removeEventListener("mousemove", this.handleMouseMove);
  }
}

import { GraphState } from "./graph-state";
import { GraphView } from "./graph-view";
import { GraphEdge, GraphNode } from "./types";

export class GraphRenderer<Node extends GraphNode, Edge extends GraphEdge> {
  private state: GraphState<Node, Edge>;
  private view: GraphView<Node, Edge>;

  constructor(view: GraphView<Node, Edge>, state: GraphState<Node, Edge>) {
    this.view = view;
    this.state = state;
  }

  applyTransform() {
    const { ctx, scale, translateX, translateY } = this.state;

    ctx.setTransform(scale, 0, 0, scale, translateX, translateY);
    this.state.setView();
  }

  resetTransform() {
    this.state.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

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

    this.view.viewPosFromWindowPos(this.vp, e.x, e.y);

    // if (dragLineSourceNode) {
    //   this.state.dragLineX = vp[0];
    //   this.state.dragLineY = vp[1];

    //   requestAnimationFrame(this.renderer.drawDragLine);
    // }

    // if (moveNodeIds.length === 0) {
    //   requestAnimationFrame(() => this.checkHover(vp[0], vp[1]));

    //   return;
    // }

    // const dx = vp[0] - moveX;
    // const dy = vp[1] - moveY;

    // this.state.moveX = vp[0];
    // this.state.moveY = vp[1];

    // this.renderer.clearMove();

    // for (const id of moveNodeIds) {
    //   this.view.moveNode(id, dx, dy);
    // }
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

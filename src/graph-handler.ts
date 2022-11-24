import { GraphRenderer } from "./graph-renderer";
import { GraphState } from "./graph-state";
import { GraphView } from "./graph-view";
import {
  GraphEdge,
  GraphNode,
  GraphDataType,
  GraphMode,
  RedrawType
} from "./types";

export class GraphHandler<Node extends GraphNode, Edge extends GraphEdge> {
  private state: GraphState<Node, Edge>;
  private view: GraphView<Node, Edge>;
  private renderer: GraphRenderer<Node, Edge>;

  private vp: [number, number] = [0, 0];
  private cp: [number, number] = [0, 0];

  private prevDiff = -1;
  private evs: Map<number, PointerEvent> = new Map();

  constructor(
    view: GraphView<Node, Edge>,
    state: GraphState<Node, Edge>,
    renderer: GraphRenderer<Node, Edge>
  ) {
    this.view = view;
    this.state = state;
    this.renderer = renderer;
  }

  handlePointerDown = (e: PointerEvent) => {
    const { moveNodeIds } = this.state;

    this.evs.set(e.pointerId, e);
    if (this.evs.size > 1) return;

    this.view.viewPosFromWindowPos(this.vp, e.x, e.y);

    if (moveNodeIds.length === 0) {
      this.checkHover();
    }

    const { hoveredId } = this.state;

    if (this.view.modes.has(GraphMode.SELECT)) {
      if (this.state.hoveredId) {
        if (this.view.modes.has(GraphMode.MULTISELECT)) {
          this.view.addSelection(hoveredId);
        } else {
          this.view.select(this.state.hoveredId);
        }
      } else {
        this.view.clearSelection();
      }
    }

    if (!hoveredId) {
      if (this.view.modes.has(GraphMode.CREATE_NODE)) {
        this.state.options.onCreateNode(this.vp[0], this.vp[1]);
      } else if (this.view.modes.has(GraphMode.MOVE_VIEW)) {
        this.view.beginMoveView();
      }
    } else {
      if (this.view.modes.has(GraphMode.CREATE_EDGE)) {
        this.view.beginDragLine();
      } else if (
        this.view.modes.has(GraphMode.MOVE_NODE) &&
        this.state.nodes[hoveredId]
      ) {
        this.view.beginMoveNodes(
          this.view.getSelectedNodeIds(),
          this.vp[0],
          this.vp[1]
        );
      } else if (this.view.modes.has(GraphMode.MOVE_VIEW)) {
        this.view.beginMoveView();
      }
    }
  };

  handlePointerMove = (e: PointerEvent) => {
    const { moveNodeIds, moveX, moveY, dragLineSourceNode, isMovingView } =
      this.state;

    this.evs.set(e.pointerId, e);

    if (this.evs.size > 2) return;

    if (
      this.evs.size === 2 &&
      !dragLineSourceNode &&
      moveNodeIds.length === 0
    ) {
      let e1: PointerEvent | undefined = undefined;
      let e2: PointerEvent | undefined = undefined;

      for (const x of this.evs.entries()) {
        if (!e1) e1 = x[1];
        else e2 = x[1];
      }

      if (!e1 || !e2) return;

      const dx = e1.x - e2.x;
      const dy = e1.y - e2.y;

      const curDiff = dx * dx + dy * dy;

      if (this.prevDiff > 0) {
        const cx = (e1.x + e2.x) * 0.5;
        const cy = (e1.y + e2.y) * 0.5;

        this.view.viewPosFromWindowPos(this.vp, cx, cy);

        const diff = curDiff - this.prevDiff;
        this.view.zoomBy(diff * 0.00002, this.vp[0], this.vp[1]);

        this.state.options.onViewZoom();
      }

      this.prevDiff = curDiff;
    }

    if (this.evs.size > 1) return;

    if (isMovingView && !dragLineSourceNode && moveNodeIds.length === 0) {
      this.view.moveBy(e.movementX, e.movementY);

      return;
    }

    this.view.viewPosFromWindowPos(this.vp, e.x, e.y);

    if (dragLineSourceNode) {
      this.state.dragLineX = this.vp[0];
      this.state.dragLineY = this.vp[1];

      requestAnimationFrame(this.renderer.drawDragLine);
    }

    if (moveNodeIds.length === 0) {
      this.checkHover();

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

  handlePointerUp = (e: PointerEvent) => {
    this.evs.delete(e.pointerId);

    if (this.evs.size < 2) {
      this.prevDiff = -1;
    }

    this.view.endMoveView();
    this.view.endMoveNodes();

    const dragLineNodes = this.view.endDragLine();

    if (dragLineNodes) {
      this.state.options.onCreateEdge(dragLineNodes[0].id, dragLineNodes[1].id);
    }
  };

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
      if (
        nodes[id] &&
        this.view.isNodeHovered(this.cp[0], this.cp[1], nodes[id])
      )
        this.state.hoveredId = id;

      if (
        edges[id] &&
        this.view.isEdgeHovered(this.cp[0], this.cp[1], edges[id])
      )
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
    if (!this.view.modes.has(GraphMode.ZOOM)) return;

    this.view.viewPosFromWindowPos(this.vp, e.x, e.y);
    this.view.zoomBy(-e.deltaY * 0.001, this.vp[0], this.vp[1]);

    this.state.options.onViewZoom();
  };

  init() {
    const { container } = this.state;

    container.style.touchAction = "none";

    container.addEventListener("wheel", this.handleWheel, { passive: true });
    container.addEventListener("pointerdown", this.handlePointerDown);
    container.addEventListener("pointermove", this.handlePointerMove);
    container.addEventListener("pointerup", this.handlePointerUp);
    container.addEventListener("pointercancel", this.handlePointerUp);
    container.addEventListener("pointerout", this.handlePointerUp);
    container.addEventListener("pointerleave", this.handlePointerUp);
  }

  destroy() {
    const { container } = this.state;

    container.style.touchAction = "auto";

    container.removeEventListener("wheel", this.handleWheel);
    container.removeEventListener("pointerdown", this.handlePointerDown);
    container.removeEventListener("pointermove", this.handlePointerMove);
    container.removeEventListener("pointerup", this.handlePointerUp);
    container.removeEventListener("pointercancel", this.handlePointerUp);
    container.removeEventListener("pointerout", this.handlePointerUp);
    container.removeEventListener("pointerleave", this.handlePointerUp);
  }
}

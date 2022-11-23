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

  private prev: [number, number] = [0, 0];
  private evCache: PointerEvent[] = [];
  private prevDiff = -1;

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

  handleMouseMove = (e: MouseEvent) => {
    this.handleMove(e.movementX, e.movementY, e.x, e.y);
  };

  handleMouseDown = (e: MouseEvent) => {
    const { moveNodeIds } = this.state;

    this.view.viewPosFromWindowPos(this.vp, e.x, e.y);

    if (moveNodeIds.length === 0) {
      this.checkHover();
    }
  };

  handleTouchStart = (e: TouchEvent) => {
    const { moveNodeIds } = this.state;

    e.preventDefault();

    const touch = e.targetTouches[0];

    this.view.viewPosFromWindowPos(this.vp, touch.clientX, touch.clientY);

    this.prev[0] = touch.clientX;
    this.prev[1] = touch.clientY;

    if (moveNodeIds.length === 0) {
      this.checkHover();
    }
  };

  handleTouchMove = (e: TouchEvent) => {
    const touch = e.targetTouches[0];

    const dx = touch.clientX - this.prev[0];
    const dy = touch.clientY - this.prev[1];

    this.prev[0] = touch.clientX;
    this.prev[1] = touch.clientY;

    this.handleMove(dx, dy, touch.clientX, touch.clientY);
  };

  pointerdownHandler = (ev: PointerEvent) => {
    // The pointerdown event signals the start of a touch interaction.
    // This event is cached to support 2-finger gestures
    this.evCache.push(ev);
  };

  pointermoveHandler = (ev: PointerEvent) => {
    // This function implements a 2-pointer horizontal pinch/zoom gesture.
    //
    // If the distance between the two pointers has increased (zoom in),
    // the target element's background is changed to "pink" and if the
    // distance is decreasing (zoom out), the color is changed to "lightblue".
    //
    // This function sets the target element's border to "dashed" to visually
    // indicate the pointer's target received a move event.

    // Find this event in the cache and update its record with this event
    const index = this.evCache.findIndex(
      cachedEv => cachedEv.pointerId === ev.pointerId
    );
    this.evCache[index] = ev;

    // If two pointers are down, check for pinch gestures
    if (this.evCache.length === 2) {
      // Calculate the distance between the two pointers
      const curDiff = Math.abs(
        this.evCache[0].clientX - this.evCache[1].clientX
      );

      if (this.prevDiff > 0) {
        const cx = (this.evCache[0].clientX + this.evCache[1].clientX) * 0.5;
        const cy = (this.evCache[0].clientY + this.evCache[1].clientY) * 0.5;

        this.view.viewPosFromWindowPos(this.vp, cx, cy);

        if (curDiff > this.prevDiff) {
          // The distance between the two pointers has increased

          const diff = curDiff - this.prevDiff;

          this.view.zoomBy(diff * 0.01, this.vp[0], this.vp[1]);
        }
        if (curDiff < this.prevDiff) {
          // The distance between the two pointers has decreased

          const diff = this.prevDiff - curDiff;

          this.view.zoomBy(-diff * 0.01, this.vp[0], this.vp[1]);
        }
      }

      // Cache the distance for the next move event
      this.prevDiff = curDiff;
    }
  };

  pointerupHandler = (ev: PointerEvent) => {
    // Remove this pointer from the cache and reset the target's
    // background and border
    this.removeEvent(ev);
    this.state.container.style.background = "white";
    this.state.container.style.border = "1px solid black";

    // If the number of pointers down is less than two then reset diff tracker
    if (this.evCache.length < 2) {
      this.prevDiff = -1;
    }
  };

  removeEvent = (ev: PointerEvent) => {
    // Remove this event from the target's cache
    const index = this.evCache.findIndex(
      cachedEv => cachedEv.pointerId === ev.pointerId
    );
    this.evCache.splice(index, 1);
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

    container.addEventListener("mousedown", this.handleMouseDown);
    container.addEventListener("mousemove", this.handleMouseMove);
    container.addEventListener("touchstart", this.handleTouchStart);
    container.addEventListener("touchmove", this.handleTouchMove);
    container.addEventListener("wheel", this.handleWheel, { passive: true });

    container.addEventListener("pointerdown", this.pointerdownHandler);
    container.addEventListener("pointermove", this.pointermoveHandler);
    container.addEventListener("pointerup", this.pointerupHandler);
    container.addEventListener("pointercancel", this.pointerupHandler);
    container.addEventListener("pointerout", this.pointerupHandler);
    container.addEventListener("pointerleave", this.pointerupHandler);
  }

  destroy() {
    const { container } = this.state;

    container.removeEventListener("mousemove", this.handleMouseMove);
    container.removeEventListener("wheel", this.handleWheel);
  }
}

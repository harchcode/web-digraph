import { GEState } from "./state";
import { GEGraphRenderer } from "./graph-renderer";

export class GEEventHandler {
  state: GEState;
  canvas: HTMLCanvasElement;
  renderer: GEGraphRenderer;

  constructor(
    view: GEState,
    canvas: HTMLCanvasElement,
    renderer: GEGraphRenderer
  ) {
    this.state = view;
    this.canvas = canvas;
    this.renderer = renderer;
  }

  init(): void {
    this.canvas.addEventListener("mousedown", this.handleMouseDown, {
      passive: true
    });
    window.addEventListener("mouseup", this.handleMouseUp, { passive: true });
    window.addEventListener("mousemove", this.handleMouseMove, {
      passive: true
    });
    window.addEventListener("keydown", this.handleKeyDown, { passive: true });
    window.addEventListener("keyup", this.handleKeyUp, { passive: true });
    this.canvas.addEventListener("wheel", this.handleCanvasWheel, {
      passive: false
    });
  }

  destroy(): void {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("wheel", this.handleCanvasWheel);
  }

  handleMouseDown = (evt: MouseEvent): void => {
    this.state.setPointerPosition(evt.clientX, evt.clientY);

    this.state.isDragging = true;

    this.state.selectedNodeId = this.state.hoveredNodeId;
    this.state.selectedEdgeId = this.state.hoveredEdgeId;

    if (this.state.selectedNodeId > 0) {
      const node = this.state.nodes.get(this.state.selectedNodeId);

      if (this.state.isShiftDown) {
        this.state.isCreatingEdge = true;
        this.state.drageLineSourceNodeId = this.state.selectedNodeId;
        this.state.dragLineTargetX = node.x;
        this.state.dragLineTargetY = node.y;
      } else {
        this.state.moveNodeX = node.x;
        this.state.moveNodeY = node.y;
      }
    }

    this.renderer.requestDraw();
  };

  handleMouseMove = (evt: MouseEvent): void => {
    this.state.setPointerPosition(evt.clientX, evt.clientY);

    if (this.state.isMovingNode()) {
      this.state.moveNodeX += evt.movementX / this.state.scale;
      this.state.moveNodeY += evt.movementY / this.state.scale;
    } else if (this.state.isMovingView()) {
      this.state.translateX += evt.movementX;
      this.state.translateY += evt.movementY;
    }

    this.renderer.requestDraw();
    this.updateCursorStyle();
  };

  handleMouseUp = (evt: MouseEvent): void => {
    this.state.setPointerPosition(evt.clientX, evt.clientY);

    if (
      this.state.isCreatingEdge &&
      this.state.hoveredNodeId > 0 &&
      this.state.hoveredNodeId !== this.state.drageLineSourceNodeId
    ) {
      const sourceNode = this.state.nodes.get(this.state.drageLineSourceNodeId);

      const targetNode = this.state.nodes.get(this.state.hoveredNodeId);

      this.state.options.onCreateEdge?.(sourceNode, targetNode, evt);
    } else if (
      this.state.isShiftDown &&
      !this.state.isCreatingEdge &&
      this.state.hoveredNodeId <= 0 &&
      this.state.hoveredEdgeId <= 0
    ) {
      this.state.options.onCreateNode?.(
        this.state.pointerViewX,
        this.state.pointerViewY,
        evt
      );
    } else if (this.state.isMovingNode()) {
      const node = this.state.nodes.get(this.state.selectedNodeId);

      this.state.options.onMoveNode?.(
        node,
        this.state.moveNodeX,
        this.state.moveNodeY
      );
    }

    this.state.isDragging = false;
    this.state.isCreatingEdge = false;

    this.renderer.requestDraw();
  };

  updateCursorStyle = (): void => {
    const { options } = this.state;

    if (this.state.hoveredNodeId > 0 || this.state.hoveredEdgeId > 0) {
      this.canvas.style.cursor = options.cursorPointer;
    } else if (!this.state.isShiftDown) {
      this.canvas.style.cursor = options.cursorGrab;
    } else {
      this.canvas.style.cursor = options.cursorCrosshair;
    }
  };

  handleKeyDown = (evt: KeyboardEvent): void => {
    if (evt.key === "Shift" || evt.keyCode === 16) {
      this.state.isShiftDown = true;
      this.updateCursorStyle();
    }

    if (
      evt.key === "Backspace" ||
      evt.keyCode === 8 ||
      evt.key === "Delete" ||
      evt.keyCode === 46
    ) {
      if (this.state.selectedNodeId > 0) {
        const node = this.state.nodes.get(this.state.selectedNodeId);

        this.state.options.onDeleteNode?.(node);
        this.state.selectedNodeId = 0;
      }

      if (this.state.selectedEdgeId > 0) {
        const edge = this.state.edges.get(this.state.selectedEdgeId);
        const source = this.state.nodes.get(edge.sourceNodeId);
        const target = this.state.nodes.get(edge.targetNodeId);

        this.state.options.onDeleteEdge?.(edge, source, target);
        this.state.selectedEdgeId = 0;
      }

      this.renderer.requestDraw();
      this.updateCursorStyle();
    }
  };

  handleKeyUp = (evt: KeyboardEvent): void => {
    if (evt.key === "Shift" || evt.keyCode === 16) {
      this.state.isShiftDown = false;
      this.updateCursorStyle();
    }
  };

  handleCanvasWheel = (evt: WheelEvent): void => {
    evt.preventDefault();

    this.state.zoomTo(
      this.state.scale - evt.deltaY * 0.001,
      this.state.pointerViewX,
      this.state.pointerViewY
    );

    this.state.options.onViewZoom?.();

    this.renderer.requestDraw();
  };
}

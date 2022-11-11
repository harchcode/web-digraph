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

    if (
      this.state.selectedNode !== this.state.hoveredNode ||
      this.state.selectedEdge !== this.state.hoveredEdge
    ) {
      this.state.selectedNode = this.state.hoveredNode;
      this.state.selectedEdge = this.state.hoveredEdge;

      this.state.options.onSelectionChange?.(
        this.state.selectedNode,
        this.state.selectedEdge
      );
    }

    if (this.state.selectedNode) {
      const node = this.state.selectedNode;

      if (this.state.isShiftDown) {
        this.state.isCreatingEdge = true;
        this.state.dragLineSourceNode = node;
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
      this.state.hoveredNode &&
      this.state.hoveredNode !== this.state.dragLineSourceNode
    ) {
      const sourceNode = this.state.dragLineSourceNode;
      const targetNode = this.state.hoveredNode;

      this.state.options.onCreateEdge?.(sourceNode, targetNode, evt);
    } else if (
      this.state.isShiftDown &&
      !this.state.isCreatingEdge &&
      !this.state.hoveredNode &&
      !this.state.hoveredEdge
    ) {
      this.state.options.onCreateNode?.(
        this.state.pointerViewX,
        this.state.pointerViewY,
        evt
      );
    } else if (this.state.isMovingNode()) {
      const node = this.state.selectedNode;

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

    if (this.state.hoveredNode || this.state.hoveredEdge) {
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
      if (this.state.selectedNode) {
        const node = this.state.selectedNode;

        this.state.options.onDeleteNode?.(node);
        this.state.selectedNode = undefined;
      }

      if (this.state.selectedEdge) {
        const edge = this.state.selectedEdge;
        const source = edge.sourceNode;
        const target = edge.targetNode;

        this.state.options.onDeleteEdge?.(edge, source, target);
        this.state.selectedEdge = undefined;
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

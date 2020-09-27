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
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.canvas.addEventListener("wheel", this.handleCanvasWheel);
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

    if (this.state.isShiftDown && this.state.selectedNodeId > 0) {
      const node = this.state.graph.nodes.get(this.state.selectedNodeId);

      this.state.isCreatingEdge = true;
      this.state.drageLineSourceNodeId = this.state.selectedNodeId;
      this.state.dragLineTargetX = node.x;
      this.state.dragLineTargetY = node.y;
    }

    this.renderer.requestDraw();
  };

  handleMouseUp = (evt: MouseEvent): void => {
    this.state.setPointerPosition(evt.clientX, evt.clientY);

    if (
      this.state.isCreatingEdge &&
      this.state.hoveredNodeId > 0 &&
      this.state.hoveredNodeId !== this.state.drageLineSourceNodeId
    ) {
      this.state.graph.addEdge(
        this.state.drageLineSourceNodeId,
        this.state.hoveredNodeId
      );
    } else if (
      this.state.isShiftDown &&
      !this.state.isCreatingEdge &&
      this.state.hoveredNodeId <= 0 &&
      this.state.hoveredEdgeId <= 0
    ) {
      this.state.graph.addNode(
        this.state.pointerViewX,
        this.state.pointerViewY,
        80
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

  handleMouseMove = (evt: MouseEvent): void => {
    this.state.setPointerPosition(evt.clientX, evt.clientY);

    if (
      this.state.isDragging &&
      !this.state.isCreatingEdge &&
      this.state.selectedNodeId > 0
    ) {
      const node = this.state.graph.nodes.get(this.state.selectedNodeId);

      node.x += evt.movementX / this.state.scale;
      node.y += evt.movementY / this.state.scale;
    } else if (
      !this.state.isShiftDown &&
      this.state.isDragging &&
      this.state.selectedNodeId <= 0
    ) {
      this.state.translateX += evt.movementX;
      this.state.translateY += evt.movementY;
    }

    this.renderer.requestDraw();
    this.updateCursorStyle();
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
        this.state.graph.deleteNode(this.state.selectedNodeId);
        this.state.selectedNodeId = 0;
      }

      if (this.state.selectedEdgeId > 0) {
        this.state.graph.deleteEdge(this.state.selectedEdgeId);
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

    this.renderer.requestDraw();
  };
}

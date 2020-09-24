import { GEView } from "./view";
import { GEGraphRenderer } from "./graph-renderer";

export class GEEventHandler {
  view: GEView;
  renderer: GEGraphRenderer;

  constructor(view: GEView, renderer: GEGraphRenderer) {
    this.view = view;
    this.renderer = renderer;
  }

  init(): void {
    window.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.view.canvas.addEventListener("wheel", this.handleCanvasWheel);
  }

  destroy(): void {
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.view.canvas.removeEventListener("wheel", this.handleCanvasWheel);
  }

  handleMouseDown = (evt: MouseEvent): void => {
    this.view.setPointerPosition(evt.clientX, evt.clientY);

    this.view.isDragging = true;

    this.view.selectedNodeId = this.view.hoveredNodeId;
    this.view.selectedEdgeId = this.view.hoveredEdgeId;

    if (this.view.isShiftDown && this.view.selectedNodeId > 0) {
      const node = this.view.graph.nodes.get(this.view.selectedNodeId);

      this.view.isCreatingEdge = true;
      this.view.drageLineSourceNodeId = this.view.selectedNodeId;
      this.view.dragLineTargetX = node.x;
      this.view.dragLineTargetY = node.y;
    }

    this.renderer.requestDraw();
  };

  handleMouseUp = (evt: MouseEvent): void => {
    this.view.setPointerPosition(evt.clientX, evt.clientY);

    if (
      this.view.isCreatingEdge &&
      this.view.hoveredNodeId > 0 &&
      this.view.hoveredNodeId !== this.view.drageLineSourceNodeId
    ) {
      this.view.graph.addEdge(
        this.view.drageLineSourceNodeId,
        this.view.hoveredNodeId
      );
    } else if (
      this.view.isShiftDown &&
      !this.view.isCreatingEdge &&
      this.view.hoveredNodeId <= 0 &&
      this.view.hoveredEdgeId <= 0
    ) {
      this.view.graph.addNode(
        this.view.pointerViewX,
        this.view.pointerViewY,
        80
      );
    }

    this.view.isDragging = false;
    this.view.isCreatingEdge = false;

    this.renderer.requestDraw();
  };

  updateCursorStyle = (): void => {
    const { options } = this.view;

    if (this.view.hoveredNodeId > 0 || this.view.hoveredEdgeId > 0) {
      this.view.canvas.style.cursor = options.cursorPointer;
    } else if (!this.view.isShiftDown) {
      this.view.canvas.style.cursor = options.cursorGrab;
    } else {
      this.view.canvas.style.cursor = options.cursorCrosshair;
    }
  };

  handleMouseMove = (evt: MouseEvent): void => {
    this.view.setPointerPosition(evt.clientX, evt.clientY);

    if (
      this.view.isDragging &&
      !this.view.isCreatingEdge &&
      this.view.selectedNodeId > 0
    ) {
      const node = this.view.graph.nodes.get(this.view.selectedNodeId);

      node.x += evt.movementX / this.view.scale;
      node.y += evt.movementY / this.view.scale;
    } else if (
      !this.view.isShiftDown &&
      this.view.isDragging &&
      this.view.selectedNodeId <= 0
    ) {
      this.view.translateX += evt.movementX;
      this.view.translateY += evt.movementY;
    }

    this.renderer.requestDraw();
    this.updateCursorStyle();
  };

  handleKeyDown = (evt: KeyboardEvent): void => {
    if (evt.key === "Shift" || evt.keyCode === 16) {
      this.view.isShiftDown = true;
      this.updateCursorStyle();
    }

    if (
      evt.key === "Backspace" ||
      evt.keyCode === 8 ||
      evt.key === "Delete" ||
      evt.keyCode === 46
    ) {
      if (this.view.selectedNodeId > 0) {
        this.view.graph.deleteNode(this.view.selectedNodeId);
        this.view.selectedNodeId = 0;
      }

      if (this.view.selectedEdgeId > 0) {
        this.view.graph.deleteEdge(this.view.selectedEdgeId);
        this.view.selectedEdgeId = 0;
      }

      this.renderer.requestDraw();
      this.updateCursorStyle();
    }
  };

  handleKeyUp = (evt: KeyboardEvent): void => {
    if (evt.key === "Shift" || evt.keyCode === 16) {
      this.view.isShiftDown = false;
      this.updateCursorStyle();
    }
  };

  handleCanvasWheel = (evt: WheelEvent): void => {
    evt.preventDefault();

    const { options } = this.view;

    // calc the new scale, but limitting the value to the max of 3, and min of 0.05
    const newScale = Math.min(
      options.maxScale,
      Math.max(options.minScale, this.view.scale - evt.deltaY * 0.001)
    );

    const deltaScale = newScale - this.view.scale;
    const offsetX = -(this.view.pointerViewX * deltaScale);
    const offsetY = -(this.view.pointerViewY * deltaScale);

    this.view.translateX += offsetX;
    this.view.translateY += offsetY;
    this.view.scale += deltaScale;

    this.renderer.requestDraw();
  };
}

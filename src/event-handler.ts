import { GEGraph } from "./graph";
import { GEGraphRenderer, NODE_RADIUS } from "./graph-renderer";
import { getScreenToViewPosition } from "./utils";

export class GEEventHandler {
  graph: GEGraph;
  renderer: GEGraphRenderer;

  isTicking = false;

  isDragging = false;
  isShiftDown = false;
  isCreatingEdge = false;

  constructor(graph: GEGraph, renderer: GEGraphRenderer) {
    this.graph = graph;
    this.renderer = renderer;
  }

  init(): void {
    window.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.renderer.canvas.addEventListener("wheel", this.handleCanvasWheel);
  }

  destroy(): void {
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.renderer.canvas.removeEventListener("wheel", this.handleCanvasWheel);
  }

  handleMouseDown = (evt: MouseEvent): void => {
    this.isDragging = true;

    this.renderer.selectedNodeId = this.renderer.hoveredNodeId;
    this.renderer.selectedEdgeId = this.renderer.hoveredEdgeId;

    this.renderer.requestDraw();
  };

  handleMouseUp = (evt: MouseEvent): void => {
    this.isDragging = false;

    if (
      this.isShiftDown &&
      !this.isCreatingEdge &&
      this.renderer.hoveredNodeId <= 0 &&
      this.renderer.hoveredEdgeId <= 0
    ) {
      const [viewX, viewY] = getScreenToViewPosition(
        this.renderer.canvas,
        evt.clientX,
        evt.clientY,
        this.renderer.translateX,
        this.renderer.translateY,
        this.renderer.scale
      );

      this.graph.addNode(viewX, viewY);

      this.renderer.requestDraw();
    }
  };

  handleMouseMove = (evt: MouseEvent): void => {
    this.renderer.setPointerPos(evt.clientX, evt.clientY);

    if (this.isDragging && this.renderer.selectedNodeId <= 0) {
      this.renderer.moveView(evt.movementX, evt.movementY);
    } else if (this.isDragging && this.renderer.selectedNodeId > 0) {
      const node = this.graph.nodes.get(this.renderer.selectedNodeId);

      node.x += evt.movementX / this.renderer.scale;
      node.y += evt.movementY / this.renderer.scale;
    }

    this.renderer.requestDraw();
  };

  handleKeyDown = (evt: KeyboardEvent): void => {
    if (evt.key === "Shift" || evt.keyCode === 16) {
      this.isShiftDown = true;
    }

    if (
      evt.key === "Backspace" ||
      evt.keyCode === 8 ||
      evt.key === "Delete" ||
      evt.keyCode === 46
    ) {
      if (this.renderer.selectedNodeId > 0) {
        this.graph.deleteNode(this.renderer.selectedNodeId);
        this.renderer.selectedNodeId = 0;
        this.renderer.requestDraw();
      }

      if (this.renderer.selectedEdgeId > 0) {
        this.graph.deleteEdge(this.renderer.selectedEdgeId);
        this.renderer.selectedEdgeId = 0;
        this.renderer.requestDraw();
      }
    }
  };

  handleKeyUp = (evt: KeyboardEvent): void => {
    if (evt.key === "Shift" || evt.keyCode === 16) {
      this.isShiftDown = false;
    }
  };

  handleCanvasWheel = (evt: WheelEvent): void => {
    evt.preventDefault();

    const [viewX, viewY] = getScreenToViewPosition(
      this.renderer.canvas,
      evt.clientX,
      evt.clientY,
      this.renderer.translateX,
      this.renderer.translateY,
      this.renderer.scale
    );

    // calc the new scale, but limitting the value to the max of 3, and min of 0.05
    const MIN_SCALE = 0.2;
    const MAX_SCALE = 3.0;

    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, this.renderer.scale - evt.deltaY * 0.001)
    );

    const deltaScale = newScale - this.renderer.scale;
    const offsetX = -(viewX * deltaScale);
    const offsetY = -(viewY * deltaScale);

    this.renderer.moveView(offsetX, offsetY);
    this.renderer.zoomView(deltaScale);

    this.renderer.requestDraw();
  };
}

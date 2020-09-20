import { GEGraph } from "./graph";
import { GEGraphRenderer } from "./graph-renderer";

export class GEEventHandler {
  graph: GEGraph;
  renderer: GEGraphRenderer;

  isDragging = false;
  selectedNodeId = 0;
  selectedEdgeId = 0;
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
    // TODO
  };

  handleMouseUp = (evt: MouseEvent): void => {
    // TODO
  };

  handleMouseMove = (evt: MouseEvent): void => {
    // TODO
  };

  handleKeyDown = (evt: KeyboardEvent): void => {
    // TODO
  };

  handleKeyUp = (evt: KeyboardEvent): void => {
    // TODO
  };

  handleCanvasWheel = (evt: WheelEvent): void => {
    // TODO
  };
}

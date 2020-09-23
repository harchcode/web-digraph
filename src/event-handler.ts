import { GEGraph } from "./graph";
import { GEGraphRenderer } from "./graph-renderer";
import { GEView } from "./view";
import { Ticker } from "./ticker";

const MIN_SCALE = 0.2;
const MAX_SCALE = 3.0;
export class GEEventHandler {
  graph: GEGraph;
  view: GEView;
  renderer: GEGraphRenderer;
  ticker: Ticker;

  private nodeOffsetX = 0;
  private nodeOffsetY = 0;

  constructor(graph: GEGraph, view: GEView, renderer: GEGraphRenderer) {
    this.graph = graph;
    this.view = view;
    this.renderer = renderer;
    this.ticker = new Ticker(this.update, this.renderer.draw);
  }

  init(): void {
    window.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.renderer.canvas.addEventListener("wheel", this.handleCanvasWheel);
    this.ticker.start();
  }

  destroy(): void {
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.renderer.canvas.removeEventListener("wheel", this.handleCanvasWheel);
    this.ticker.stop();
  }

  update = (dt: number): void => {
    if (
      this.view.isDragging &&
      !this.view.isCreatingEdge &&
      this.view.selectedNodeId > 0
    ) {
      const node = this.graph.nodes.get(this.view.selectedNodeId);

      const dx = this.view.pointerViewX - this.nodeOffsetX - node.x;
      const dy = this.view.pointerViewY - this.nodeOffsetY - node.y;

      const mag = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / mag;
      const ny = dy / mag;

      const mx = nx * (10000 / this.view.scale) * dt;
      if (mx > 0 && mx < dx) node.x += mx;
      else if (mx < 0 && mx > dx) node.x += mx;
      else node.x += dx;

      const my = ny * (10000 / this.view.scale) * dt;
      if (my > 0 && my < dy) node.y += my;
      else if (my < 0 && my > dy) node.y += my;
      else node.y += dy;
    }
  };

  handleMouseDown = (evt: MouseEvent): void => {
    this.view.setPointerScreenPosition(evt.clientX, evt.clientY);

    this.view.isDragging = true;

    this.view.selectedNodeId = this.view.hoveredNodeId;
    this.view.selectedEdgeId = this.view.hoveredEdgeId;

    if (!this.view.isShiftDown && this.view.selectedNodeId > 0) {
      const node = this.graph.nodes.get(this.view.selectedNodeId);

      this.nodeOffsetX = this.view.pointerViewX - node.x;
      this.nodeOffsetY = this.view.pointerViewY - node.y;
    }

    if (this.view.isShiftDown && this.view.selectedNodeId > 0) {
      const node = this.graph.nodes.get(this.view.selectedNodeId);

      this.view.isCreatingEdge = true;
      this.view.drageLineSourceNodeId = this.view.selectedNodeId;
      this.view.dragLineTargetX = node.x;
      this.view.dragLineTargetY = node.y;
    }
  };

  handleMouseUp = (evt: MouseEvent): void => {
    this.view.setPointerScreenPosition(evt.clientX, evt.clientY);

    if (
      this.view.isCreatingEdge &&
      this.view.hoveredNodeId > 0 &&
      this.view.hoveredNodeId !== this.view.drageLineSourceNodeId
    ) {
      this.graph.addEdge(
        this.view.drageLineSourceNodeId,
        this.view.hoveredNodeId
      );
    } else if (
      this.view.isShiftDown &&
      !this.view.isCreatingEdge &&
      this.view.hoveredNodeId <= 0 &&
      this.view.hoveredEdgeId <= 0
    ) {
      this.graph.addNode(this.view.pointerViewX, this.view.pointerViewY);
    }

    this.view.isDragging = false;
    this.view.isCreatingEdge = false;
  };

  handleMouseMove = (evt: MouseEvent): void => {
    this.view.setPointerScreenPosition(evt.clientX, evt.clientY);

    if (this.view.isDragging && this.view.selectedNodeId <= 0) {
      this.view.translateX += evt.movementX;
      this.view.translateY += evt.movementY;
    }
  };

  handleKeyDown = (evt: KeyboardEvent): void => {
    if (evt.key === "Shift" || evt.keyCode === 16) {
      this.view.isShiftDown = true;
    }

    if (
      evt.key === "Backspace" ||
      evt.keyCode === 8 ||
      evt.key === "Delete" ||
      evt.keyCode === 46
    ) {
      if (this.view.selectedNodeId > 0) {
        this.graph.deleteNode(this.view.selectedNodeId);
        this.view.selectedNodeId = 0;
      }

      if (this.view.selectedEdgeId > 0) {
        this.graph.deleteEdge(this.view.selectedEdgeId);
        this.view.selectedEdgeId = 0;
      }
    }
  };

  handleKeyUp = (evt: KeyboardEvent): void => {
    if (evt.key === "Shift" || evt.keyCode === 16) {
      this.view.isShiftDown = false;
    }
  };

  handleCanvasWheel = (evt: WheelEvent): void => {
    evt.preventDefault();

    // calc the new scale, but limitting the value to the max of 3, and min of 0.05
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, this.view.scale - evt.deltaY * 0.001)
    );

    const deltaScale = newScale - this.view.scale;
    const offsetX = -(this.view.pointerViewX * deltaScale);
    const offsetY = -(this.view.pointerViewY * deltaScale);

    this.view.translateX += offsetX;
    this.view.translateY += offsetY;
    this.view.scale += deltaScale;
  };
}

import { GraphEdge, GraphNode, GraphView } from "./graph-view";

export class DefaultGraphEventHandler<
  Node extends GraphNode,
  Edge extends GraphEdge
> {
  readonly view: GraphView<Node, Edge>;

  private isDragging = false;
  private isShiftDown = false;
  private pos: [number, number] = [0, 0];

  constructor(view: GraphView<Node, Edge>) {
    this.view = view;
  }

  isMovingView = () => {
    return (
      this.isDragging &&
      !this.isShiftDown &&
      !this.view.hoveredNode &&
      !this.view.hoveredEdge &&
      !this.view.isCreatingEdge
    );
  };

  handleMouseDown = (e: MouseEvent) => {
    const { view } = this;

    this.isDragging = true;

    view.requestDraw();
  };

  handleMouseUp = (e: MouseEvent) => {
    const { view } = this;

    this.isDragging = false;

    view.requestDraw();
  };

  handleMouseMove = (e: MouseEvent) => {
    const { view } = this;

    if (!this.isDragging) return;

    if (this.isMovingView()) {
      view.transform[1] += e.movementX;
      view.transform[2] += e.movementY;
    }

    view.requestDraw();
  };

  handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const { view } = this;

    view.setViewPosFromWindowPos(this.pos, e.x, e.y);

    view.zoomTo(view.transform[0] - e.deltaY * 0.001, this.pos[0], this.pos[1]);

    view.requestDraw();
  };

  handleKeyDown = (e: KeyboardEvent) => {
    //
  };

  handleKeyUp = (e: KeyboardEvent) => {
    //
  };

  init = () => {
    const { canvas } = this.view;

    canvas.addEventListener("mousedown", this.handleMouseDown, {
      passive: true
    });
    window.addEventListener("mouseup", this.handleMouseUp, { passive: true });
    window.addEventListener("mousemove", this.handleMouseMove, {
      passive: true
    });
    window.addEventListener("keydown", this.handleKeyDown, { passive: true });
    window.addEventListener("keyup", this.handleKeyUp, { passive: true });
    canvas.addEventListener("wheel", this.handleWheel, {
      passive: false
    });
  };

  destroy = () => {
    const { canvas } = this.view;

    canvas.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    canvas.removeEventListener("wheel", this.handleWheel);
  };
}

export function initDefaultGraphEvents<
  Node extends GraphNode,
  Edge extends GraphEdge
>(view: GraphView<Node, Edge>) {
  const handler = new DefaultGraphEventHandler(view);

  handler.init();

  return handler.destroy;
}

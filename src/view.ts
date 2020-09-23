export class GEView {
  isDragging = false;
  isShiftDown = false;
  isDrawing = false;

  // transform
  translateX = 0;
  translateY = 0;
  scale = 1;

  // pointer position
  pointerScreenX = 0;
  pointerScreenY = 0;
  pointerCanvasX = 0;
  pointerCanvasY = 0;
  pointerViewX = 0;
  pointerViewY = 0;
  boundingClientRect: DOMRect;

  // selection
  selectedNodeId = 0;
  selectedEdgeId = 0;
  hoveredNodeId = 0;
  hoveredEdgeId = 0;

  // drag line when creating edge
  isCreatingEdge = false;
  drageLineSourceNodeId = 0;
  dragLineTargetX = 0;
  dragLineTargetY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.boundingClientRect = canvas.getBoundingClientRect();
  }

  setClientRect(canvas: HTMLCanvasElement): void {
    this.boundingClientRect = canvas.getBoundingClientRect();
  }

  setPointerScreenPosition(screenX: number, screenY: number): void {
    this.pointerScreenX = screenX;
    this.pointerScreenY = screenY;
    this.pointerCanvasX = Math.floor(screenX - this.boundingClientRect.left);
    this.pointerCanvasY = Math.floor(screenY - this.boundingClientRect.top);
    this.pointerViewX = (this.pointerCanvasX - this.translateX) / this.scale;
    this.pointerViewY = (this.pointerCanvasY - this.translateY) / this.scale;
  }

  setTransform(translateX: number, translateY: number, scale: number): void {
    this.translateX = translateX;
    this.translateY = translateY;
    this.scale = scale;
  }

  moveView(dx: number, dy: number): void {
    this.translateX += dx;
    this.translateY += dy;
  }

  zoomView(deltaScale: number): void {
    this.scale += deltaScale;
  }
}

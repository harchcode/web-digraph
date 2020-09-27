import { GEViewOptions, GEViewOptionsParams, GEGridType } from "./types";
import { GEGraph } from "./graph";

export class GEState {
  graph: GEGraph;

  options: GEViewOptions;

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

  constructor() {
    this.graph = new GEGraph();

    this.options = this.getDefaultOptions();
  }

  setOptions(options: GEViewOptionsParams): void {
    Object.keys(options).forEach(k => {
      this.options[k] = options[k];
    });
  }

  getDefaultOptions(): GEViewOptions {
    return {
      nodeRadius: 80,
      edgeArrowLength: 16,
      edgeArrowRadian: Math.PI / 6,
      edgeRectWidth: 48,
      edgeRectHeight: 24,
      backgroundColor: "#F7FAFC",
      showGrid: true,
      gridType: GEGridType.DOTS,
      gridColor: "#CBD5E0",
      gridLineWidth: 8,
      gridDotGap: 64,
      nodeColor: "white",
      nodeSelectedColor: "#3182CE",
      nodeStrokeColor: "#4A5568",
      nodeTextColor: "#1A202C",
      nodeSelectedTextColor: "white",
      nodeTextStyle: "16px sans-serif",
      edgeLineColor: "#4A5568",
      edgeLineHoverColor: "#63B3ED",
      edgeLineSelectedColor: "#3182CE",
      edgeRectFillColor: "white",
      edgeTextColor: "#1A202C",
      edgeSelectedTextColor: "white",
      edgeTextStyle: "16px sans-serif",
      minScale: 0.2,
      maxScale: 3.0,
      cursorGrab: "grab",
      cursorPointer: "pointer",
      cursorCrosshair: "crosshair"
    };
  }

  setBoundingRect(canvas: HTMLCanvasElement): void {
    this.boundingClientRect = canvas.getBoundingClientRect();
  }

  setPointerPosition(screenX: number, screenY: number): void {
    this.pointerScreenX = screenX;
    this.pointerScreenY = screenY;
    this.pointerCanvasX = Math.floor(screenX - this.boundingClientRect.left);
    this.pointerCanvasY = Math.floor(screenY - this.boundingClientRect.top);
    this.pointerViewX = (this.pointerCanvasX - this.translateX) / this.scale;
    this.pointerViewY = (this.pointerCanvasY - this.translateY) / this.scale;
  }

  zoomTo(scale: number, viewX: number, viewY: number): void {
    const { maxScale, minScale } = this.options;

    const newScale = Math.min(maxScale, Math.max(minScale, scale));

    const deltaScale = newScale - this.scale;
    const offsetX = -(viewX * deltaScale);
    const offsetY = -(viewY * deltaScale);

    this.translateX += offsetX;
    this.translateY += offsetY;
    this.scale += deltaScale;
  }
}

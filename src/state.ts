import {
  GEViewOptions,
  GEViewOptionsParams,
  GEGridType,
  GEShapeName,
  GENode,
  GEEdge
} from "./types";

export class GEState {
  nodes: Map<number, GENode>;
  edges: Map<number, GEEdge>;

  options: GEViewOptions;

  isDragging = false;
  isShiftDown = false;
  isDrawing = false;

  moveNodeX = 0;
  moveNodeY = 0;

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
    this.nodes = new Map<number, GENode>();
    this.edges = new Map<number, GEEdge>();

    this.options = this.getDefaultOptions();
  }

  isMovingNode(): boolean {
    return this.isDragging && !this.isCreatingEdge && this.selectedNodeId > 0;
  }

  isMovingView(): boolean {
    return !this.isShiftDown && this.isDragging && this.selectedNodeId <= 0;
  }

  setData(nodes: GENode[], edges: GEEdge[]): void {
    this.nodes.clear();
    this.edges.clear();

    nodes.forEach(node => {
      this.nodes.set(node.id, node);
    });

    edges.forEach(edge => {
      this.edges.set(edge.id, edge);
    });
  }

  setOptions(options: GEViewOptionsParams): void {
    Object.keys(options).forEach(k => {
      this.options[k] = options[k];
    });
  }

  getDefaultOptions(): GEViewOptions {
    return {
      edgeArrowLength: 16,
      edgeArrowRadian: Math.PI / 6,
      backgroundColor: "#F7FAFC",
      showGrid: true,
      gridType: GEGridType.DOTS,
      gridColor: "#CBD5E0",
      gridLineWidth: 8,
      gridGap: 64,
      defaultSubShapeColor: "green",
      nodeLineWidth: 2,
      nodeColor: "white",
      nodeSelectedColor: "#4299E1",
      nodeStrokeColor: "#1A202C",
      nodeTextColor: "#1A202C",
      nodeSelectedTextColor: "white",
      nodeTextStyle: "16px sans-serif",
      edgeLineWidth: 3,
      edgeLineColor: "#2B6CB0",
      edgeLineSelectedColor: "#4299E1",
      edgeShapeFillColor: "white",
      edgeTextColor: "#1A202C",
      edgeSelectedTextColor: "white",
      edgeTextStyle: "16px sans-serif",
      minScale: 0.2,
      maxScale: 1.8,
      cursorGrab: "grab",
      cursorPointer: "pointer",
      cursorCrosshair: "crosshair",
      nodeTypes: {
        empty: [
          {
            shape: GEShapeName.CIRCLE,
            r: 80
          }
        ]
      },
      edgeTypes: {
        empty: [
          {
            shape: GEShapeName.RECTANGLE,
            width: 30,
            height: 20
          }
        ]
      }
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

import {
  GraphEdge,
  GraphNode,
  GraphShape,
  GraphOptions,
  defaultGraphOptions
} from "./types";

export class GraphState<Node extends GraphNode, Edge extends GraphEdge> {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  readonly container: HTMLElement;
  // readonly bgCtx: CanvasRenderingContext2D;
  // readonly edgeCtx: CanvasRenderingContext2D;
  // readonly nodeCtx: CanvasRenderingContext2D;
  // readonly moveCtx: CanvasRenderingContext2D;

  nodes: Node[] = [];
  edges: Edge[] = [];
  idMap: Record<number, Node | Edge> = {};
  shapeMap: Record<number, GraphShape> = {};
  pathMap: Record<number, Path2D> = {};
  linePathMap: Record<number, Path2D> = {};
  arrowPathMap: Record<number, Path2D> = {};
  edgeContentPosMap: Record<number, [number, number]> = {};
  sourceNodeIdToEdgesMap: Record<number, Edge[]> = {};
  targetNodeIdToEdgesMap: Record<number, Edge[]> = {};

  options = defaultGraphOptions;

  translateX = 0;
  translateY = 0;
  scale = 1;

  viewX = 0;
  viewY = 0;
  viewW = 0;
  viewH = 0;
  boundingRect: DOMRect;

  isDrawing = false;
  isMovingView = false;
  hoveredId = 0;
  selectedIdMap: Record<number, boolean> = {};
  moveNodeIds: number[] = [];
  moveX = 0;
  moveY = 0;
  dragLineSourceNode: Node | undefined = undefined;
  dragLineX = 0;
  dragLineY = 0;

  constructor(container: HTMLElement, options: Partial<GraphOptions> = {}) {
    this.options = {
      ...this.options,
      ...options
    };

    this.boundingRect = container.getBoundingClientRect();
    this.container = container;

    this.canvas = document.createElement("canvas");
    this.canvas.textContent = "Canvas is not supported in your browser.";
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;

    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw "Canvas is not supported in your browser.";
    }

    this.ctx = ctx;
  }

  createCanvas(container: HTMLElement): CanvasRenderingContext2D {
    const canvas = document.createElement("canvas");

    canvas.textContent = "Canvas is not supported in your browser.";
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const ctx = this.canvas.getContext("2d", { alpha: false });

    if (!ctx) {
      throw "Canvas is not supported in your browser.";
    }

    container.append(canvas);

    return ctx;
  }

  setView() {
    const { canvas, translateX, translateY, scale } = this;

    this.viewX = -translateX / scale;
    this.viewY = -translateY / scale;
    this.viewW = canvas.width / scale;
    this.viewH = canvas.height / scale;
  }
}

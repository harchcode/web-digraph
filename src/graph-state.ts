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

  nodes: Node[] = [];
  edges: Edge[] = [];
  idMap: Record<number, Node | Edge> = {};
  shapeMap: Record<number, GraphShape> = {};
  pathMap: Record<number, Path2D> = {};
  linePathMap: Record<number, Path2D> = {};
  arrowPathMap: Record<number, Path2D> = {};
  edgeContentPosMap: Record<number, [number, number]> = {};

  translateX = 0;
  translateY = 0;
  scale = 1;

  viewX = 0;
  viewY = 0;
  viewW = 0;
  viewH = 0;
  boundingRect: DOMRect;

  isDrawing = false;
  options = defaultGraphOptions;
  hoveredId = 0;

  constructor(container: HTMLElement, options: Partial<GraphOptions> = {}) {
    this.options = {
      ...this.options,
      ...options
    };

    this.canvas = document.createElement("canvas");
    this.canvas.textContent = "Canvas is not supported in your browser.";
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.boundingRect = this.canvas.getBoundingClientRect();

    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw "Canvas is not supported in your browser.";
    }

    this.ctx = ctx;
  }
}

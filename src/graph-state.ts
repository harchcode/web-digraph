import { createQuad, Quad } from "./quad";
import {
  GraphEdge,
  GraphNode,
  GraphOptions,
  defaultGraphOptions,
  NodeDrawData,
  EdgeDrawData
} from "./types";

export class GraphState<Node extends GraphNode, Edge extends GraphEdge> {
  // readonly canvas: HTMLCanvasElement;
  // readonly ctx: CanvasRenderingContext2D;

  readonly container: HTMLElement;
  readonly bgCtx: CanvasRenderingContext2D;
  readonly edgeCtx: CanvasRenderingContext2D;
  readonly dragCtx: CanvasRenderingContext2D;
  readonly nodeCtx: CanvasRenderingContext2D;
  readonly moveCtx: CanvasRenderingContext2D;

  nodes: Record<number, Node> = {};
  edges: Record<number, Edge> = {};
  nodeData: Record<number, NodeDrawData> = {};
  edgeData: Record<number, EdgeDrawData> = {};
  quad: Quad<number>;

  options = defaultGraphOptions;

  translateX = 0;
  translateY = 0;
  scale = 1;

  viewX = 0;
  viewY = 0;
  viewW = 0;
  viewH = 0;
  boundingRect: DOMRect;

  isMovingView = false;
  hoveredId = 0;
  selectedIds = new Set<number>();
  moveNodeIds: number[] = [];
  moveX = 0;
  moveY = 0;
  dragLineSourceNode: Node | undefined = undefined;
  dragLineX = 0;
  dragLineY = 0;
  drawIds = new Set<number>();

  constructor(container: HTMLElement, options: Partial<GraphOptions> = {}) {
    this.options = {
      ...this.options,
      ...options
    };

    this.boundingRect = container.getBoundingClientRect();
    this.container = container;

    const bgCtx = this.initCtx(false);
    const edgeCtx = this.initCtx();
    const dragCtx = this.initCtx();
    const nodeCtx = this.initCtx();
    const moveCtx = this.initCtx();

    if (!bgCtx || !edgeCtx || !nodeCtx || !moveCtx || !dragCtx) {
      throw "Canvas is not supported in your browser.";
    }

    this.bgCtx = bgCtx;
    this.edgeCtx = edgeCtx;
    this.dragCtx = dragCtx;
    this.nodeCtx = nodeCtx;
    this.moveCtx = moveCtx;

    this.quad = createQuad(
      -this.options.width * 0.5,
      -this.options.height * 0.5,
      this.options.width,
      this.options.height
    );
  }

  initCtx(alpha = true) {
    const { container } = this;

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.textContent = "Canvas is not supported in your browser.";
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext("2d", { alpha });

    return ctx;
  }

  createCanvas(container: HTMLElement): CanvasRenderingContext2D {
    const canvas = document.createElement("canvas");

    canvas.textContent = "Canvas is not supported in your browser.";
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext("2d", { alpha: false });

    if (!ctx) {
      throw "Canvas is not supported in your browser.";
    }

    container.append(canvas);

    return ctx;
  }

  setView() {
    const { container, translateX, translateY, scale } = this;

    this.viewX = -translateX / scale;
    this.viewY = -translateY / scale;
    this.viewW = container.clientWidth / scale;
    this.viewH = container.clientHeight / scale;
  }
}

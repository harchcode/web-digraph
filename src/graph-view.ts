import { GEState } from "./state";
import { GEGraphRenderer } from "./graph-renderer";
import { GEEventHandler } from "./event-handler";
import { GENode, GEEdge, GEViewOptionsParams } from "./types";

export class GEView {
  readonly canvas: HTMLCanvasElement;

  private _state: GEState;
  private _renderer: GEGraphRenderer;
  private _eventHandler: GEEventHandler;

  constructor(options?: GEViewOptionsParams) {
    this.canvas = document.createElement("canvas");
    this._state = new GEState();
    this._renderer = new GEGraphRenderer(this._state, this.canvas);
    this._eventHandler = new GEEventHandler(
      this._state,
      this.canvas,
      this._renderer
    );

    if (options) {
      this._state.setOptions(options);
    }
  }

  get translateX(): number {
    return this._state.translateX;
  }
  get translateY(): number {
    return this._state.translateY;
  }
  get scale(): number {
    return this._state.scale;
  }

  zoomTo(value: number): void {
    const centerX = (this.canvas.width * 0.5 - this.translateX) / this.scale;
    const centerY = (this.canvas.height * 0.5 - this.translateY) / this.scale;

    this._state.zoomTo(value, centerX, centerY);

    this.requestDraw();
  }

  init(container: HTMLElement): void {
    container.appendChild(this.canvas);

    this.canvas.textContent = "Canvas is not supported in your browser.";
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;

    this._state.setBoundingRect(this.canvas);
    this._eventHandler.init();
    this.requestDraw();
  }

  destroy(): void {
    this._eventHandler.destroy();
  }

  requestDraw(): void {
    this._renderer.requestDraw();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    this._state.setBoundingRect(this.canvas);

    this.requestDraw();
  }

  clearData(): void {
    this._state.graph.reset();
    this.requestDraw();
  }

  setData(nodes: GENode[], edges: GEEdge[]): void {
    this._state.graph.setData(nodes, edges);
    this.requestDraw();
  }

  getNodes(): Map<number, GENode> {
    return this._state.graph.nodes;
  }

  getEdges(): Map<number, GEEdge> {
    return this._state.graph.edges;
  }

  setOptions(options: GEViewOptionsParams): void {
    this._state.setOptions(options);
    this.requestDraw();
  }

  addNode(x: number, y: number, r: number, text = ""): GENode {
    const newNode = this._state.graph.addNode(x, y, r, text);

    this.requestDraw();

    return newNode;
  }

  addEdge(sourceNodeId: number, targetNodeId: number, text = ""): GEEdge {
    const newEdge = this._state.graph.addEdge(sourceNodeId, targetNodeId, text);

    this.requestDraw();

    return newEdge;
  }

  deleteNode(nodeId: number): void {
    this._state.graph.deleteNode(nodeId);
    this.requestDraw();
  }

  deleteEdge(edgeId: number): void {
    this._state.graph.deleteEdge(edgeId);
    this.requestDraw();
  }
}

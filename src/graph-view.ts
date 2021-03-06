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

  getTranslateX(): number {
    return this._state.translateX;
  }

  getTanslateY(): number {
    return this._state.translateY;
  }
  getScale(): number {
    return this._state.scale;
  }

  zoomTo(value: number): void {
    const { width, height } = this.canvas;
    const { translateX, translateY, scale } = this._state;

    const centerX = (width * 0.5 - translateX) / scale;
    const centerY = (height * 0.5 - translateY) / scale;

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

  setData(nodes: GENode[], edges: GEEdge[]): void {
    this._state.setData(nodes, edges);
    this.requestDraw();
  }

  setOptions(options: GEViewOptionsParams): void {
    this._state.setOptions(options);
    this.requestDraw();
  }

  setSelection(node: GENode | undefined, edge: GEEdge | undefined): void {
    if (node && edge) return;

    this._state.selectedNode = node;
    this._state.selectedEdge = edge;

    this.requestDraw();
  }

  setSelectedNode(node: GENode | undefined): void {
    this._state.selectedNode = node;
    this._state.selectedEdge = undefined;

    this.requestDraw();
  }

  getSelectedNode(): GENode | undefined {
    return this._state.selectedNode;
  }

  setSelectedEdge(edge: GEEdge | undefined): void {
    this._state.selectedNode = undefined;
    this._state.selectedEdge = edge;

    this.requestDraw();
  }

  getSelectedEdge(): GEEdge | undefined {
    return this._state.selectedEdge;
  }
}

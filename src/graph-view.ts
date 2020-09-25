import { GEState } from "./state";
import { GEGraphRenderer } from "./graph-renderer";
import { GEEventHandler } from "./event-handler";
import { GENode, GEEdge, GEViewOptionsParams } from "./types";

export class GEView {
  readonly canvas: HTMLCanvasElement;

  private _state: GEState;
  private _renderer: GEGraphRenderer;
  private _eventHandler: GEEventHandler;

  constructor() {
    this.canvas = document.createElement("canvas");
    this._state = new GEState();
    this._renderer = new GEGraphRenderer(this._state, this.canvas);
    this._eventHandler = new GEEventHandler(
      this._state,
      this.canvas,
      this._renderer
    );
  }

  init(container: HTMLElement): void {
    container.appendChild(this.canvas);

    this.canvas.textContent = "Canvas is not supported in your browser.";
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;

    this._state.setBoundingRect(this.canvas);
    this._state.graph.randomize(10000);
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

  setOptions(options: GEViewOptionsParams): void {
    this._state.setOptions(options);
    this.requestDraw();
  }
}

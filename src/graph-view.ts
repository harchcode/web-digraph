import { GEState } from "./state";
import { GEGraphRenderer } from "./graph-renderer";
import { GEEventHandler } from "./event-handler";
import { GENode, GEEdge, GEViewOptionsParams } from "./types";

export class GEView {
  readonly canvas: HTMLCanvasElement;
  readonly bgCanvas: HTMLCanvasElement;
  readonly container: HTMLDivElement;

  private _state: GEState;
  private _renderer: GEGraphRenderer;
  private _eventHandler: GEEventHandler;

  constructor() {
    this.container = document.createElement("div");
    this.canvas = document.createElement("canvas");
    this.bgCanvas = document.createElement("canvas");

    this._state = new GEState();
    this._renderer = new GEGraphRenderer(
      this._state,
      this.canvas,
      this.bgCanvas
    );
    this._eventHandler = new GEEventHandler(
      this._state,
      this.canvas,
      this._renderer
    );
  }

  init(parent: HTMLElement): void {
    this.container.appendChild(this.bgCanvas);
    this.container.appendChild(this.canvas);
    parent.appendChild(this.container);

    this.container.style.position = "relative";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.bottom = "0";
    this.canvas.style.left = "0";
    this.canvas.style.right = "0";

    this.canvas.textContent = "Canvas is not supported in your browser.";

    this.bgCanvas.width = parent.clientWidth;
    this.bgCanvas.height = parent.clientHeight;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;

    this._state.setBoundingRect(this.canvas);
    this._state.graph.randomize(10000);
    this._eventHandler.init();
    this.requestDraw(true);
  }

  destroy(): void {
    this._eventHandler.destroy();
  }

  requestDraw(bgNeedRedraw = false): void {
    this._renderer.requestDraw(bgNeedRedraw);
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.bgCanvas.width = width;
    this.bgCanvas.height = height;

    this._state.setBoundingRect(this.canvas);

    this.requestDraw(true);
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

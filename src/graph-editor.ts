import { GEView } from "./view";
import { GEGraphRenderer } from "./graph-renderer";
import { GEEventHandler } from "./event-handler";
import { GENode, GEEdge } from "./types";

export class GraphEditor {
  private _view: GEView;
  private _renderer: GEGraphRenderer;
  private _eventHandler: GEEventHandler;

  constructor() {
    this._view = new GEView();
    this._renderer = new GEGraphRenderer(this._view);
    this._eventHandler = new GEEventHandler(this._view, this._renderer);
  }

  init(container: HTMLElement): void {
    this._view.init(container);
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
    const { _view } = this;

    _view.canvas.width = width;
    _view.canvas.height = height;

    _view.boundingClientRect = _view.canvas.getBoundingClientRect();

    this.requestDraw();
  }

  clearData(): void {
    this._view.graph.reset();
    this.requestDraw();
  }

  setData(nodes: GENode[], edges: GEEdge[]): void {
    this._view.graph.setData(nodes, edges);
    this.requestDraw();
  }
}

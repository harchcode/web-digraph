import { GEGraph } from "./graph";
import { GEGraphRenderer } from "./graph-renderer";
import { GEEventHandler } from "./event-handler";

export class GraphView extends HTMLElement {
  canvas: HTMLCanvasElement;
  graph: GEGraph;
  renderer: GEGraphRenderer;
  eventHandler: GEEventHandler;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });

    this.canvas = document.createElement("canvas");
    this.graph = new GEGraph();

    shadow.appendChild(this.canvas);

    this.renderer = new GEGraphRenderer(this.graph, this.canvas);
    this.eventHandler = new GEEventHandler(this.graph, this.renderer);
  }

  connectedCallback(): void {
    this.graph.randomize();

    const parent = this.shadowRoot.host.parentElement;

    this.canvas.textContent = "Canvas is not supported in your browser.";
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;

    this.eventHandler.init();

    this.renderer.draw();
  }

  disconnectedCallback(): void {
    this.eventHandler.destroy();
  }

  resize(width: number, height: number): void {
    this.renderer.resizeCanvas(width, height);
  }
}

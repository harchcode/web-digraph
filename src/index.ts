import { GEGraph } from "./graph";
import { GEGraphRenderer } from "./graph-renderer";

class GraphView extends HTMLElement {
  canvas: HTMLCanvasElement;
  graph: GEGraph;
  renderer: GEGraphRenderer;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });

    this.canvas = document.createElement("canvas");
    this.graph = new GEGraph();
    this.renderer = new GEGraphRenderer(this.graph, this.canvas);

    shadow.appendChild(this.canvas);
  }

  connectedCallback() {
    this.graph.randomize();

    const parent = this.shadowRoot.host.parentElement;

    this.canvas.textContent = "Canvas is not supported in your browser.";
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;

    this.renderer.draw();
  }
}

customElements.define("graph-view", GraphView);

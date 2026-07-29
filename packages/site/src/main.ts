import { createGraphRenderer, createGraphInteractions } from "web-digraph";
import { getRandomNodeShape, getRandomEdgeShape } from "./shapes";
import "./zoomSlider";
import type { ZoomSlider } from "./zoomSlider";
import { generateGrid } from "./utils";

const canvas = document.getElementById("graph-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas not found");
}

// Setup Renderer
const renderer = createGraphRenderer();

window.addEventListener("resize", () => {
  renderer.resize();
  renderer.flush();
});

// Initialize size and mount
renderer.mount(canvas);
const zoomSlider = document.getElementById("zoom-slider") as ZoomSlider;

zoomSlider.addEventListener("zoom-change", (e: Event) => {
  const customEvent = e as CustomEvent;
  renderer.zoomTo(customEvent.detail.zoom);
  renderer.flush();
});

// Setup Interactions
const interactions = createGraphInteractions(canvas, renderer, {
  onAddNode: (x, y) => {
    renderer.addNode(x, y, getRandomNodeShape());
  },
  onAddEdge: (source, target) => {
    renderer.addEdge(source, target, getRandomEdgeShape());
  },
  onDeleteNodes: nodeIds => {
    for (const id of nodeIds) renderer.removeItem(id);
  },
  onDeleteEdges: edgeIds => {
    for (const id of edgeIds) renderer.removeItem(id);
  },
  onZoom: zoom => {
    zoomSlider.setZoom(zoom);
  }
});
interactions.setMode("move");

// Bind generator button
document
  .getElementById("btn-generate")
  ?.addEventListener("click", () => generateGrid(renderer));
// Bind fit button
document.getElementById("btn-fit")?.addEventListener("click", () => {
  renderer.centerView();
  zoomSlider.setZoom(renderer.getZoom());
  renderer.flush();
});

// Generate initially
generateGrid(renderer);

import { createGraphRenderer, createGraphInteractions } from "web-digraph";
import { getRandomNodeShape, getRandomEdgeShape } from "./shapes";
import "./zoomSlider";
import type { ZoomSlider } from "./zoomSlider";
import { generateGrid } from "./utils";
import { MIN_ZOOM, MAX_ZOOM } from "./constants";

const canvas = document.getElementById("graph-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas not found");
}

// Setup Renderer
const renderer = createGraphRenderer({ minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM });

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
  bindDefaultKeyboardHandlers: false,
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

// Bind UI Toggles
const modeBtns = document.querySelectorAll("#mode-toggle .toggle-btn");
modeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    modeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    interactions.setMode(btn.getAttribute("data-mode") as "move" | "create");
  });
});

const selectBtns = document.querySelectorAll("#select-toggle .toggle-btn");
selectBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    selectBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    interactions.setMultiSelect(btn.getAttribute("data-select") === "multi");
  });
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
// Bind delete button
document.getElementById("btn-delete")?.addEventListener("click", () => {
  const selected = renderer.getSelectedItems();
  for (const id of selected) {
    renderer.removeItem(id);
  }
  renderer.flush();
});

// Generate initially
generateGrid(renderer);

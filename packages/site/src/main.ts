import { createGraphRenderer, createGraphInteractions } from "web-digraph";
import { getRandomNodeShape, getRandomEdgeShape } from "./shapes";
import "./zoomSlider";
import type { ZoomSlider } from "./zoomSlider";

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

function generateGrid() {
  const input = document.getElementById("node-count") as HTMLInputElement;
  const count = parseInt(input.value, 10) || 100;

  renderer.clear();

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const spacing = 180;

  const startX = -((cols - 1) * spacing) / 2;
  const startY = -((rows - 1) * spacing) / 2;

  const nodeIds: number[] = [];

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * spacing;
    const y = startY + row * spacing;

    const id = renderer.addNode(x, y, getRandomNodeShape());
    nodeIds.push(id);

    // Create an edge from the previous node to this node
    if (i > 0) {
      renderer.addEdge(nodeIds[i - 1], id, getRandomEdgeShape());
    }
  }

  renderer.flush();
}

// Bind generator button
document
  .getElementById("btn-generate")
  ?.addEventListener("click", generateGrid);

// Generate initially
generateGrid();

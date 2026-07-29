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

renderer.mount(canvas);

const zoomSlider = document.getElementById("zoom-slider") as ZoomSlider;
zoomSlider.addEventListener("zoom-change", (e: Event) => {
  const customEvent = e as CustomEvent;
  renderer.zoomTo(customEvent.detail.zoom);
  renderer.flush();
});

function updateStats() {
  document.getElementById("node-count-display")!.textContent =
    renderer.nodeCount.toString();
  document.getElementById("edge-count-display")!.textContent =
    renderer.edgeCount.toString();
}

// Setup Interactions
const interactions = createGraphInteractions(canvas, renderer, {
  bindDefaultKeyboardHandlers: false,
  onAddNode: (x, y) => {
    renderer.addNode(x, y, getRandomNodeShape());
    updateStats();
  },
  onAddEdge: (source, target) => {
    renderer.addEdge(source, target, getRandomEdgeShape());
    updateStats();
  },
  onDeleteNodes: nodeIds => {
    for (const id of nodeIds) renderer.removeItem(id);
    updateStats();
  },
  onDeleteEdges: edgeIds => {
    for (const id of edgeIds) renderer.removeItem(id);
    updateStats();
  },
  onZoom: zoom => {
    zoomSlider.setZoom(zoom);
  }
});

// Bind UI Toggles
let currentMode: "move" | "create" = "move";
let currentMultiSelect = false;

const modeBtns = document.querySelectorAll("#mode-toggle .toggle-btn");
const selectBtns = document.querySelectorAll("#select-toggle .toggle-btn");

function updateUIAndInteractions(mode: "move" | "create", multi: boolean) {
  interactions.setMode(mode);
  interactions.setMultiSelect(multi);

  modeBtns.forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-mode") === mode);
  });

  selectBtns.forEach(b => {
    b.classList.toggle(
      "active",
      (b.getAttribute("data-select") === "multi") === multi
    );
  });
}

modeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    currentMode = btn.getAttribute("data-mode") as "move" | "create";
    updateUIAndInteractions(currentMode, currentMultiSelect);
  });
});

selectBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    currentMultiSelect = btn.getAttribute("data-select") === "multi";
    updateUIAndInteractions(currentMode, currentMultiSelect);
  });
});
updateUIAndInteractions(currentMode, currentMultiSelect);

// Global Keyboard Handlers
let isShiftDown = false;
window.addEventListener("keydown", e => {
  if (e.key === "Backspace" || e.key === "Delete") {
    const selected = renderer.getSelectedItems();
    for (const id of selected) {
      renderer.removeItem(id);
    }
    renderer.flush();
    updateStats();
  }

  if (e.key === "Shift" && !isShiftDown) {
    isShiftDown = true;
    updateUIAndInteractions(
      currentMode === "move" ? "create" : "move",
      !currentMultiSelect
    );
  }
});

window.addEventListener("keyup", e => {
  if (e.key === "Shift") {
    isShiftDown = false;
    updateUIAndInteractions(currentMode, currentMultiSelect);
  }
});

// Bind generator button
document.getElementById("btn-generate")?.addEventListener("click", () => {
  generateGrid(renderer, updateStats);
});

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
  updateStats();
});

// Help Dialog
const helpDialog = document.getElementById("help-dialog") as HTMLDialogElement;
document.getElementById("btn-help")?.addEventListener("click", () => {
  helpDialog.showModal();
});
document.getElementById("btn-close-help")?.addEventListener("click", () => {
  helpDialog.close();
});
helpDialog.addEventListener("click", e => {
  const dialogDimensions = helpDialog.getBoundingClientRect();
  if (
    e.clientX < dialogDimensions.left ||
    e.clientX > dialogDimensions.right ||
    e.clientY < dialogDimensions.top ||
    e.clientY > dialogDimensions.bottom
  ) {
    helpDialog.close();
  }
});

// Generate initially
generateGrid(renderer, updateStats);

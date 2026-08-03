import { createGraphRenderer, createGraphInteractions } from "web-digraph";
import {
  registerAllShapes,
  getRandomNodeShapeId,
  getRandomEdgeShapeId,
  addNodeLabel,
  addEdgeLabel,
  handleNodeDeleted,
  handleEdgeDeleted
} from "./shapes";
import "./zoomSlider";
import type { ZoomSlider } from "./zoomSlider";
import { generateGrid, generateGridImmediate } from "./utils";
import { MIN_ZOOM, MAX_ZOOM } from "./constants";

const canvas = document.getElementById("graph-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas not found");
}

// Setup Renderer
const renderer = createGraphRenderer({
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  maxNodes: 10000000,
  maxEdges: 15000000
});
registerAllShapes(renderer);

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
  bindDefaultKeyboardHandlers: true,
  onAddNode: (x, y) => {
    const id = renderer.addNode(x, y, getRandomNodeShapeId());
    addNodeLabel(id);
    updateStats();
  },
  onAddEdge: (source, target) => {
    const id = renderer.addEdge(source, target, getRandomEdgeShapeId());
    addEdgeLabel(id);
    updateStats();
  },
  onDeleteSelectedItems: (nodeIds, edgeIds) => {
    const stats = renderer.removeItems(nodeIds, edgeIds);

    for (let i = 0; i < stats.nodeSwapDeletedLog.length; i++) {
      handleNodeDeleted(stats.nodeSwapDeletedLog[i], stats.nodeSwapMovedLog[i]);
    }
    for (let i = 0; i < stats.edgeSwapDeletedLog.length; i++) {
      handleEdgeDeleted(stats.edgeSwapDeletedLog[i], stats.edgeSwapMovedLog[i]);
    }

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
  // generateGrid(renderer, updateStats);
  generateGridImmediate(renderer);
  updateStats();
});

// Bind fit button
document.getElementById("btn-fit")?.addEventListener("click", () => {
  renderer.centerView();
  zoomSlider.setZoom(renderer.zoom);
  renderer.flush();
});

// Bind delete button
document.getElementById("btn-delete")?.addEventListener("click", () => {
  interactions.triggerDeleteSelectedItems();
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

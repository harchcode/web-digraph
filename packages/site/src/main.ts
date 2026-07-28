import {
  createGraphRenderer,
  createGraphInteractions,
  createShape
} from "web-digraph";

const canvas = document.getElementById("graph-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas not found");
}

const squareShape = createShape({
  w: 50,
  h: 50,
  path: new Path2D("M -25 -25 L 25 -25 L 25 25 L -25 25 Z"),
  draw: (ctx, path, id) => {
    ctx.fill(path);
    ctx.stroke(path);

    ctx.fillStyle = "#475569";
    ctx.fillText(id.toString(), 0, 0);
  }
});

const smallCirclePath = new Path2D();
smallCirclePath.arc(0, 0, 12, 0, Math.PI * 2);
const smallCircleShape = createShape({
  w: 24,
  h: 24,
  path: smallCirclePath,
  draw: (ctx, path, id) => {
    ctx.fill(path);
    ctx.stroke(path);

    ctx.fillStyle = "#475569";
    ctx.fillText(id.toString(), 0, 0);
  }
});

// Setup Renderer
const renderer = createGraphRenderer();

window.addEventListener("resize", () => {
  renderer.resize();
  renderer.flush();
});

// Initialize size and mount
renderer.mount(canvas);
const zoomSlider = document.getElementById("zoom-slider") as HTMLInputElement;

function updateZoomSliderCSS() {
  const min = parseFloat(zoomSlider.min) || 10;
  const max = parseFloat(zoomSlider.max) || 500;
  const val = parseFloat(zoomSlider.value);
  const percentage = ((val - min) / (max - min)) * 100;
  zoomSlider.style.setProperty("--val", `${percentage}%`);
}

// Initialize slider CSS on load
updateZoomSliderCSS();

zoomSlider.addEventListener("input", e => {
  const val = parseInt((e.target as HTMLInputElement).value, 10);
  // Convert percentage to decimal (e.g. 100 -> 1.0)
  renderer.zoomTo(val / 100);
  renderer.flush();
  updateZoomSliderCSS();
});

// Setup Interactions
const interactions = createGraphInteractions(canvas, renderer, {
  onAddNode: (x, y) => {
    renderer.addNode(x, y, squareShape);
  },
  onAddEdge: (source, target) => {
    renderer.addEdge(source, target, smallCircleShape);
  },
  onDeleteNodes: nodeIds => {
    for (const id of nodeIds) renderer.removeItem(id);
  },
  onDeleteEdges: edgeIds => {
    for (const id of edgeIds) renderer.removeItem(id);
  },
  onZoom: zoom => {
    zoomSlider.value = Math.round(zoom * 100).toString();
    updateZoomSliderCSS();
  }
});
interactions.setMode("move");

const n1 = renderer.addNode(-100, 0, squareShape);
const n2 = renderer.addNode(100, 2, squareShape);
const n3 = renderer.addNode(0, 150, squareShape);

renderer.addEdge(n1, n2, smallCircleShape);
renderer.addEdge(n2, n3, smallCircleShape);
renderer.addEdge(n1, n3, smallCircleShape);

// Initial render
renderer.flush();

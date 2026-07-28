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

// Setup Renderer
const renderer = createGraphRenderer();

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", () => {
  resizeCanvas();
  renderer.resize();
  renderer.flush();
});

// Initialize size and mount
resizeCanvas();
renderer.mount(canvas);

// Setup Interactions
const interactions = createGraphInteractions(canvas, renderer, {
  onAddNode: (x, y) => {
    renderer.addNode(x, y, squareShape);
  },
  onAddEdge: (source, target) => {
    renderer.addEdge(source, target, squareShape);
  },
  onDeleteNodes: nodeIds => {
    for (const id of nodeIds) renderer.removeItem(id);
  },
  onDeleteEdges: edgeIds => {
    for (const id of edgeIds) renderer.removeItem(id);
  },
  onZoom: zoom => {
    // TODO: Update zoom slider in UI here
    console.log("Zoom changed to:", zoom);
  }
});
interactions.setMode("move");

const n1 = renderer.addNode(-100, 0, squareShape);
const n2 = renderer.addNode(100, 2, squareShape);
const n3 = renderer.addNode(0, 150, squareShape);

renderer.addEdge(n1, n2, squareShape);
renderer.addEdge(n2, n3, squareShape);
renderer.addEdge(n1, n3, squareShape);

// Initial render
renderer.flush();

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

    ctx.fillStyle = "#333333";
    ctx.fillText(id.toString(), 0, 0);
  }
});

// Setup Renderer
const renderer = createGraphRenderer({
  bgColor: "#fafafa",
  drawGrid: true
});

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
const interactions = createGraphInteractions(canvas, renderer);
interactions.setMode("move");

const n1 = renderer.addNode(-100, 0, squareShape);
const n2 = renderer.addNode(100, 2, squareShape);
const n3 = renderer.addNode(0, 150, squareShape);

renderer.addEdge(n1, n2);
renderer.addEdge(n2, n3);
renderer.addEdge(n1, n3);

// Initial render
renderer.flush();

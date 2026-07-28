import { createGraphRenderer, createGraphInteractions } from "web-digraph";
import type { GraphShape } from "web-digraph";

const canvas = document.getElementById("graph-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas not found");
}

// Basic rectangle shape for nodes
function createRectShape(w: number, h: number): GraphShape {
  const path = new Path2D();
  path.rect(-w / 2, -h / 2, w, h);
  return {
    w,
    h,
    path,
    draw: (ctx, path, id) => {
      ctx.fill(path);
      ctx.stroke(path);
      ctx.fillStyle = "#333333";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(id.toString(), 0, 0);
    },
  };
}

// Setup Renderer
const renderer = createGraphRenderer({
  bgColor: "#fafafa",
  drawGrid: true,
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

// Create some dummy nodes to test the library rendering
const rectShape = createRectShape(40, 40);

const n1 = renderer.addNode(window.innerWidth / 2 - 100, window.innerHeight / 2, rectShape);
const n2 = renderer.addNode(window.innerWidth / 2 + 100, window.innerHeight / 2, rectShape);
const n3 = renderer.addNode(window.innerWidth / 2, window.innerHeight / 2 + 150, rectShape);

renderer.addEdge(n1, n2);
renderer.addEdge(n2, n3);
renderer.addEdge(n1, n3);

// Initial render
renderer.flush();

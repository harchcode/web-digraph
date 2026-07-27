import { createGraphRenderer, defaultShape, createShape } from "web-digraph";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div style="font-family: sans-serif; padding: 20px;">
    <h2>Web Digraph - Step 1</h2>
    <p>We should see two default rectangular nodes below:</p>
    <canvas id="graph-canvas" width="800" height="600" style="border: 1px solid #ddd; background-color: #fafafa; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);"></canvas>
  </div>
`;

const canvas = document.getElementById("graph-canvas") as HTMLCanvasElement;

// 1. Create renderer
const renderer = createGraphRenderer({ drawGrid: true });

// 2. Mount to canvas
renderer.mount(canvas);

// 3. Define a shape
const circleShape = createShape({
  w: 24,
  h: 24,
  createPath: (x, y, w) => {
    const path = new Path2D();
    path.arc(x, y, w / 2, 0, Math.PI * 2);
    return path;
  },
  draw: (ctx, x, y, _w, _h, path, id) => {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fill(path);
    ctx.stroke(path);

    ctx.fillStyle = "#333333";
    ctx.font = "600 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${id}`, x, y);
    ctx.restore();
  }
});

// 4. Add nodes to the renderer's state
const n1 = renderer.addNode(200, 200, defaultShape);
const n2 = renderer.addNode(400, 300, defaultShape);

// Add an edge
renderer.addEdge(n1, n2, circleShape);

// 5. Draw!
renderer.flush();

// 6. Hook up Panning and Zooming
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const zoomSensitivity = 0.002;
  const dv = -e.deltaY * zoomSensitivity;
  renderer.zoomBy(dv, e.offsetX, e.offsetY);
  renderer.flush();
});

let isPanning = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener("pointerdown", e => {
  // For now, dragging anywhere pans the camera
  isPanning = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = "grabbing";
});

canvas.addEventListener("pointermove", e => {
  if (!isPanning) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  renderer.panBy(dx, dy);
  renderer.flush();
});

const stopPanning = (e: PointerEvent) => {
  isPanning = false;
  canvas.releasePointerCapture(e.pointerId);
  canvas.style.cursor = "default";
};
canvas.addEventListener("pointerup", stopPanning);
canvas.addEventListener("pointercancel", stopPanning);

// 7. Testing 10k nodes
const btn = document.createElement("button");
btn.innerText = "Spawn 10k Nodes";
btn.style.position = "absolute";
btn.style.top = "10px";
btn.style.left = "10px";
btn.style.padding = "10px 20px";
btn.style.fontSize = "16px";
btn.style.zIndex = "100";
btn.style.cursor = "pointer";
document.body.appendChild(btn);

btn.addEventListener("click", () => {
  for (let i = 0; i < 1000000; i++) {
    const x = Math.random() * 100000 - 50000;
    const y = Math.random() * 100000 - 50000;
    renderer.addNode(x, y, defaultShape);
  }
  renderer.flush();
  console.log("Spawned 10,000 nodes!");
});

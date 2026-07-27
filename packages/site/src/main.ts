import { createGraphRenderer, defaultShape, createShape } from "web-digraph";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div style="font-family: sans-serif; padding: 20px;">
    <h2>Web Digraph - Step 1</h2>
    <p>We should see two default rectangular nodes below:</p>
    <div style="margin-bottom: 12px; display: flex; gap: 8px;">
      <input id="node-count" type="number" value="100" style="padding: 8px; font-size: 14px; width: 100px;" />
      <button id="btn-generate" style="padding: 8px 16px; font-size: 14px; cursor: pointer;">Generate Grid</button>
    </div>
    <canvas id="graph-canvas" width="800" height="600" style="border: 1px solid #ddd; background-color: #fafafa; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);"></canvas>
  </div>
`;

const canvas = document.getElementById("graph-canvas") as HTMLCanvasElement;

// 1. Create renderer
const renderer = createGraphRenderer({ drawGrid: true });

// 2. Mount to canvas
renderer.mount(canvas);

// 3. Define a shape
const circlePath = new Path2D();
circlePath.arc(0, 0, 12, 0, Math.PI * 2);

const circleShape = createShape({
  w: 24,
  h: 24,
  path: circlePath,
  draw: (ctx, path, id) => {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fill(path);
    ctx.stroke(path);

    ctx.fillStyle = "#333333";
    ctx.font = "600 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${id}`, 0, 0);
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

// 7. Dynamic Spawner UI
const input = document.getElementById("node-count") as HTMLInputElement;
const btn = document.getElementById("btn-generate") as HTMLButtonElement;

btn.addEventListener("click", () => {
  const count = parseInt(input.value, 10) || 0;
  if (count <= 0) return;

  console.log(`Spawning ${count} nodes...`);
  const nodeIds: number[] = [];
  const cols = Math.ceil(Math.sqrt(count));
  const spacing = 150; // spacing between nodes

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = col * spacing;
    const y = row * spacing;
    nodeIds.push(renderer.addNode(x, y, defaultShape));
  }

  // Edges connect to the next node sequentially
  for (let i = 0; i < count - 1; i++) {
    renderer.addEdge(nodeIds[i], nodeIds[i + 1], circleShape);
  }

  renderer.flush();
  console.log(
    `Spawned ${count} nodes in a ${cols}x${Math.ceil(count / cols)} grid!`
  );
});

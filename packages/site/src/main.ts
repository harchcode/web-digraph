import { createGraphRenderer, createShape } from "web-digraph";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div style="font-family: sans-serif; padding: 20px;">
    <h2>Web Digraph - Step 1</h2>
    <p>We should see two default rectangular nodes below:</p>
    <canvas id="graph-canvas" width="800" height="600" style="border: 1px solid #ddd; background-color: #fafafa; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);"></canvas>
  </div>
`;

const canvas = document.getElementById("graph-canvas") as HTMLCanvasElement;

// 1. Create renderer
const renderer = createGraphRenderer();

// 2. Mount to canvas
renderer.mount(canvas);

// 3. Define a shape
const defaultShape = createShape();

// 4. Add nodes to the renderer's state
renderer.addNode(200, 200, defaultShape);
renderer.addNode(400, 300, defaultShape);

// 5. Draw!
renderer.flush();

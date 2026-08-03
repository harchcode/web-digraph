import type { GraphRenderer } from "web-digraph";
import {
  getRandomEdgeShapeId,
  getRandomNodeShapeId,
  addNodeLabel,
  addEdgeLabel,
  resetLabels
} from "./shapes";

let isGenerating = false;

export async function generateGrid(
  renderer: GraphRenderer,
  onProgress?: () => void
) {
  if (isGenerating) return;
  const input = document.getElementById("node-count") as HTMLInputElement;
  const btn = document.getElementById("btn-generate") as HTMLButtonElement;

  let count = parseInt(input.value, 10);
  if (isNaN(count)) count = 100;

  isGenerating = true;
  input.disabled = true;
  btn.disabled = true;

  renderer.clear();
  resetLabels();
  renderer.flush(); // Clear screen immediately

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const spacing = 180;

  const startX = -((cols - 1) * spacing) / 2;
  const startY = -((rows - 1) * spacing) / 2;

  const nodeIds: number[] = [];
  let i = 0;
  let lastProgressTime = performance.now();

  while (i < count) {
    const chunkStartTime = performance.now();

    // Generate nodes until we run out of our 16ms budget
    while (i < count && performance.now() - chunkStartTime < 16) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacing;
      const y = startY + row * spacing;

      const id = renderer.addNode(x, y, getRandomNodeShapeId());
      addNodeLabel(id);
      nodeIds.push(id);

      if (i > 0) {
        const edgeId = renderer.addEdge(
          nodeIds[i - 1],
          id,
          getRandomEdgeShapeId()
        );
        addEdgeLabel(edgeId);
      }
      i++;
    }

    renderer.flush();
    if (onProgress && performance.now() - lastProgressTime > 100) {
      onProgress();
      lastProgressTime = performance.now();
    }

    if (i < count) {
      // Yield to the browser before continuing
      await new Promise(r => requestAnimationFrame(r));
    }
  }

  if (onProgress) onProgress();

  isGenerating = false;
  input.disabled = false;
  btn.disabled = false;
}

export function generateGridImmediate(renderer: GraphRenderer) {
  if (isGenerating) return;
  const input = document.getElementById("node-count") as HTMLInputElement;
  const btn = document.getElementById("btn-generate") as HTMLButtonElement;

  let count = parseInt(input.value, 10);
  if (isNaN(count)) count = 100;

  isGenerating = true;
  input.disabled = true;
  btn.disabled = true;

  renderer.clear();
  resetLabels();

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const spacing = 180;

  const startX = -((cols - 1) * spacing) / 2;
  const startY = -((rows - 1) * spacing) / 2;

  const nodeIds = new Int32Array(count);

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * spacing;
    const y = startY + row * spacing;

    const id = renderer.addNode(x, y, getRandomNodeShapeId());
    addNodeLabel(id);
    nodeIds[i] = id;

    if (i > 0) {
      const edgeId = renderer.addEdge(
        nodeIds[i - 1],
        id,
        getRandomEdgeShapeId()
      );
      addEdgeLabel(edgeId);
    }
  }

  renderer.flush();

  isGenerating = false;
  input.disabled = false;
  btn.disabled = false;
}

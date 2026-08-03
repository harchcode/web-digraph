import { type GraphRenderer, type GraphShape } from "web-digraph";

export const nodeLabels: string[] = [];
export const edgeLabels: string[] = [];

let nextIdCounter = 1;

export function addNodeLabel(id: number) {
  nodeLabels[id] = (nextIdCounter++).toString();
}

export function addEdgeLabel(id: number) {
  edgeLabels[id] = (nextIdCounter++).toString();
}

export function handleNodeDeleted(id: number, movedId: number) {
  if (movedId !== -1) {
    nodeLabels[id] = nodeLabels[movedId];
  }
  nodeLabels.pop();
}

export function handleEdgeDeleted(id: number, movedId: number) {
  if (movedId !== -1) {
    edgeLabels[id] = edgeLabels[movedId];
  }
  edgeLabels.pop();
}

export function resetLabels() {
  nodeLabels.length = 0;
  edgeLabels.length = 0;
  nextIdCounter = 1;
}

// Helper to draw text
function drawNodeId(ctx: CanvasRenderingContext2D, id: number) {
  ctx.fillStyle = "#475569";
  const label = nodeLabels[id] ?? id;
  ctx.fillText(`Node ${label}`, 0, 0);
}

function drawEdgeId(ctx: CanvasRenderingContext2D, id: number) {
  ctx.fillStyle = "#475569";
  const label = edgeLabels[id] ?? id;
  ctx.fillText(label.toString(), 0, 0);
}

// ------------------------------------------------------------------
// Node Shapes
// ------------------------------------------------------------------

export const squareShape: GraphShape = {
  w: 80,
  h: 80,
  path: new Path2D("M -40 -40 L 40 -40 L 40 40 L -40 40 Z"),
  draw: (ctx, path, id, _renderer) => {
    ctx.fill(path);
    ctx.stroke(path);
    drawNodeId(ctx, id);
  }
};

const circlePath = new Path2D();
circlePath.arc(0, 0, 40, 0, Math.PI * 2);
export const circleShape: GraphShape = {
  w: 80,
  h: 80,
  path: circlePath,
  draw: (ctx, path, id, _renderer) => {
    ctx.fill(path);
    ctx.stroke(path);
    drawNodeId(ctx, id);
  }
};

export const diamondShape: GraphShape = {
  w: 100,
  h: 100,
  path: new Path2D("M 0 -50 L 50 0 L 0 50 L -50 0 Z"),
  draw: (ctx, path, id, _renderer) => {
    ctx.fill(path);
    ctx.stroke(path);
    drawNodeId(ctx, id);
  }
};

const hexPath = new Path2D();
for (let i = 0; i < 6; i++) {
  const angle = (Math.PI / 3) * i;
  const x = 50 * Math.cos(angle);
  const y = 50 * Math.sin(angle);
  if (i === 0) hexPath.moveTo(x, y);
  else hexPath.lineTo(x, y);
}
hexPath.closePath();

export const hexagonShape: GraphShape = {
  w: 100,
  h: 100,
  path: hexPath,
  draw: (ctx, path, id, _renderer) => {
    ctx.fill(path);
    ctx.stroke(path);
    drawNodeId(ctx, id);
  }
};

const starPath = new Path2D();
const outerRadius = 60;
const innerRadius = outerRadius / 2;

// Calculate bounding box visually to center it dynamically
const topY = -outerRadius;
const bottomY = outerRadius * Math.sin((54 * Math.PI) / 180);
const yOffset = -(topY + bottomY) / 2;

for (let i = 0; i < 10; i++) {
  const radius = i % 2 === 0 ? outerRadius : innerRadius;
  const angle = (Math.PI / 5) * i - Math.PI / 2;
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle) + yOffset;
  if (i === 0) starPath.moveTo(x, y);
  else starPath.lineTo(x, y);
}
starPath.closePath();

export const starShape: GraphShape = {
  w: outerRadius * 2,
  h: outerRadius * 2,
  path: starPath,
  draw: (ctx, path, id, _renderer) => {
    ctx.fill(path);
    ctx.stroke(path);
    drawNodeId(ctx, id);
  }
};

export const crossShape: GraphShape = {
  w: 100,
  h: 100,
  path: new Path2D(
    "M -20 -50 L 20 -50 L 20 -20 L 50 -20 L 50 20 L 20 20 L 20 50 L -20 50 L -20 20 L -50 20 L -50 -20 L -20 -20 Z"
  ),
  draw: (ctx, path, id, _renderer) => {
    ctx.fill(path);
    ctx.stroke(path);
    drawNodeId(ctx, id);
  }
};

const blobPath = new Path2D(
  "M 0 -40 C 30 -50 60 -20 40 10 C 20 40 -10 50 -30 30 C -50 10 -40 -20 0 -40 Z"
);
export const blobShape: GraphShape = {
  w: 100,
  h: 100,
  path: blobPath,
  draw: (ctx, path, id, _renderer) => {
    ctx.fill(path);
    ctx.stroke(path);
    drawNodeId(ctx, id);
  }
};

// ------------------------------------------------------------------
// Edge Shapes
// ------------------------------------------------------------------

const smallCirclePath = new Path2D();
smallCirclePath.arc(0, 0, 16, 0, Math.PI * 2);
export const smallCircleShape: GraphShape = {
  w: 32,
  h: 32,
  path: smallCirclePath,
  draw: (ctx, path, id, _renderer) => {
    ctx.fill(path);
    ctx.stroke(path);
    drawEdgeId(ctx, id);
  }
};

export const smallSquareShape: GraphShape = {
  w: 32,
  h: 32,
  path: new Path2D("M -16 -16 L 16 -16 L 16 16 L -16 16 Z"),
  draw: (ctx, path, id, _renderer) => {
    ctx.fill(path);
    ctx.stroke(path);
    drawEdgeId(ctx, id);
  }
};

export const smallDiamondShape: GraphShape = {
  w: 40,
  h: 40,
  path: new Path2D("M 0 -20 L 20 0 L 0 20 L -20 0 Z"),
  draw: (ctx, path, id, _renderer) => {
    ctx.fill(path);
    ctx.stroke(path);
    drawEdgeId(ctx, id);
  }
};

const nodeShapes = [
  squareShape,
  circleShape,
  diamondShape,
  hexagonShape,
  starShape,
  crossShape,
  blobShape
];
const edgeShapes = [smallCircleShape, smallSquareShape, smallDiamondShape];

export function registerAllShapes(renderer: GraphRenderer) {
  nodeShapes.forEach(s => renderer.registerShape(s));
  edgeShapes.forEach(s => renderer.registerShape(s));
}

export function getRandomNodeShapeId() {
  return Math.floor(Math.random() * nodeShapes.length);
}

export function getRandomEdgeShapeId() {
  return nodeShapes.length + Math.floor(Math.random() * edgeShapes.length);
}

import {
  createEdgeShape,
  createGraphView,
  createNodeShape,
  defaultEdgeShape,
  defaultNodeShape,
  GraphEdge,
  GraphNode,
  GraphView
} from "../src";

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

const graphDiv = document.getElementById("graph") as HTMLDivElement;
const nodeCountInput = document.getElementById(
  "node-count-input"
) as HTMLInputElement;
const generateButton = document.getElementById(
  "generate-button"
) as HTMLButtonElement;
const toggleModeButton = document.getElementById(
  "toggle-mode-button"
) as HTMLButtonElement;

let graphView: GraphView<GraphNode, GraphEdge>;

let isDragging = false;
let isMovingNode = false;

const rectNodeShape = createNodeShape({
  width: 160,
  height: 120,
  createPath: (x, y, w, h) => {
    const p = new Path2D();

    p.rect(x - w * 0.5, y - h * 0.5, w, h);
    p.closePath();

    return p;
  }
});

const starNodeShape = createNodeShape({
  width: 218,
  height: 205,
  createPath: (x, y, w, h) => {
    const p = new Path2D();

    const l = x - w * 0.5;
    const t = y - h * 0.5;

    p.moveTo(l + 108, t + 0.0);
    p.lineTo(l + 141, t + 70);
    p.lineTo(l + 218, t + 78.3);
    p.lineTo(l + 162, t + 131);
    p.lineTo(l + 175, t + 205);
    p.lineTo(l + 108, t + 170);
    p.lineTo(l + 41.2, t + 205);
    p.lineTo(l + 55, t + 131);
    p.lineTo(l + 0, t + 78);
    p.lineTo(l + 75, t + 68);
    p.lineTo(l + 108, t + 0);
    p.closePath();

    return p;
  }
});

const sqrt3 = Math.sqrt(3);
const wowNodeShape = createNodeShape({
  width: 200,
  height: 200,
  createPath: (x, y, w, h) => {
    const p = new Path2D();

    const ex = 0.25 * w * sqrt3;
    const ex2 = ex * 0.33333333;
    const ex3 = ex * (1 - 0.33333333);
    const ey = 0.25 * h;

    p.moveTo(x, y - h * 0.5);
    p.lineTo(x + ex2, y - ey);
    p.lineTo(x + ex, y - ey);
    p.lineTo(x + ex3, y);
    p.lineTo(x + ex, y + ey);
    p.lineTo(x + ex2, y + ey);
    p.lineTo(x, y + h * 0.5);
    p.lineTo(x - ex2, y + ey);
    p.lineTo(x - ex, y + ey);
    p.lineTo(x - ex3, y);
    p.lineTo(x - ex, y - ey);
    p.lineTo(x - ex2, y - ey);

    p.closePath();

    return p;
  }
});

const nodeShapes = [
  defaultNodeShape,
  rectNodeShape,
  starNodeShape,
  wowNodeShape
];

const circleEdgeShape = createEdgeShape({
  width: 48,
  height: 48,
  createPath: (x, y, w) => {
    const p = new Path2D();

    p.arc(x, y, w * 0.5, 0, 2 * Math.PI);
    p.closePath();

    return p;
  }
});

const edgeShapes = [defaultEdgeShape, circleEdgeShape];

let lastId = 0;
let mode: "move" | "create" = "move";

function generate(nodeCount = 100) {
  let id = 1;

  graphView.clear();

  const columns = Math.ceil(Math.sqrt(nodeCount));

  for (let i = 0; i < nodeCount; i++) {
    const row = (i / columns) | 0;
    const col = i % columns;

    graphView.addNode(
      {
        id,
        x: col * 320,
        y: row * 320
      },
      nodeShapes[getRandomInt(0, nodeShapes.length)]
    );

    id++;

    if (i > 0) {
      graphView.addEdge(
        {
          id,
          sourceId: id - (i > 1 ? 3 : 2),
          targetId: id - 1
        },
        edgeShapes[getRandomInt(0, edgeShapes.length)]
      );

      id++;
    }
  }

  lastId = id - 1;
}

function main() {
  graphView = createGraphView(graphDiv);

  generate(100);

  generateButton.addEventListener("click", () => {
    const len = parseInt(nodeCountInput.value, 10);

    generate(len);
  });

  toggleModeButton.addEventListener("click", () => {
    if (mode === "create") mode = "move";
    else mode = "create";
  });

  window.addEventListener("resize", () => {
    graphView.resize(graphDiv.clientWidth, graphDiv.clientHeight);
  });

  graphDiv.addEventListener("mousedown", e => {
    isDragging = true;

    const hoveredId = graphView.getHoveredId();

    if (hoveredId > 0) {
      graphView.select(hoveredId);
    } else {
      graphView.clearSelection();
    }

    if (hoveredId > 0 && graphView.isNode(graphView.getNode(hoveredId))) {
      isMovingNode = true;
      const pos = graphView.getViewPosFromWindowPos(e.x, e.y);

      if (mode === "move") graphView.beginMoveNode([hoveredId], pos[0], pos[1]);

      if (mode === "create")
        graphView.beginDragLine(graphView.getNode(hoveredId));
    }
  });

  graphDiv.addEventListener("mousemove", e => {
    if (!isDragging) return;

    if (!isMovingNode) graphView.moveBy(e.movementX, e.movementY);
  });

  graphDiv.addEventListener("mouseup", () => {
    isDragging = false;
    isMovingNode = false;

    graphView.endMoveNode();

    const r = graphView.endDragLine();

    if (r) {
      lastId++;

      graphView.addEdge(
        { id: lastId, sourceId: r[0].id, targetId: r[1].id },
        edgeShapes[getRandomInt(0, edgeShapes.length)]
      );
    }
  });

  graphDiv.addEventListener(
    "wheel",
    e => {
      e.preventDefault();
      const pos = graphView.getViewPosFromWindowPos(e.x, e.y);

      graphView.zoomBy(-e.deltaY * 0.001, pos[0], pos[1]);
    },
    {
      passive: false
    }
  );
}

main();

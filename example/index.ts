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
  drawPath: (p, x, y, w, h) => {
    p.rect(x - w * 0.5, y - h * 0.5, w, h);
    p.closePath();
  }
});

const nodeShapes = [defaultNodeShape, rectNodeShape];

const edgeShapes = [defaultEdgeShape];

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
        edgeShape
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

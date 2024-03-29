import {
  createGraphView,
  GraphEdge,
  GraphMode,
  GraphNode,
  GraphView
} from "../src";
import { edgeShapes, nodeShapes } from "./shapes";

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
const toggleMultiselectButton = document.getElementById(
  "toggle-multiselect-button"
) as HTMLButtonElement;
const deleteButton = document.getElementById(
  "delete-button"
) as HTMLButtonElement;
const nodeCountText = document.getElementById(
  "node-count-text"
) as HTMLSpanElement;
const edgeCountText = document.getElementById(
  "edge-count-text"
) as HTMLSpanElement;
const zoomSlider = document.getElementById("zoom-slider") as HTMLInputElement;

let graphView: GraphView<GraphNode, GraphEdge>;

let lastId = 0;

function updateCountText() {
  nodeCountText.innerText = graphView.getNodeCount().toString();
  edgeCountText.innerText = graphView.getEdgeCount().toString();
}

function generate(nodeCount = 100) {
  let id = 1;

  graphView.startBatch();
  graphView.clear();

  const columns = Math.ceil(Math.sqrt(nodeCount));
  const rows = Math.floor(nodeCount / columns);

  const startX = (1 - columns) * 160;
  const startY = (1 - rows) * 160;

  for (let i = 0; i < nodeCount; i++) {
    const row = (i / columns) | 0;
    const col = i % columns;

    graphView.addNode(
      {
        id,
        x: startX + col * 320,
        y: startY + row * 320
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

  graphView.endBatch();

  updateCountText();

  lastId = id - 1;
}

function main() {
  graphView = createGraphView(graphDiv, {
    width: 100000,
    height: 100000,
    minScale: 0.2,
    maxScale: 3.0,
    onViewZoom() {
      zoomSlider.value = graphView.getScale().toString();
    },
    onCreateNode(x, y) {
      lastId++;

      graphView.addNode(
        { id: lastId, x, y },
        nodeShapes[getRandomInt(0, nodeShapes.length)]
      );

      updateCountText();
    },
    onCreateEdge(sourceId, targetId) {
      lastId++;

      graphView.addEdge(
        {
          id: lastId,
          sourceId,
          targetId
        },
        edgeShapes[getRandomInt(0, edgeShapes.length)]
      );

      updateCountText();
    }
  });

  graphView.modes = new Set([
    GraphMode.MOVE_VIEW,
    GraphMode.ZOOM,
    GraphMode.MOVE_NODE,
    GraphMode.SELECT
  ]);

  generateButton.addEventListener("click", () => {
    const len = parseInt(nodeCountInput.value, 10);

    generate(len);
  });

  zoomSlider.addEventListener("input", e => {
    const target = e.target as HTMLInputElement;

    graphView.zoomTo(Number(target.value));
  });

  toggleModeButton.addEventListener("click", () => {
    toggleModeButton.classList.toggle("active");
    graphView.toggleMode(GraphMode.CREATE_NODE);
    graphView.toggleMode(GraphMode.CREATE_EDGE);
  });

  toggleMultiselectButton.addEventListener("click", () => {
    toggleMultiselectButton.classList.toggle("active");
    graphView.toggleMode(GraphMode.MULTISELECT);
  });

  deleteButton.addEventListener("click", () => {
    const selectedIds = graphView.getSelection();

    graphView.startBatch();

    for (const id of selectedIds) {
      graphView.remove(id);
    }

    graphView.endBatch();

    updateCountText();
  });

  window.addEventListener("resize", () => {
    graphView.resize();
  });
}

main();

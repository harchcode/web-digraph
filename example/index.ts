import {
  createEdgeShape,
  createGraphView,
  createNodeShape,
  GraphEdge,
  GraphNode,
  GraphView
} from "../src";

const graphDiv = document.getElementById("graph") as HTMLDivElement;
const nodeCountInput = document.getElementById(
  "node-count-input"
) as HTMLInputElement;
const generateButton = document.getElementById(
  "generate-button"
) as HTMLButtonElement;

let graphView: GraphView<GraphNode, GraphEdge>;

let isDragging = false;

const nodeShape = createNodeShape();
const edgeShape = createEdgeShape();

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
        x: col * 200,
        y: row * 200
      },
      nodeShape
    );

    id++;

    if (i > 0) {
      graphView.addEdge(
        {
          id,
          sourceId: id - (i > 1 ? 3 : 2),
          targetId: id - 1
        },
        edgeShape
      );

      id++;
    }
  }
}

function main() {
  graphView = createGraphView(graphDiv);

  generate(2);

  generateButton.addEventListener("click", () => {
    const len = parseInt(nodeCountInput.value, 10);

    generate(len);
  });

  window.addEventListener("resize", () => {
    graphView.resize(graphDiv.clientWidth, graphDiv.clientHeight);
  });

  graphView.canvas.addEventListener("mousedown", () => {
    isDragging = true;
  });

  graphView.canvas.addEventListener("mousemove", e => {
    if (!isDragging) return;

    graphView.moveBy(e.movementX, e.movementY);
  });

  graphView.canvas.addEventListener("mouseup", () => {
    isDragging = false;
  });

  graphView.canvas.addEventListener(
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

import { createGraphView, GraphEdge, GraphNode } from "../src";

const graphDiv = document.getElementById("graph") as HTMLDivElement;

let isDragging = false;

const nodes: GraphNode[] = [
  {
    x: 400,
    y: 400
  },
  {
    x: 150,
    y: 150
  }
];
const edges: GraphEdge[] = [
  {
    source: nodes[0],
    target: nodes[1]
  }
];

function main() {
  const graphView = createGraphView(graphDiv);
  graphView.setData(nodes, edges);

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

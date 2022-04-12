import { randomize } from "./utils";
import {
  GraphNode,
  GraphEdge,
  GraphView,
  initDefaultGraphEvents,
  createGraphView
} from "../src";
import { normalEdgeShape, normalNodeShape } from "./node-types";

const graphDiv = document.getElementById("graph") as HTMLDivElement;
const nodeCountSpan = document.getElementById("node-count-span");
const edgeCountSpan = document.getElementById("edge-count-span");
const zoomSlider = document.getElementById("zoom-slider") as HTMLInputElement;
const generateTextbox = document.getElementById(
  "generate-textbox"
) as HTMLInputElement;
const generateButton = document.getElementById(
  "generate-button"
) as HTMLButtonElement;
const moveButton = document.getElementById("move-tool") as HTMLButtonElement;
const createButton = document.getElementById(
  "create-tool"
) as HTMLButtonElement;

type Action = "move" | "create";
let action: Action = "move";

function setAction(newAction: Action) {
  action = newAction;

  moveButton.classList.remove("active");
  createButton.classList.remove("active");

  switch (action) {
    case "move":
      moveButton.classList.add("active");
      break;
    case "create":
      createButton.classList.add("active");
      break;
  }
}

moveButton.addEventListener("click", e => {
  e.stopPropagation();
  setAction("move");
});
createButton.addEventListener("click", e => {
  e.stopPropagation();
  setAction("create");
});

let nodes: GraphNode[] = [];
let edges: GraphEdge[] = [];
// const lastId = 0;
let isDragging = false;
let movingNode: GraphNode | undefined;
let dragSourceNode: GraphNode | undefined;
const pos: [number, number] = [0, 0];
const startPos: [number, number] = [0, 0];

const graphView = createGraphView(graphDiv, nodes, edges);

graphView.canvas.addEventListener(
  "mousedown",
  e => {
    isDragging = true;

    startPos[0] = e.x;
    startPos[1] = e.y;

    if (action === "move") {
      movingNode = graphView.hoveredNode;
    }

    if (action === "create") {
      if (graphView.hoveredNode) {
        dragSourceNode = graphView.hoveredNode;

        graphView.beginDragLine(
          graphView.hoveredNode.x,
          graphView.hoveredNode.y
        );
      }
    }
  },
  {
    passive: true
  }
);
graphView.canvas.addEventListener(
  "mouseup",
  e => {
    if (isDragging && action === "create" && dragSourceNode) {
      graphView.endDragLine();

      if (graphView.hoveredNode && graphView.hoveredNode !== dragSourceNode) {
        edges.push({
          source: dragSourceNode,
          target: graphView.hoveredNode,
          shape: normalEdgeShape
        });
      }
    }

    if (action === "create" && !dragSourceNode && !graphView.hoveredNode) {
      graphView.setViewPosFromWindowPos(pos, e.x, e.y);

      nodes.push({
        x: pos[0],
        y: pos[1],
        shape: normalNodeShape
      });
    }

    isDragging = false;
    movingNode = undefined;
    dragSourceNode = undefined;
  },
  { passive: true }
);
graphView.canvas.addEventListener(
  "mousemove",
  e => {
    if (!isDragging) return;
    if (action === "create") return;

    const dx = e.x - startPos[0];
    const dy = e.y - startPos[1];

    if (movingNode) {
      movingNode.x += dx / graphView.transform[0];
      movingNode.y += dy / graphView.transform[0];
    } else {
      graphView.moveBy(dx, dy);
    }

    startPos[0] = e.x;
    startPos[1] = e.y;
  },
  {
    passive: true
  }
);
graphView.canvas.addEventListener(
  "wheel",
  e => {
    e.preventDefault();
    graphView.setViewPosFromWindowPos(pos, e.x, e.y);

    graphView.zoomBy(-e.deltaY * 0.001, pos[0], pos[1]);
  },
  {
    passive: false
  }
);

// graphView.requestDraw();

function updateNodeCount(): void {
  if (!nodeCountSpan) return;

  nodeCountSpan.innerHTML = nodes.length.toString();
}

function updateEdgeCount(): void {
  if (!edgeCountSpan) return;

  edgeCountSpan.innerHTML = edges.length.toString();
}

// function handleCreateNode(x: number, y: number) {
//   lastId += 1;

//   const newNode: GENode = {
//     id: lastId,
//     x,
//     y,
//     type: "empty",
//     text: `Node ID: ${lastId}`
//   };

//   nodes = [...nodes, newNode];
//   graphView.setData(nodes, edges);

//   updateNodeCount();
// }

// function handleCreateEdge(sourceNode: GENode, targetNode: GENode) {
//   lastId += 1;

//   const newEdge: GEEdge = {
//     id: lastId,
//     sourceNode,
//     targetNode,
//     type: "normal",
//     text: lastId.toString()
//   };

//   edges = [...edges, newEdge];
//   graphView.setData(nodes, edges);

//   updateEdgeCount();
// }

// function handleDeleteNode(node: GENode) {
//   nodes = nodes.filter(n => n !== node);
//   edges = edges.filter(e => e.sourceNode !== node && e.targetNode !== node);

//   graphView.setData(nodes, edges);

//   updateNodeCount();
//   updateEdgeCount();
// }

// function handleDeleteEdge(edge: GEEdge) {
//   edges = edges.filter(e => e.id !== edge.id);

//   graphView.setData(nodes, edges);

//   updateEdgeCount();
// }

// function handleMoveNode(node: GENode, newX: number, newY: number) {
//   node.x = newX;
//   node.y = newY;
// }

// function handleViewZoom() {
//   zoomSlider.value = graphView.getScale().toString();
// }

window.addEventListener("resize", () => {
  graphView.resize(window.innerWidth, window.innerHeight);
});

// zoomSlider.addEventListener("input", e => {
//   const target = e.target as HTMLInputElement;

//   graphView.zoomTo(Number(target.value));
// });

if (generateButton) {
  generateButton.addEventListener("click", () => {
    const value = parseInt(generateTextbox.value, 10);
    const columns = Math.ceil(Math.sqrt(value));

    const r = randomize(value, columns);

    // lastId = r.lastId;
    nodes = r.nodes;
    edges = r.edges;

    graphView.nodes = nodes;
    graphView.edges = edges;
    // console.log({ nodes, edges });

    updateNodeCount();
    updateEdgeCount();
  });
}

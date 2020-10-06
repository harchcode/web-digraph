import { GEView } from "../index";
import { GEShapeTypes, GEShapeName, GENode, GEEdge } from "../types";

const graphDiv = document.getElementById("graph");
const nodeCountSpan = document.getElementById("node-count-span");
const edgeCountSpan = document.getElementById("edge-count-span");
const zoomSlider = document.getElementById("zoom-slider") as HTMLInputElement;
const generateTextbox = document.getElementById(
  "generate-textbox"
) as HTMLInputElement;
const generateButton = document.getElementById("generate-button");

const nodeTypes: GEShapeTypes = {
  empty: [
    {
      shape: GEShapeName.CIRCLE,
      r: 80
    }
  ],
  decision: [
    {
      shape: GEShapeName.RECTANGLE,
      width: 150,
      height: 120
    }
  ],
  unknown: [
    {
      shape: GEShapeName.POLYGON,
      points: [
        [0, -80],
        [80, 0],
        [0, 80],
        [-80, 0]
      ]
    }
  ],
  complex: [
    {
      shape: GEShapeName.CIRCLE,
      r: 80
    },
    {
      shape: GEShapeName.CIRCLE,
      r: 60,
      color: "#9AE6B4"
    },
    {
      shape: GEShapeName.CIRCLE,
      r: 40,
      color: "white"
    }
  ]
};

const edgeTypes: GEShapeTypes = {
  normal: [
    {
      shape: GEShapeName.POLYGON,
      points: [
        [0, -25],
        [25, 0],
        [0, 25],
        [-25, 0]
      ]
    }
  ],
  round: [
    {
      shape: GEShapeName.CIRCLE,
      r: 25
    }
  ],
  double: [
    {
      shape: GEShapeName.CIRCLE,
      r: 25,
      color: "#E9D8FD"
    },
    {
      shape: GEShapeName.CIRCLE,
      r: 15,
      color: "white"
    }
  ]
};

let nodes: GENode[] = [];
let edges: GEEdge[] = [];
let lastId = 0;

const graphView = new GEView();

function updateNodeCount(): void {
  nodeCountSpan.innerHTML = nodes.length.toString();
}

function updateEdgeCount(): void {
  edgeCountSpan.innerHTML = edges.length.toString();
}

function handleCreateNode(x: number, y: number) {
  lastId += 1;

  const newNode: GENode = {
    id: lastId,
    x,
    y,
    type: "empty",
    text: `Node ID: ${lastId}`
  };

  nodes = [...nodes, newNode];
  graphView.setData(nodes, edges);

  updateNodeCount();
}

function handleCreateEdge(sourceNode: GENode, targetNode: GENode) {
  lastId += 1;

  const newEdge: GEEdge = {
    id: lastId,
    sourceNodeId: sourceNode.id,
    targetNodeId: targetNode.id,
    type: "normal",
    text: lastId.toString()
  };

  edges = [...edges, newEdge];
  graphView.setData(nodes, edges);

  updateEdgeCount();
}

function handleDeleteNode(node: GENode) {
  nodes = nodes.filter(n => n.id !== node.id);
  edges = edges.filter(
    e => e.sourceNodeId !== node.id && e.targetNodeId !== node.id
  );

  graphView.setData(nodes, edges);

  updateNodeCount();
  updateEdgeCount();
}

function handleDeleteEdge(edge: GEEdge) {
  edges = edges.filter(e => e.id !== edge.id);

  graphView.setData(nodes, edges);

  updateEdgeCount();
}

function handleMoveNode(node: GENode, newX: number, newY: number) {
  node.x = newX;
  node.y = newY;
}

graphView.setOptions({
  minScale: 0.2,
  maxScale: 3.0,
  nodeTypes,
  edgeTypes,
  onViewZoom: () => {
    zoomSlider.value = graphView.getScale().toString();
  },
  onCreateNode: handleCreateNode,
  onCreateEdge: handleCreateEdge,
  onDeleteNode: handleDeleteNode,
  onDeleteEdge: handleDeleteEdge,
  onMoveNode: handleMoveNode
});

function getRandomIntInclusive(minF: number, maxF: number): number {
  const min = Math.ceil(minF);
  const max = Math.floor(maxF);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

function randomize(nodeCount = 1000, cols = 40) {
  nodes = [];
  edges = [];
  lastId = 0;

  for (let i = 0; i < nodeCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const tmp = getRandomIntInclusive(0, 3);
    const nodeType =
      tmp === 0
        ? "empty"
        : tmp === 1
        ? "decision"
        : tmp === 2
        ? "unknown"
        : "complex";

    const tmp2 = getRandomIntInclusive(0, 2);
    const edgeType = tmp2 === 0 ? "normal" : tmp2 === 1 ? "round" : "double";

    lastId++;
    const currNode: GENode = {
      id: lastId,
      x: col * 320,
      y: row * 320,
      type: nodeType,
      text: `Node ID: ${lastId}`
    };

    nodes.push(currNode);

    if (i > 0) {
      const prevNode = nodes[i - 1];

      lastId++;
      edges.push({
        id: lastId,
        sourceNodeId: prevNode.id,
        targetNodeId: currNode.id,
        type: edgeType,
        text: lastId.toString()
      });
    }
  }

  graphView.setData(nodes, edges);
}

graphView.init(graphDiv);

window.addEventListener("resize", () => {
  graphView.resize(window.innerWidth, window.innerHeight);
});

zoomSlider.addEventListener("input", e => {
  const target = e.target as HTMLInputElement;

  graphView.zoomTo(Number(target.value));
});

generateButton.addEventListener("click", () => {
  const value = parseInt(generateTextbox.value, 10);
  const columns = Math.ceil(Math.sqrt(value));

  randomize(value, columns);

  updateNodeCount();
  updateEdgeCount();
});

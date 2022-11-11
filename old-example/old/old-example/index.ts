import { GEView, GENode, GEEdge } from "../src/index";
import { nodeTypes, edgeTypes } from "./node-types";
import { randomize } from "./utils";

const graphDiv = document.getElementById("graph");
const nodeCountSpan = document.getElementById("node-count-span");
const edgeCountSpan = document.getElementById("edge-count-span");
const zoomSlider = document.getElementById("zoom-slider") as HTMLInputElement;
const generateTextbox = document.getElementById(
  "generate-textbox"
) as HTMLInputElement;
const generateButton = document.getElementById("generate-button");

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
    sourceNode,
    targetNode,
    type: "normal",
    text: lastId.toString()
  };

  edges = [...edges, newEdge];
  graphView.setData(nodes, edges);

  updateEdgeCount();
}

function handleDeleteNode(node: GENode) {
  nodes = nodes.filter(n => n !== node);
  edges = edges.filter(e => e.sourceNode !== node && e.targetNode !== node);

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

function handleViewZoom() {
  zoomSlider.value = graphView.getScale().toString();
}

graphView.setOptions({
  minScale: 0.2,
  maxScale: 3.0,
  nodeTypes,
  edgeTypes,
  onViewZoom: handleViewZoom,
  onCreateNode: handleCreateNode,
  onCreateEdge: handleCreateEdge,
  onDeleteNode: handleDeleteNode,
  onDeleteEdge: handleDeleteEdge,
  onMoveNode: handleMoveNode
});

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

  const r = randomize(value, columns);

  lastId = r.lastId;
  nodes = r.nodes;
  edges = r.edges;

  graphView.setData(r.nodes, r.edges);

  updateNodeCount();
  updateEdgeCount();
});

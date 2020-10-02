import { GEView } from "../index";
import { GEShapeTypes, GEShapeName } from "../types";

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

const graphView = new GEView();

function updateNodeCount(): void {
  const count = graphView.getNodes().size;

  nodeCountSpan.innerHTML = count.toString();
}

function updateEdgeCount(): void {
  const count = graphView.getEdges().size;

  edgeCountSpan.innerHTML = count.toString();
}

graphView.setOptions({
  minScale: 0.2,
  maxScale: 3.0,
  nodeTypes,
  edgeTypes,
  defaultNodeType: "empty",
  defaultEdgeType: "normal",
  onViewZoom: () => {
    zoomSlider.value = graphView.scale.toString();
  },
  onAddNode: updateNodeCount,
  onAddEdge: updateEdgeCount,
  onDeleteNode: () => {
    updateNodeCount();
    updateEdgeCount();
  },
  onDeleteEdge: updateEdgeCount
});

function getRandomIntInclusive(minF: number, maxF: number): number {
  const min = Math.ceil(minF);
  const max = Math.floor(maxF);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

function randomize(nodeCount = 1000, cols = 40) {
  graphView.clearData();

  let prevNode;

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

    const currNode = graphView.addNode(
      col * 320,
      row * 320,
      nodeType,
      `Node ${i + 1}`
    );

    if (prevNode) {
      graphView.addEdge(
        currNode.id,
        prevNode.id,
        edgeType,
        getRandomIntInclusive(1, 1000).toString()
      );
    }

    prevNode = currNode;
  }
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

import { GEView } from "../index";

const graphDiv = document.getElementById("graph");
const nodeCountSpan = document.getElementById("node-count-span");
const edgeCountSpan = document.getElementById("edge-count-span");
const zoomSlider = document.getElementById("zoom-slider");
const generateTextbox = document.getElementById("generate-textbox");
const generateButton = document.getElementById("generate-button");

const options = {
  minScale: 0.2,
  maxScale: 1.8
};

const graphView = new GEView(options);

function getRandomIntInclusive(minF: number, maxF: number): number {
  const min = Math.ceil(minF);
  const max = Math.floor(maxF);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

function randomize(nodeCount = 1000, cols = 40) {
  let prevNode;

  for (let i = 0; i < nodeCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const currNode = graphView.addNode(
      col * 320,
      row * 480,
      getRandomIntInclusive(50, 120),
      `Node ${i + 1}`
    );

    if (prevNode) {
      graphView.addEdge(
        currNode.id,
        prevNode.id,
        getRandomIntInclusive(1, 1000).toString()
      );
    }

    prevNode = currNode;
  }
}

graphView.init(graphDiv);
randomize(10000, 200);

window.addEventListener("resize", () => {
  graphView.resize(window.innerWidth, window.innerHeight);
});

zoomSlider.addEventListener("input", e => {
  const target = e.target as HTMLInputElement;

  graphView.zoomTo(Number(target.value) * 0.01 * 1.8 + 0.2);
});

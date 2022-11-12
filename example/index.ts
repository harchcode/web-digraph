import { createGraphView } from "../src";

const graphDiv = document.getElementById("graph") as HTMLDivElement;

let isDragging = false;

function main() {
  const graphView = createGraphView(graphDiv);

  window.addEventListener("mousedown", () => {
    isDragging = true;
  });

  window.addEventListener("mousemove", e => {
    if (!isDragging) return;

    graphView.moveBy(e.movementX, e.movementY);
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

main();

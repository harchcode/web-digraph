import { GraphEditor } from "../index";

const graphDiv = document.getElementById("graph");
const graphView = new GraphEditor();

graphView.init(graphDiv);

window.addEventListener("resize", () => {
  graphView.resize(window.innerWidth, window.innerHeight);
});

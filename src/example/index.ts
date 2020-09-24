import { GEView } from "../index";

const graphDiv = document.getElementById("graph");
const graphView = new GEView();

graphView.init(graphDiv);

window.addEventListener("resize", () => {
  graphView.resize(window.innerWidth, window.innerHeight);
});

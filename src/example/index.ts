// import "@webcomponents/custom-elements/src/native-shim";
import { GraphView } from "../index";

customElements.define("graph-view", GraphView);

const graphView = document.getElementsByTagName("graph-view")[0] as GraphView;

window.addEventListener("resize", () => {
  graphView.resize(window.innerWidth, window.innerHeight);
});

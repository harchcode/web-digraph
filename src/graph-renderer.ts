import { GraphState } from "./graph-state";
import { GraphView } from "./graph-view";
import {
  EdgeDrawData,
  GraphDataType,
  GraphEdge,
  GraphNode,
  GraphShape,
  NodeDrawData
} from "./types";
import { isLineInsideRect, lineIntersect, rectIntersect } from "./utils";

export enum RedrawType {
  ALL = 0,
  NODES,
  EDGES,
  MOVE
}

export class GraphRenderer<Node extends GraphNode, Edge extends GraphEdge> {
  private state: GraphState<Node, Edge>;
  private view: GraphView<Node, Edge>;

  private isDrawing = false;

  constructor(view: GraphView<Node, Edge>, state: GraphState<Node, Edge>) {
    this.view = view;
    this.state = state;
  }

  requestDraw() {
    if (!this.isDrawing) {
      requestAnimationFrame(this.requestDrawHandler);
    }

    this.isDrawing = true;
  }

  requestDrawHandler = () => {
    this.isDrawing = false;

    this.drawAll();
  };

  applyTransform() {
    const {
      scale,
      translateX,
      translateY,
      bgCtx,
      nodeCtx,
      dragCtx,
      edgeCtx,
      moveCtx,
      options,
      viewX,
      viewY,
      viewW,
      viewH
    } = this.state;

    bgCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
    nodeCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
    dragCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
    edgeCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
    moveCtx.setTransform(scale, 0, 0, scale, translateX, translateY);

    const xt = -options.height * 0.5;
    const xr = options.width * 0.5;
    const xb = options.height * 0.5;
    const xl = -options.width * 0.5;

    const dl = Math.max(viewX, xl);
    const dt = Math.max(viewY, xt);
    const dr = Math.min(viewX + viewW, xr);
    const db = Math.min(viewY + viewH, xb);

    if (dl > viewX || dt > viewY || dr < viewX + viewW || db < viewY + viewH) {
      nodeCtx.beginPath();
      nodeCtx.rect(dl, dt, dr - dl, db - dt);
      nodeCtx.clip();
      edgeCtx.beginPath();
      edgeCtx.rect(dl, dt, dr - dl, db - dt);
      edgeCtx.clip();
      dragCtx.beginPath();
      dragCtx.rect(dl, dt, dr - dl, db - dt);
      dragCtx.clip();
      moveCtx.beginPath();
      moveCtx.rect(dl, dt, dr - dl, db - dt);
      moveCtx.clip();
    }

    this.state.setView();
  }

  drawAll = (
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) => {
    // const { edgeCtx, nodeCtx, nodes, edges } = this.state;

    // nodeCtx.clearRect(vx, vy, vw, vh);
    // edgeCtx.clearRect(vx, vy, vw, vh);

    this.drawBackground(vx, vy, vw, vh);

    // this.state.quad.getDataInRegion(vx, vy, vw, vh, this.state.drawIds);

    // for (const id of this.state.drawIds) {
    //   if (nodes[id]) this.drawNode(nodes[id], false, vx, vy, vw, vh);
    //   if (edges[id]) this.drawEdge(edges[id], false, vx, vy, vw, vh);
    // }
  };

  drawBackground(
    vx = this.state.viewX,
    vy = this.state.viewY,
    vw = this.state.viewW,
    vh = this.state.viewH
  ) {
    const { bgCtx, options } = this.state;

    const xt = -options.height * 0.5;
    const xr = options.width * 0.5;
    const xb = options.height * 0.5;
    const xl = -options.width * 0.5;

    const dl = Math.max(vx, xl);
    const dt = Math.max(vy, xt);
    const dr = Math.min(vx + vw, xr);
    const db = Math.min(vy + vh, xb);

    if (dl > vx || dt > vy || dr < vx + vw || db < vy + vh) {
      bgCtx.fillStyle = "white";
      bgCtx.fillRect(vx, vy, vw, vh);

      bgCtx.fillStyle = "black";
      bgCtx.fillRect(dl - 4, dt - 4, dr - dl + 8, db - dt + 8);
    }

    bgCtx.fillStyle = options.bgColor;
    bgCtx.fillRect(dl, dt, dr - dl, db - dt);

    if (!options.bgShowDots) return;

    const lw = options.bgLineWidth;
    const gap = options.bgLineGap;

    bgCtx.strokeStyle = options.bgDotColor;
    bgCtx.lineWidth = lw;

    const bl = dl - lw * 0.5;
    const br = dr + lw * 0.5;
    const bt = dt - lw * 0.5;
    const bb = db + lw * 0.5;

    const ll = bl - (((bl % gap) - gap) % gap);
    const lr = br - (((br % gap) + gap) % gap);
    const lt = bt - (((bt % gap) - gap) % gap);
    const lb = bb - (((bb % gap) + gap) % gap);

    bgCtx.beginPath();

    for (let i = ll; i <= lr; i += gap) {
      bgCtx.moveTo(i, lt);
      bgCtx.lineTo(i, lb + gap);
    }

    bgCtx.lineCap = "round";
    bgCtx.setLineDash([0, gap]);
    bgCtx.stroke();
    bgCtx.setLineDash([]);
    bgCtx.lineCap = "square";
  }
}

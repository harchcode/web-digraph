import {
  createEdgeShape,
  createNodeShape,
  defaultEdgeShape,
  defaultNodeShape
} from "../src";

const rectNodeShape = createNodeShape({
  width: 160,
  height: 120,
  createPath: (x, y, w, h) => {
    const p = new Path2D();

    p.rect(x - w * 0.5, y - h * 0.5, w, h);
    p.closePath();

    return p;
  }
});

const starNodeShape = createNodeShape({
  width: 218,
  height: 205,
  createPath: (x, y, w, h) => {
    const p = new Path2D();

    const l = x - w * 0.5;
    const t = y - h * 0.5;

    p.moveTo(l + 108, t + 0.0);
    p.lineTo(l + 141, t + 70);
    p.lineTo(l + 218, t + 78.3);
    p.lineTo(l + 162, t + 131);
    p.lineTo(l + 175, t + 205);
    p.lineTo(l + 108, t + 170);
    p.lineTo(l + 41.2, t + 205);
    p.lineTo(l + 55, t + 131);
    p.lineTo(l + 0, t + 78);
    p.lineTo(l + 75, t + 68);
    p.lineTo(l + 108, t + 0);
    p.closePath();

    return p;
  }
});

const sqrt3 = Math.sqrt(3);
const wowNodeShape = createNodeShape({
  width: 200,
  height: 200,
  createPath: (x, y, w, h) => {
    const p = new Path2D();

    const ex = 0.25 * w * sqrt3;
    const ex2 = ex * 0.33333333;
    const ex3 = ex * (1 - 0.33333333);
    const ey = 0.25 * h;

    p.moveTo(x, y - h * 0.5);
    p.lineTo(x + ex2, y - ey);
    p.lineTo(x + ex, y - ey);
    p.lineTo(x + ex3, y);
    p.lineTo(x + ex, y + ey);
    p.lineTo(x + ex2, y + ey);
    p.lineTo(x, y + h * 0.5);
    p.lineTo(x - ex2, y + ey);
    p.lineTo(x - ex, y + ey);
    p.lineTo(x - ex3, y);
    p.lineTo(x - ex, y - ey);
    p.lineTo(x - ex2, y - ey);

    p.closePath();

    return p;
  }
});

export const nodeShapes = [
  defaultNodeShape,
  rectNodeShape,
  starNodeShape,
  wowNodeShape
];

const circleEdgeShape = createEdgeShape({
  width: 48,
  height: 48,
  createPath: (x, y, w) => {
    const p = new Path2D();

    p.arc(x, y, w * 0.5, 0, 2 * Math.PI);
    p.closePath();

    return p;
  }
});

export const edgeShapes = [defaultEdgeShape, circleEdgeShape];

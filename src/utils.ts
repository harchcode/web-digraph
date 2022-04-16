import { GraphNode } from "./graph-view";

// http://paulbourke.net/geometry/pointlineplane/javascript.txt
export function intersect(
  out: [number, number],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) return false;

  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Lines are parallel
  if (denominator === 0) return false;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return false;

  // Return a object with the x and y coordinates of the intersection
  out[0] = x1 + ua * (x2 - x1);
  out[1] = y1 + ua * (y2 - y1);

  return true;
}

// return number of intersection points, max of 2
export function getIntersectionsOfLineAndRect(
  out: [[number, number], [number, number]],
  lineX1: number,
  lineY1: number,
  lineX2: number,
  lineY2: number,
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number
): number {
  const wh = rectW * 0.5;
  const hh = rectH * 0.5;

  const x1 = lineX1;
  const y1 = lineY1;
  const x2 = lineX2;
  const y2 = lineY2;
  const left = rectX - wh;
  const top = rectY - hh;
  const right = rectX + wh;
  const bottom = rectY + hh;

  let i = 0;

  if (intersect(out[i], x1, y1, x2, y2, left, top, right, top)) {
    i++;
  }

  if (intersect(out[i], x1, y1, x2, y2, right, top, right, bottom)) {
    i++;

    if (i === 2) return i;
  }

  if (intersect(out[i], x1, y1, x2, y2, right, bottom, left, bottom)) {
    i++;

    if (i === 2) return i;
  }

  if (intersect(out[i], x1, y1, x2, y2, left, bottom, left, top)) {
    i++;
  }

  return i;
}

export function circleIntersection<Node extends GraphNode>(
  out: [number, number],
  self: Node,
  other: Node
) {
  const dx = other.x - self.x;
  const dy = other.y - self.y;
  const r = (self.shape.size ? self.shape.size[0] : 100) * 0.5;

  const rad = Math.atan2(dy, dx);
  const sinr = Math.sin(rad);
  const cosr = Math.cos(rad);

  out[0] = self.x + cosr * r;
  out[1] = self.y + sinr * r;
}

export function rectIntersection<Node extends GraphNode>(
  out: [number, number],
  self: Node,
  other: Node
) {
  const wh = self.shape.size[0] * 0.5;
  const hh = self.shape.size[1] * 0.5;

  const x1 = other.x;
  const y1 = other.y;
  const x2 = self.x;
  const y2 = self.y;

  if (intersect(out, x1, y1, x2, y2, x2 - wh, y2 - hh, x2 + wh, y2 - hh))
    return;

  if (intersect(out, x1, y1, x2, y2, x2 + wh, y2 - hh, x2 + wh, y2 + hh))
    return;

  if (intersect(out, x1, y1, x2, y2, x2 + wh, y2 + hh, x2 - wh, y2 + hh))
    return;

  intersect(out, x1, y1, x2, y2, x2 - wh, y2 + hh, x2 - wh, y2 - hh);
}

export function polygonIntersection<Node extends GraphNode>(
  points: [number, number][]
) {
  return function (out: [number, number], self: Node, other: Node) {
    const len = points.length;

    const wh = self.shape.size[0] * 0.5;
    const hh = self.shape.size[1] * 0.5;

    const x1 = other.x;
    const y1 = other.y;
    const x2 = self.x;
    const y2 = self.y;

    for (let i = 0; i < len; i++) {
      const nextIndex = (i + 1) % len;

      const x3 = x2 - wh + points[i][0];
      const y3 = y2 - hh + points[i][1];
      const x4 = x2 - wh + points[nextIndex][0];
      const y4 = y2 - hh + points[nextIndex][1];

      const int = intersect(out, x1, y1, x2, y2, x3, y3, x4, y4);

      if (int) return;
    }
  };
}

export function createPathFromPoints(points: [number, number][]) {
  const r = new Path2D();

  r.moveTo(points[0][0], points[0][1]);

  for (let i = 1; i < points.length; i++) {
    r.lineTo(points[i][0], points[i][1]);
  }

  r.closePath();

  return r;
}

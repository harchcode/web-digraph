import { GraphNode } from "./graph-view";

// http://paulbourke.net/geometry/pointlineplane/javascript.txt
export function intersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  outPoint: [number, number]
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
  outPoint[0] = x1 + ua * (x2 - x1);
  outPoint[1] = y1 + ua * (y2 - y1);

  return true;
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

  const i1 = intersect(x1, y1, x2, y2, x2 - wh, y2 - hh, x2 + wh, y2 - hh, out);
  if (i1) return;

  const i2 = intersect(x1, y1, x2, y2, x2 + wh, y2 - hh, x2 + wh, y2 + hh, out);
  if (i2) return;

  const i3 = intersect(x1, y1, x2, y2, x2 + wh, y2 + hh, x2 - wh, y2 + hh, out);
  if (i3) return;

  intersect(x1, y1, x2, y2, x2 - wh, y2 + hh, x2 - wh, y2 - hh, out);
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

      const int = intersect(x1, y1, x2, y2, x3, y3, x4, y4, out);

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

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

export function intersectLineRectCenter(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w: number,
  h: number,
  outPoint: [number, number]
): boolean {
  const wh = w * 0.5;
  const hh = h * 0.5;

  const i1 = intersect(
    x1,
    y1,
    x2,
    y2,
    x2 - wh,
    y2 - hh,
    x2 + wh,
    y2 - hh,
    outPoint
  );

  if (i1) return true;

  const i2 = intersect(
    x1,
    y1,
    x2,
    y2,
    x2 + wh,
    y2 - hh,
    x2 + wh,
    y2 + hh,
    outPoint
  );

  if (i2) return true;

  const i3 = intersect(
    x1,
    y1,
    x2,
    y2,
    x2 + wh,
    y2 + hh,
    x2 - wh,
    y2 + hh,
    outPoint
  );

  if (i3) return true;

  const i4 = intersect(
    x1,
    y1,
    x2,
    y2,
    x2 - wh,
    y2 + hh,
    x2 - wh,
    y2 - hh,
    outPoint
  );

  if (i4) return true;

  return false;
}

export function instersectLinePolygonCenter(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  points: [number, number][],
  outPoint: [number, number]
): boolean {
  const len = points.length;

  for (let i = 0; i < len; i++) {
    const nextIndex = (i + 1) % len;

    const x3 = x2 + points[i][0];
    const y3 = y2 + points[i][1];
    const x4 = x2 + points[nextIndex][0];
    const y4 = y2 + points[nextIndex][1];

    const int = intersect(x1, y1, x2, y2, x3, y3, x4, y4, outPoint);

    if (int) return true;
  }

  return false;
}

export function intersectLineCircleCenter(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
  outPoint: [number, number]
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx * dx + dy * dy <= r * r) return false;

  const rad = Math.atan2(dy, dx);
  const sinr = Math.sin(rad);
  const cosr = Math.cos(rad);

  outPoint[0] = x2 - cosr * r;
  outPoint[1] = y2 - sinr * r;

  return true;
}

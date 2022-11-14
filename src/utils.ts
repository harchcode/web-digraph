export function rectIntersect(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number
) {
  return x1 + w1 >= x2 && x1 <= x2 + w2 && y1 + h1 >= y2 && y1 <= y2 + h2;
}

export function isLineInsideRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
) {
  return (
    x1 >= rx &&
    x1 <= rx + rw &&
    x2 >= rx &&
    x2 <= rx + rw &&
    y1 >= ry &&
    y1 <= ry + rh &&
    y2 >= ry &&
    y1 <= ry + rh
  );
}

// Ref: http://paulbourke.net/geometry/pointlineplane/javascript.txt
export function lineIntersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  outPoint?: [number, number]
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

  if (outPoint) {
    // Return a object with the x and y coordinates of the intersection
    outPoint[0] = x1 + ua * (x2 - x1);
    outPoint[1] = y1 + ua * (y2 - y1);
  }

  return true;
}

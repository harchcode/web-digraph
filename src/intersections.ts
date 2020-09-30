export function intersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): false | [number, number] {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false;
  }

  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Lines are parallel
  if (denominator === 0) {
    return false;
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false;
  }

  // Return a object with the x and y coordinates of the intersection
  const x = x1 + ua * (x2 - x1);
  const y = y1 + ua * (y2 - y1);

  return [x, y];
}

export function intersectLineRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  w: number,
  h: number
): false | [number, number] {
  const wh = w * 0.5;
  const hh = h * 0.5;

  const i1 = intersect(x1, y1, x2, y2, x3 - wh, y3 - hh, x3 + wh, y3 - hh);

  if (i1) return i1;

  const i2 = intersect(x1, y1, x2, y2, x3 + wh, y3 - hh, x3 + wh, y3 + hh);

  if (i2) return i2;

  const i3 = intersect(x1, y1, x2, y2, x3 + wh, y3 + hh, x3 - wh, y3 + hh);

  if (i3) return i3;

  const i4 = intersect(x1, y1, x2, y2, x3 - wh, y3 + hh, x3 - wh, y3 - hh);

  if (i4) return i4;

  return false;
}

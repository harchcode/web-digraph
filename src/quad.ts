// A custom, incorrect Quad Tree implementation

import { rectIntersect } from "./utils";

const MAX_DEPTH = 8;
const DATA_PER_CHILD = 4;

export type QuadData<T> = {
  value: T;
  x: number;
  y: number;
  w: number;
  h: number;
};

export class Quad<T> {
  data: QuadData<T>[];
  children: Quad<T>[];
  x: number;
  y: number;
  w: number;
  h: number;

  constructor(x: number, y: number, w: number, h: number) {
    this.data = [];
    this.children = [];
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  clear() {
    _clear(this);
  }

  insert(value: T, x: number, y: number, w: number, h: number) {
    _insert(this, { value, x, y, w, h }, 0);
  }

  remove(value: T, x: number, y: number, w: number, h: number) {
    _remove(this, value, x, y, w, h);
  }

  getDataInRegion(x: number, y: number, w: number, h: number, out: Set<T>) {
    out.clear();

    _getDataInRegion(this, x, y, w, h, out);
  }
}

function _clear(node: Quad<unknown>) {
  node.data.length = 0;

  for (const child of node.children) {
    _clear(child);
  }
}

function _remove(
  node: Quad<unknown>,
  value: unknown,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // if not intersecting, return
  if (!rectIntersect(node.x, node.y, node.w, node.h, x, y, w, h)) return;

  for (let i = 0; i < node.data.length; i++) {
    if (node.data[i].value === value) {
      node.data.splice(i, 1);
      return;
    }
  }

  for (const child of node.children) {
    _remove(child, value, x, y, w, h);
  }
}

function _insert(node: Quad<unknown>, data: QuadData<unknown>, depth: number) {
  if (depth > MAX_DEPTH) return;

  // if not intersecting, return
  if (
    !rectIntersect(
      node.x,
      node.y,
      node.w,
      node.h,
      data.x,
      data.y,
      data.w,
      data.h
    )
  )
    return;

  // if no children and data size is smaller than the limit, insert data to the node
  if (
    depth === MAX_DEPTH ||
    (node.children.length === 0 && node.data.length < DATA_PER_CHILD)
  ) {
    node.data.push(data);
    return;
  }

  const dataToInsert: QuadData<unknown>[] = [];

  // if no children, create the children
  if (node.children.length === 0 && node.data.length >= DATA_PER_CHILD) {
    const hw = node.w * 0.5;
    const hh = node.h * 0.5;

    const tl = new Quad(node.x, node.y, hw, hh);
    const tr = new Quad(node.x + hw, node.y, hw, hh);
    const bl = new Quad(node.x, node.y + hh, hw, hh);
    const br = new Quad(node.x + hw, node.y + hh, hw, hh);

    node.children.push(tl);
    node.children.push(tr);
    node.children.push(bl);
    node.children.push(br);

    for (const dt of node.data) dataToInsert.push(dt);
  }

  dataToInsert.push(data);

  node.data = [];

  for (let i = 0; i < 4; i++) {
    for (const dt of dataToInsert) _insert(node.children[i], dt, depth + 1);
  }
}

function _getDataInRegion(
  node: Quad<unknown>,
  x: number,
  y: number,
  w: number,
  h: number,
  hs: Set<unknown>
) {
  if (!rectIntersect(node.x, node.y, node.w, node.h, x, y, w, h)) return;

  for (const data of node.data) {
    hs.add(data.value);
  }

  for (const child of node.children) {
    _getDataInRegion(child, x, y, w, h, hs);
  }
}

export function createQuad<T>(x: number, y: number, w: number, h: number) {
  return new Quad<T>(x, y, w, h);
}

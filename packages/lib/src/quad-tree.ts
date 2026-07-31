export type GetBBoxFn = (id: number, outBBox: Float32Array) => void;

// Stride for the tree nodes: 8 slots (32 bytes)
const STRIDE = 8;
const MIN_X = 0;
const MIN_Y = 1;
const MAX_X = 2;
const MAX_Y = 3;
const FIRST_CHILD = 4; // Index of the first child node. -1 if leaf.
const ITEM_START = 5; // Start index in itemIds array.
const ITEM_COUNT = 6; // Number of items in this node.

export class QuadTree {
  public treeBuffer: Float32Array;
  public treeIntBuffer: Int32Array;
  public itemIds: Int32Array;

  private maxDepth: number;
  private capacity: number;
  private nextNodeIdx: number = 0;
  private outBBox: Float32Array = new Float32Array(4);

  private searchResult: Int32Array;
  private searchCount: number = 0;

  constructor(maxItems: number, maxDepth = 10, capacity = 10) {
    this.maxDepth = maxDepth;
    this.capacity = capacity;

    // Allocate enough nodes. A quad tree has roughly 4/3 * (maxItems / capacity) nodes.
    // We allocate plenty of headroom to prevent out-of-bounds.
    const maxNodes = Math.max(1000, Math.ceil((maxItems / capacity) * 4));

    const buffer = new ArrayBuffer(maxNodes * STRIDE * 4);
    this.treeBuffer = new Float32Array(buffer);
    this.treeIntBuffer = new Int32Array(buffer);

    this.itemIds = new Int32Array(maxItems);
    this.searchResult = new Int32Array(maxItems);
  }

  public build(items: Int32Array | number[], getBBox: GetBBoxFn): void {
    const count = items.length;
    if (count === 0) {
      this.nextNodeIdx = 0;
      return;
    }

    // 1. Calculate global bounds
    let globalMinX = Infinity;
    let globalMinY = Infinity;
    let globalMaxX = -Infinity;
    let globalMaxY = -Infinity;

    for (let i = 0; i < count; i++) {
      const id = items[i];
      this.itemIds[i] = id;

      getBBox(id, this.outBBox);
      const ix = this.outBBox[0];
      const iy = this.outBBox[1];
      const iMx = this.outBBox[2];
      const iMy = this.outBBox[3];

      if (ix < globalMinX) globalMinX = ix;
      if (iy < globalMinY) globalMinY = iy;
      if (iMx > globalMaxX) globalMaxX = iMx;
      if (iMy > globalMaxY) globalMaxY = iMy;
    }

    // Add tiny padding to global bounds
    globalMinX -= 0.1;
    globalMinY -= 0.1;
    globalMaxX += 0.1;
    globalMaxY += 0.1;

    this.nextNodeIdx = 1; // Root is index 0
    this._buildNodeAt(
      0,
      0,
      count,
      globalMinX,
      globalMinY,
      globalMaxX,
      globalMaxY,
      0,
      getBBox
    );
  }

  private _buildNodeAt(
    nodeIdx: number,
    startIdx: number,
    count: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    depth: number,
    getBBox: GetBBoxFn
  ): void {
    const offset = nodeIdx * STRIDE;

    this.treeBuffer[offset + MIN_X] = minX;
    this.treeBuffer[offset + MIN_Y] = minY;
    this.treeBuffer[offset + MAX_X] = maxX;
    this.treeBuffer[offset + MAX_Y] = maxY;
    this.treeIntBuffer[offset + FIRST_CHILD] = -1;

    if (count <= this.capacity || depth >= this.maxDepth) {
      this.treeIntBuffer[offset + ITEM_START] = startIdx;
      this.treeIntBuffer[offset + ITEM_COUNT] = count;
      return;
    }

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    // Pass 1: Separate Straddle from the rest
    let head = startIdx;
    let tail = startIdx + count - 1;
    while (head <= tail) {
      const id = this.itemIds[head];
      getBBox(id, this.outBBox);

      const fitsTL = this.outBBox[2] < midX && this.outBBox[3] < midY;
      const fitsTR = this.outBBox[0] >= midX && this.outBBox[3] < midY;
      const fitsBL = this.outBBox[2] < midX && this.outBBox[1] >= midY;
      const fitsBR = this.outBBox[0] >= midX && this.outBBox[1] >= midY;

      if (!fitsTL && !fitsTR && !fitsBL && !fitsBR) {
        head++; // It's a straddle, leave it at the head
      } else {
        // Swap to tail
        const temp = this.itemIds[tail];
        this.itemIds[tail] = id;
        this.itemIds[head] = temp;
        tail--;
      }
    }

    const straddleStart = startIdx;
    const straddleCount = head - startIdx;

    this.treeIntBuffer[offset + ITEM_START] = straddleStart;
    this.treeIntBuffer[offset + ITEM_COUNT] = straddleCount;

    // Pass 2: Partition TL vs Rest
    let cur = head;
    tail = startIdx + count - 1;
    while (cur <= tail) {
      const id = this.itemIds[cur];
      getBBox(id, this.outBBox);
      if (this.outBBox[2] < midX && this.outBBox[3] < midY) {
        cur++;
      } else {
        const temp = this.itemIds[tail];
        this.itemIds[tail] = id;
        this.itemIds[cur] = temp;
        tail--;
      }
    }
    const tlStart = head;
    const tlCount = cur - head;

    // Pass 3: Partition TR vs Rest (BL, BR)
    head = cur;
    tail = startIdx + count - 1;
    while (cur <= tail) {
      const id = this.itemIds[cur];
      getBBox(id, this.outBBox);
      if (this.outBBox[0] >= midX && this.outBBox[3] < midY) {
        cur++;
      } else {
        const temp = this.itemIds[tail];
        this.itemIds[tail] = id;
        this.itemIds[cur] = temp;
        tail--;
      }
    }
    const trStart = head;
    const trCount = cur - head;

    // Pass 4: Partition BL vs BR
    head = cur;
    tail = startIdx + count - 1;
    while (cur <= tail) {
      const id = this.itemIds[cur];
      getBBox(id, this.outBBox);
      if (this.outBBox[2] < midX && this.outBBox[1] >= midY) {
        cur++;
      } else {
        const temp = this.itemIds[tail];
        this.itemIds[tail] = id;
        this.itemIds[cur] = temp;
        tail--;
      }
    }
    const blStart = head;
    const blCount = cur - head;

    const brStart = cur;
    const brCount = startIdx + count - cur;

    // Allocate 4 contiguous children
    const firstChildIdx = this.nextNodeIdx;

    // Dynamic resizing check
    if ((firstChildIdx + 4) * STRIDE >= this.treeBuffer.length) {
      // Reallocate buffers
      const newSize = this.treeBuffer.length * 2;
      const newBuffer = new ArrayBuffer(newSize * 4);
      const newTreeBuffer = new Float32Array(newBuffer);
      const newTreeIntBuffer = new Int32Array(newBuffer);
      newTreeBuffer.set(this.treeBuffer);
      this.treeBuffer = newTreeBuffer;
      this.treeIntBuffer = newTreeIntBuffer;
    }

    this.treeIntBuffer[offset + FIRST_CHILD] = firstChildIdx;
    this.nextNodeIdx += 4;

    this._buildNodeAt(
      firstChildIdx,
      tlStart,
      tlCount,
      minX,
      minY,
      midX,
      midY,
      depth + 1,
      getBBox
    );
    this._buildNodeAt(
      firstChildIdx + 1,
      trStart,
      trCount,
      midX,
      minY,
      maxX,
      midY,
      depth + 1,
      getBBox
    );
    this._buildNodeAt(
      firstChildIdx + 2,
      blStart,
      blCount,
      minX,
      midY,
      midX,
      maxY,
      depth + 1,
      getBBox
    );
    this._buildNodeAt(
      firstChildIdx + 3,
      brStart,
      brCount,
      midX,
      midY,
      maxX,
      maxY,
      depth + 1,
      getBBox
    );
  }

  public search(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): Int32Array {
    this.searchCount = 0;
    if (this.nextNodeIdx > 0) {
      this._searchNode(0, minX, minY, maxX, maxY);
    }
    return this.searchResult.subarray(0, this.searchCount);
  }

  private _searchNode(
    nodeIdx: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const offset = nodeIdx * STRIDE;

    const nMinX = this.treeBuffer[offset + MIN_X];
    const nMinY = this.treeBuffer[offset + MIN_Y];
    const nMaxX = this.treeBuffer[offset + MAX_X];
    const nMaxY = this.treeBuffer[offset + MAX_Y];

    if (maxX < nMinX || minX > nMaxX || maxY < nMinY || minY > nMaxY) {
      return;
    }

    const start = this.treeIntBuffer[offset + ITEM_START];
    const count = this.treeIntBuffer[offset + ITEM_COUNT];

    for (let i = 0; i < count; i++) {
      this.searchResult[this.searchCount++] = this.itemIds[start + i];
    }

    const firstChildIdx = this.treeIntBuffer[offset + FIRST_CHILD];
    if (firstChildIdx !== -1) {
      this._searchNode(firstChildIdx, minX, minY, maxX, maxY);
      this._searchNode(firstChildIdx + 1, minX, minY, maxX, maxY);
      this._searchNode(firstChildIdx + 2, minX, minY, maxX, maxY);
      this._searchNode(firstChildIdx + 3, minX, minY, maxX, maxY);
    }
  }
}

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

export function createQuadTree(maxItems: number, maxDepth = 10, capacity = 10) {
  const maxNodes = Math.max(1000, Math.ceil((maxItems / capacity) * 4));

  let treeBuffer = new Float32Array(maxNodes * STRIDE);
  let treeIntBuffer = new Int32Array(treeBuffer.buffer);

  const itemIds = new Int32Array(maxItems);
  const searchResult = new Int32Array(maxItems);

  let nextNodeIdx = 0;
  let searchCount = 0;
  const outBBox = new Float32Array(4);

  function build(
    items: Int32Array | number,
    getBBox: GetBBoxFn,
    globalMinX: number,
    globalMinY: number,
    globalMaxX: number,
    globalMaxY: number
  ): void {
    const count = typeof items === "number" ? items : items.length;
    if (count === 0) {
      nextNodeIdx = 0;
      return;
    }

    if (typeof items === "number") {
      // Auto-fill dense IDs from 0 to count - 1
      for (let i = 0; i < count; i++) {
        itemIds[i] = i;
      }
    } else {
      // Ultra-fast memcpy for sparse/filtered arrays
      itemIds.set(items);
    }

    // Add tiny padding to global bounds
    globalMinX -= 0.1;
    globalMinY -= 0.1;
    globalMaxX += 0.1;
    globalMaxY += 0.1;

    nextNodeIdx = 1; // Root is index 0
    _buildNodeAt(
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

  function _buildNodeAt(
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

    treeBuffer[offset + MIN_X] = minX;
    treeBuffer[offset + MIN_Y] = minY;
    treeBuffer[offset + MAX_X] = maxX;
    treeBuffer[offset + MAX_Y] = maxY;
    treeIntBuffer[offset + FIRST_CHILD] = -1;

    if (count <= capacity || depth >= maxDepth) {
      treeIntBuffer[offset + ITEM_START] = startIdx;
      treeIntBuffer[offset + ITEM_COUNT] = count;
      return;
    }

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    // Pass 1: Separate Straddle from the rest
    let head = startIdx;
    let tail = startIdx + count - 1;
    while (head <= tail) {
      const id = itemIds[head];
      getBBox(id, outBBox);

      const fitsTL = outBBox[2] < midX && outBBox[3] < midY;
      const fitsTR = outBBox[0] >= midX && outBBox[3] < midY;
      const fitsBL = outBBox[2] < midX && outBBox[1] >= midY;
      const fitsBR = outBBox[0] >= midX && outBBox[1] >= midY;

      if (!fitsTL && !fitsTR && !fitsBL && !fitsBR) {
        head++; // It's a straddle, leave it at the head
      } else {
        // Swap to tail
        const temp = itemIds[tail];
        itemIds[tail] = id;
        itemIds[head] = temp;
        tail--;
      }
    }

    const straddleStart = startIdx;
    const straddleCount = head - startIdx;

    treeIntBuffer[offset + ITEM_START] = straddleStart;
    treeIntBuffer[offset + ITEM_COUNT] = straddleCount;

    // Pass 2: Partition TL vs Rest
    let cur = head;
    tail = startIdx + count - 1;
    while (cur <= tail) {
      const id = itemIds[cur];
      getBBox(id, outBBox);
      if (outBBox[2] < midX && outBBox[3] < midY) {
        cur++;
      } else {
        const temp = itemIds[tail];
        itemIds[tail] = id;
        itemIds[cur] = temp;
        tail--;
      }
    }
    const tlStart = head;
    const tlCount = cur - head;

    // Pass 3: Partition TR vs Rest (BL, BR)
    head = cur;
    tail = startIdx + count - 1;
    while (cur <= tail) {
      const id = itemIds[cur];
      getBBox(id, outBBox);
      if (outBBox[0] >= midX && outBBox[3] < midY) {
        cur++;
      } else {
        const temp = itemIds[tail];
        itemIds[tail] = id;
        itemIds[cur] = temp;
        tail--;
      }
    }
    const trStart = head;
    const trCount = cur - head;

    // Pass 4: Partition BL vs BR
    head = cur;
    tail = startIdx + count - 1;
    while (cur <= tail) {
      const id = itemIds[cur];
      getBBox(id, outBBox);
      if (outBBox[2] < midX && outBBox[1] >= midY) {
        cur++;
      } else {
        const temp = itemIds[tail];
        itemIds[tail] = id;
        itemIds[cur] = temp;
        tail--;
      }
    }
    const blStart = head;
    const blCount = cur - head;

    const brStart = cur;
    const brCount = startIdx + count - cur;

    // Allocate 4 contiguous children
    const firstChildIdx = nextNodeIdx;

    // Dynamic resizing check
    if ((firstChildIdx + 4) * STRIDE >= treeBuffer.length) {
      // Reallocate buffers
      const newSize = treeBuffer.length * 2;
      const newBuffer = new ArrayBuffer(newSize * 4);
      const newTreeBuffer = new Float32Array(newBuffer);
      const newTreeIntBuffer = new Int32Array(newBuffer);
      newTreeBuffer.set(treeBuffer);
      treeBuffer = newTreeBuffer;
      treeIntBuffer = newTreeIntBuffer;
    }

    treeIntBuffer[offset + FIRST_CHILD] = firstChildIdx;
    nextNodeIdx += 4;

    _buildNodeAt(
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
    _buildNodeAt(
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
    _buildNodeAt(
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
    _buildNodeAt(
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

  function search(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): Int32Array {
    searchCount = 0;
    if (nextNodeIdx > 0) {
      _searchNode(0, minX, minY, maxX, maxY);
    }
    return searchResult.subarray(0, searchCount);
  }

  function _searchNode(
    nodeIdx: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const offset = nodeIdx * STRIDE;

    const nMinX = treeBuffer[offset + MIN_X];
    const nMinY = treeBuffer[offset + MIN_Y];
    const nMaxX = treeBuffer[offset + MAX_X];
    const nMaxY = treeBuffer[offset + MAX_Y];

    if (maxX < nMinX || minX > nMaxX || maxY < nMinY || minY > nMaxY) {
      return;
    }

    const start = treeIntBuffer[offset + ITEM_START];
    const count = treeIntBuffer[offset + ITEM_COUNT];

    for (let i = 0; i < count; i++) {
      searchResult[searchCount++] = itemIds[start + i];
    }

    const firstChildIdx = treeIntBuffer[offset + FIRST_CHILD];
    if (firstChildIdx !== -1) {
      _searchNode(firstChildIdx, minX, minY, maxX, maxY);
      _searchNode(firstChildIdx + 1, minX, minY, maxX, maxY);
      _searchNode(firstChildIdx + 2, minX, minY, maxX, maxY);
      _searchNode(firstChildIdx + 3, minX, minY, maxX, maxY);
    }
  }

  return {
    build,
    search
  };
}

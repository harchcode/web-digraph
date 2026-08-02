export function createQuadTree2(
  maxItems: number,
  getBBox: (id: number, out: Float32Array) => void,
  maxDepth = 16,
  capacity = 50
) {
  // Allocate memory for tree cells. maxItems * 2 is a safe upper bound.
  const MAX_CELLS = Math.max(100000, maxItems * 2);
  const cellBounds = new Float32Array(MAX_CELLS * 4); // minX, minY, maxX, maxY
  const cellHeads = new Int32Array(MAX_CELLS); // head of linked list
  const cellCounts = new Int32Array(MAX_CELLS); // number of items
  const cellFirstChild = new Int32Array(MAX_CELLS); // index of first child (4 contiguous children)

  // Allocate memory for items
  const nextNodeId = new Int32Array(maxItems); // linked list next pointer for each item
  const bboxCache = new Float32Array(maxItems * 4); // cache the AABB of each item
  const searchResult = new Uint32Array(maxItems);

  let cellCount = 0;

  function allocCell(minX: number, minY: number, maxX: number, maxY: number): number {
    if (cellCount >= MAX_CELLS) return -1; // Out of memory
    const id = cellCount++;
    cellBounds[id * 4 + 0] = minX;
    cellBounds[id * 4 + 1] = minY;
    cellBounds[id * 4 + 2] = maxX;
    cellBounds[id * 4 + 3] = maxY;
    cellHeads[id] = -1;
    cellCounts[id] = 0;
    cellFirstChild[id] = -1;
    cellFirstChild[id] = -1;
    return id;
  }

  // Initialize root
  allocCell(-1000000, -1000000, 1000000, 1000000);

  function _insert(cellIdx: number, itemId: number, depth: number) {
    if (cellIdx === -1) return;

    const minX = bboxCache[itemId * 4 + 0];
    const minY = bboxCache[itemId * 4 + 1];
    const maxX = bboxCache[itemId * 4 + 2];
    const maxY = bboxCache[itemId * 4 + 3];

    // If this cell has children, see if it fits entirely in one child
    if (cellFirstChild[cellIdx] !== -1) {
      const child0 = cellFirstChild[cellIdx];
      let straddles = true;
      let targetChild = -1;

      for (let i = 0; i < 4; i++) {
        const cId = child0 + i;
        const cMinX = cellBounds[cId * 4 + 0];
        const cMinY = cellBounds[cId * 4 + 1];
        const cMaxX = cellBounds[cId * 4 + 2];
        const cMaxY = cellBounds[cId * 4 + 3];

        if (minX >= cMinX && maxX <= cMaxX && minY >= cMinY && maxY <= cMaxY) {
          straddles = false;
          targetChild = cId;
          break;
        }
      }

      if (!straddles && targetChild !== -1) {
        _insert(targetChild, itemId, depth + 1);
        return;
      }
    }

    // Insert into this cell
    nextNodeId[itemId] = cellHeads[cellIdx];
    cellHeads[cellIdx] = itemId;
    cellCounts[cellIdx]++;

    // Split if needed
    if (
      cellFirstChild[cellIdx] === -1 &&
      cellCounts[cellIdx] > capacity &&
      depth < maxDepth
    ) {
      const cMinX = cellBounds[cellIdx * 4 + 0];
      const cMinY = cellBounds[cellIdx * 4 + 1];
      const cMaxX = cellBounds[cellIdx * 4 + 2];
      const cMaxY = cellBounds[cellIdx * 4 + 3];
      const midX = (cMinX + cMaxX) / 2;
      const midY = (cMinY + cMaxY) / 2;

      const child0 = allocCell(cMinX, cMinY, midX, midY);
      const child1 = allocCell(midX, cMinY, cMaxX, midY);
      const child2 = allocCell(cMinX, midY, midX, cMaxY);
      const child3 = allocCell(midX, midY, cMaxX, cMaxY);

      if (child0 !== -1 && child3 !== -1) {
        cellFirstChild[cellIdx] = child0;

        // Redistribute items
        let curr = cellHeads[cellIdx];
        cellHeads[cellIdx] = -1;
        cellCounts[cellIdx] = 0;

        while (curr !== -1) {
          const next = nextNodeId[curr];
          
          const iMinX = bboxCache[curr * 4 + 0];
          const iMinY = bboxCache[curr * 4 + 1];
          const iMaxX = bboxCache[curr * 4 + 2];
          const iMaxY = bboxCache[curr * 4 + 3];

          let straddles = true;
          let targetChild = -1;
          for (let i = 0; i < 4; i++) {
            const cId = child0 + i;
            if (
              iMinX >= cellBounds[cId * 4 + 0] &&
              iMaxX <= cellBounds[cId * 4 + 2] &&
              iMinY >= cellBounds[cId * 4 + 1] &&
              iMaxY <= cellBounds[cId * 4 + 3]
            ) {
              straddles = false;
              targetChild = cId;
              break;
            }
          }

          if (!straddles && targetChild !== -1) {
            // Put in child
            nextNodeId[curr] = cellHeads[targetChild];
            cellHeads[targetChild] = curr;
            cellCounts[targetChild]++;
          } else {
            // Keep in parent
            nextNodeId[curr] = cellHeads[cellIdx];
            cellHeads[cellIdx] = curr;
            cellCounts[cellIdx]++;
          }

          curr = next;
        }
      }
    }
  }

  const sharedView = new Float32Array(4);

  function insert(itemId: number) {
    getBBox(itemId, sharedView);
    if (Number.isNaN(sharedView[0])) return;
    const offset = itemId * 4;
    bboxCache[offset + 0] = sharedView[0];
    bboxCache[offset + 1] = sharedView[1];
    bboxCache[offset + 2] = sharedView[2];
    bboxCache[offset + 3] = sharedView[3];
    _insert(0, itemId, 0);
  }

  function remove(itemId: number) {
    let cellIdx = 0;
    const minX = bboxCache[itemId * 4 + 0];
    const minY = bboxCache[itemId * 4 + 1];
    const maxX = bboxCache[itemId * 4 + 2];
    const maxY = bboxCache[itemId * 4 + 3];

    while (cellFirstChild[cellIdx] !== -1) {
      const child0 = cellFirstChild[cellIdx];
      let straddles = true;
      let targetChild = -1;

      for (let i = 0; i < 4; i++) {
        const cId = child0 + i;
        if (
          minX >= cellBounds[cId * 4 + 0] &&
          maxX <= cellBounds[cId * 4 + 2] &&
          minY >= cellBounds[cId * 4 + 1] &&
          maxY <= cellBounds[cId * 4 + 3]
        ) {
          straddles = false;
          targetChild = cId;
          break;
        }
      }

      if (!straddles && targetChild !== -1) {
        cellIdx = targetChild;
      } else {
        break;
      }
    }

    let prev = -1;
    let curr = cellHeads[cellIdx];
    while (curr !== -1) {
      if (curr === itemId) {
        if (prev === -1) {
          cellHeads[cellIdx] = nextNodeId[curr];
        } else {
          nextNodeId[prev] = nextNodeId[curr];
        }
        cellCounts[cellIdx]--;
        break;
      }
      prev = curr;
      curr = nextNodeId[curr];
    }
  }

  function update(itemId: number) {
    remove(itemId);
    insert(itemId);
  }

  function clear() {
    cellCount = 0;
    allocCell(-1000000, -1000000, 1000000, 1000000);
  }

  let searchCount = 0;

  function _searchNode(
    cellIdx: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    if (cellIdx === -1) return;

    // Check intersection with cell
    const cMinX = cellBounds[cellIdx * 4 + 0];
    const cMinY = cellBounds[cellIdx * 4 + 1];
    const cMaxX = cellBounds[cellIdx * 4 + 2];
    const cMaxY = cellBounds[cellIdx * 4 + 3];

    if (maxX < cMinX || minX > cMaxX || maxY < cMinY || minY > cMaxY) {
      return;
    }

    // Check items in this cell
    let curr = cellHeads[cellIdx];
    while (curr !== -1) {
      const offset = curr * 4;
      if (
        bboxCache[offset + 2] >= minX &&
        bboxCache[offset + 0] <= maxX &&
        bboxCache[offset + 3] >= minY &&
        bboxCache[offset + 1] <= maxY
      ) {
        searchResult[searchCount++] = curr;
      }
      curr = nextNodeId[curr];
    }

    // Traverse children
    const child0 = cellFirstChild[cellIdx];
    if (child0 !== -1) {
      _searchNode(child0, minX, minY, maxX, maxY);
      _searchNode(child0 + 1, minX, minY, maxX, maxY);
      _searchNode(child0 + 2, minX, minY, maxX, maxY);
      _searchNode(child0 + 3, minX, minY, maxX, maxY);
    }
  }

  function search(minX: number, minY: number, maxX: number, maxY: number) {
    searchCount = 0;
    _searchNode(0, minX, minY, maxX, maxY);
    return new Uint32Array(searchResult.buffer, 0, searchCount);
  }

  return {
    insert,
    remove,
    update,
    clear,
    search
  };
}

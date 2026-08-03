export function createNodeStore(initialMaxNodes: number) {
  return {
    capacity: initialMaxNodes,
    count: 0,
    x: new Float32Array(initialMaxNodes),
    y: new Float32Array(initialMaxNodes),
    config: new Int32Array(initialMaxNodes), // bit 0-15: shapeId, bit 16: selected, bit 17: dragging
    incomingEdge: new Int32Array(initialMaxNodes).fill(-1),
    outgoingEdge: new Int32Array(initialMaxNodes).fill(-1),

    selected: new Int32Array(initialMaxNodes),
    selectedCount: 0,
    activeDrag: new Int32Array(initialMaxNodes),
    activeDragCount: 0,

    select(id: number) {
      if ((this.config[id] & (1 << 16)) !== 0) return;
      this.config[id] |= 1 << 16;
      this.selected[this.selectedCount++] = id;
    },

    unselect(id?: number) {
      if (id === undefined) {
        for (let i = 0; i < this.selectedCount; i++) {
          this.config[this.selected[i]] &= ~(1 << 16);
        }
        this.selectedCount = 0;
      } else {
        if ((this.config[id] & (1 << 16)) === 0) return;
        this.config[id] &= ~(1 << 16);
        for (let i = 0; i < this.selectedCount; i++) {
          if (this.selected[i] === id) {
            this.selected[i] = this.selected[this.selectedCount - 1];
            this.selectedCount--;
            break;
          }
        }
      }
    },

    setDragging(id: number) {
      if ((this.config[id] & (1 << 17)) !== 0) return;
      this.config[id] |= 1 << 17;
      this.activeDrag[this.activeDragCount++] = id;
    },

    clearDragging(id?: number) {
      if (id === undefined) {
        for (let i = 0; i < this.activeDragCount; i++) {
          this.config[this.activeDrag[i]] &= ~(1 << 17);
        }
        this.activeDragCount = 0;
      } else {
        if ((this.config[id] & (1 << 17)) === 0) return;
        this.config[id] &= ~(1 << 17);
        for (let i = 0; i < this.activeDragCount; i++) {
          if (this.activeDrag[i] === id) {
            this.activeDrag[i] = this.activeDrag[this.activeDragCount - 1];
            this.activeDragCount--;
            break;
          }
        }
      }
    },
    add(x: number, y: number, shapeId: number) {
      if (this.count >= this.capacity) return -1;
      const id = this.count++;
      this.x[id] = x;
      this.y[id] = y;
      this.config[id] = shapeId & 0xffff;
      this.incomingEdge[id] = -1;
      this.outgoingEdge[id] = -1;
      return id;
    },

    remove(id: number) {
      if (id < 0 || id >= this.count) return -1;

      this.unselect(id);
      this.clearDragging(id);

      const lastId = this.count - 1;
      if (id !== lastId) {
        // Swap last item into the deleted slot
        this.x[id] = this.x[lastId];
        this.y[id] = this.y[lastId];
        this.config[id] = this.config[lastId];
        this.incomingEdge[id] = this.incomingEdge[lastId];
        this.outgoingEdge[id] = this.outgoingEdge[lastId];

        // Update selected tracking
        if ((this.config[lastId] & (1 << 16)) !== 0) {
          for (let i = 0; i < this.selectedCount; i++) {
            if (this.selected[i] === lastId) {
              this.selected[i] = id;
              break;
            }
          }
        }
        // Update drag tracking
        if ((this.config[lastId] & (1 << 17)) !== 0) {
          for (let i = 0; i < this.activeDragCount; i++) {
            if (this.activeDrag[i] === lastId) {
              this.activeDrag[i] = id;
              break;
            }
          }
        }
      }
      this.count--;
      return lastId; // return the id of the node that got moved to 'id', so we can fix up pointers
    },

    resize(newCapacity: number) {
      if (newCapacity <= this.capacity) return;

      const newX = new Float32Array(newCapacity);
      newX.set(this.x);
      this.x = newX;

      const newY = new Float32Array(newCapacity);
      newY.set(this.y);
      this.y = newY;

      const newConfig = new Int32Array(newCapacity);
      newConfig.set(this.config);
      this.config = newConfig;

      const newIncomingEdge = new Int32Array(newCapacity).fill(-1);
      newIncomingEdge.set(this.incomingEdge);
      this.incomingEdge = newIncomingEdge;

      const newOutgoingEdge = new Int32Array(newCapacity).fill(-1);
      newOutgoingEdge.set(this.outgoingEdge);
      this.outgoingEdge = newOutgoingEdge;

      const newSelected = new Int32Array(newCapacity);
      newSelected.set(this.selected);
      this.selected = newSelected;

      const newActiveDrag = new Int32Array(newCapacity);
      newActiveDrag.set(this.activeDrag);
      this.activeDrag = newActiveDrag;

      this.capacity = newCapacity;
    }
  };
}

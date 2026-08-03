export function createEdgeStore(initialMaxEdges: number) {
  return {
    capacity: initialMaxEdges,
    count: 0,
    source: new Int32Array(initialMaxEdges),
    target: new Int32Array(initialMaxEdges),
    config: new Int32Array(initialMaxEdges), // bit 0-15: shapeId, bit 16: selected
    tx: new Float32Array(initialMaxEdges),
    ty: new Float32Array(initialMaxEdges),
    nextIncomingEdge: new Int32Array(initialMaxEdges).fill(-1),
    nextOutgoingEdge: new Int32Array(initialMaxEdges).fill(-1),
    
    selected: new Int32Array(initialMaxEdges),
    selectedCount: 0,
    activeDrag: new Int32Array(initialMaxEdges),
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

    add(sourceId: number, targetId: number, shapeId: number) {
      if (this.count >= this.capacity) return -1;
      const id = this.count++;
      this.source[id] = sourceId;
      this.target[id] = targetId;
      this.config[id] = shapeId & 0xffff;
      this.tx[id] = 0;
      this.ty[id] = 0;
      this.nextIncomingEdge[id] = -1;
      this.nextOutgoingEdge[id] = -1;
      return id;
    },

    remove(id: number) {
      if (id < 0 || id >= this.count) return -1;
      
      this.unselect(id);
      this.clearDragging(id);

      const lastId = this.count - 1;
      if (id !== lastId) {
        // Swap last item into the deleted slot
        this.source[id] = this.source[lastId];
        this.target[id] = this.target[lastId];
        this.config[id] = this.config[lastId];
        this.tx[id] = this.tx[lastId];
        this.ty[id] = this.ty[lastId];
        this.nextIncomingEdge[id] = this.nextIncomingEdge[lastId];
        this.nextOutgoingEdge[id] = this.nextOutgoingEdge[lastId];

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
      return lastId; // return the id of the edge that got moved to 'id', so we can fix up pointers
    },

    resize(newCapacity: number) {
      if (newCapacity <= this.capacity) return;

      const newSource = new Int32Array(newCapacity);
      newSource.set(this.source);
      this.source = newSource;

      const newTarget = new Int32Array(newCapacity);
      newTarget.set(this.target);
      this.target = newTarget;

      const newConfig = new Int32Array(newCapacity);
      newConfig.set(this.config);
      this.config = newConfig;

      const newTx = new Float32Array(newCapacity);
      newTx.set(this.tx);
      this.tx = newTx;

      const newTy = new Float32Array(newCapacity);
      newTy.set(this.ty);
      this.ty = newTy;

      const newNextIncomingEdge = new Int32Array(newCapacity).fill(-1);
      newNextIncomingEdge.set(this.nextIncomingEdge);
      this.nextIncomingEdge = newNextIncomingEdge;

      const newNextOutgoingEdge = new Int32Array(newCapacity).fill(-1);
      newNextOutgoingEdge.set(this.nextOutgoingEdge);
      this.nextOutgoingEdge = newNextOutgoingEdge;

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

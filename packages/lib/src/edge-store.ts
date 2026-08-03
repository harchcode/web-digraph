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

      this.capacity = newCapacity;
    }
  };
}

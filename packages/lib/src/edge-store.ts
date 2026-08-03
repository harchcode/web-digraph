export function createEdgeStore(maxEdges: number) {
  return {
    count: 0,
    source: new Int32Array(maxEdges),
    target: new Int32Array(maxEdges),
    config: new Int32Array(maxEdges), // bit 0-15: shapeId, bit 16: selected
    tx: new Float32Array(maxEdges),
    ty: new Float32Array(maxEdges),
    nextIncomingEdge: new Int32Array(maxEdges).fill(-1),
    nextOutgoingEdge: new Int32Array(maxEdges).fill(-1),

    add(sourceId: number, targetId: number, shapeId: number) {
      if (this.count >= maxEdges) return -1;
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
    }
  };
}

export function createNodeStore(maxNodes: number) {
  return {
    count: 0,
    x: new Float32Array(maxNodes),
    y: new Float32Array(maxNodes),
    config: new Int32Array(maxNodes), // bit 0-15: shapeId, bit 16: selected, bit 17: dragging
    incomingEdge: new Int32Array(maxNodes).fill(-1),
    outgoingEdge: new Int32Array(maxNodes).fill(-1),
    
    add(x: number, y: number, shapeId: number) {
      if (this.count >= maxNodes) return -1;
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
      const lastId = this.count - 1;
      if (id !== lastId) {
        // Swap last item into the deleted slot
        this.x[id] = this.x[lastId];
        this.y[id] = this.y[lastId];
        this.config[id] = this.config[lastId];
        this.incomingEdge[id] = this.incomingEdge[lastId];
        this.outgoingEdge[id] = this.outgoingEdge[lastId];
      }
      this.count--;
      return lastId; // return the id of the node that got moved to 'id', so we can fix up pointers
    }
  };
}

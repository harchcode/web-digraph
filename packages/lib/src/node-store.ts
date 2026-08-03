export function createNodeStore(initialMaxNodes: number) {
  return {
    capacity: initialMaxNodes,
    count: 0,
    x: new Float32Array(initialMaxNodes),
    y: new Float32Array(initialMaxNodes),
    config: new Int32Array(initialMaxNodes), // bit 0-15: shapeId, bit 16: selected, bit 17: dragging
    incomingEdge: new Int32Array(initialMaxNodes).fill(-1),
    outgoingEdge: new Int32Array(initialMaxNodes).fill(-1),
    
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

      this.capacity = newCapacity;
    }
  };
}

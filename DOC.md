# Web Digraph

A library to for rendering a Directed Graph (DG). Note that this is just made for rendering. The data structure is adjusted to make it easy to render, and the node and edge don't store additional information specific to your use-case, so it is a good practice maintain your own structure for the use-case, and use the library just for rendering.

## Tech Spec

- Full Typescript, no JS
- Usability, smoothness, render performance, and package size are the top priority
- Use Canvas for rendering.
- Touch input supported.
- Imperative style API (yes, this is a feature).
- Draw only what is visible on screen
- Do not use unlimited canvas size, limit canvas size (for better optimization)
- Use a Spatial Hash Grid to optimize hit detection and knowing which nodes/edges to draw (much better for edges than a Quad Tree).
- Explore the possibility of using Web Worker to offload all rendering (maybe offscreencanvas?) and processing to another thread. (Note: Recommend keeping on main thread initially to prevent input latency during drags).
- Edges should be Orthogonal (horizontal/vertical). This vastly simplifies hit detection and bounding box math.
- For arrows connecting to nodes, use explicit Connection Ports (top, bottom, left, right) on the shape. Because edges are orthogonal, boundary intersection requires zero complex math (no `isPointInPath` needed).
- When idle, should not do anything (render loop should only happen when need rendering like moving node around etc)
- Use a single Canvas layer for nodes and edges to avoid browser compositing overhead. If needed later, a separate canvas can be added just for the static background grid.
- Use batching. All operations wont be redrawn until `flush` is called.

## Types

```
// type Pos: (x: float, y: float)
// type Size: (w: float, y: float)
// type Rect: (x: float, y: float, w: float, h: float)

type GraphShape:
  w: float
  h: float
  createPath: (x, y, w, h, id) => Path2D
  drawContent: (ctx, x, y, w, h, id) => void

type GraphNode:
  id: uint
  x: float
  y: float
  shape: GraphShape
  path: Path2D

type GraphEdge:
  id: uint
  source: GraphNode
  target: GraphNode
  shape: GraphShape
  path: Path2D

type GraphItem: GraphNode | GraphEdge

type GraphRenderer:
  nodes: Record<uint, GraphNode>
  edges: Record<uint, GraphEdge>

  mount: (el: HTMLElement) => void
  addNode: (x, y, shape) => uint
  addEdge: (sourceId, targetId, shape) => uint
  moveNodeTo: (id, x, y) => void
  moveNodeBy: (id, dx, dy) => void
  removeItem: (id) => void
  removeNode: (id) => void
  removeEdge: (id) => void
  clear: () => void // clear everything
  unselect: (ids?: uint[]) => void // remove selection. Is no id specified, then clear selection
  select: (ids: uint[]) => void // append selection, not removing existing selection
  zoomTo: (value, targetX?, targetY?) => void // zoom to the target value, centered on targetX and targetY if given
  zoomBy: (dv, targetX?, targetY?) => void
  moveTo: (x, y) => void;
  moveBy: (dx, dy) => void;
  screenToGraph: (x, y) => Pos // Convert DOM coordinates to graph space
  graphToScreen: (x, y) => Pos // Convert graph space to DOM coordinates
  flush: () => void // update and redraw all the changes

  beginDragNode(id: uint) => void // start moving node around, this wont update the actual node position until endDragNode is called
  endDragNode() => [float, float] // end the node(s) dragging and return final node position (can be used to update the actual node position)
  beginDragEdge(sourceId: uint) => void // start dragging an edge from source node. This wont create an edge until endDragLine is called
  endDragEdge() => targetId? // end the edge dragging, and return the target node id if exist (can be used to create the actual edge)
```

## API

### `createGraphRenderer(options)`

Create the Digraph renderer instance

### `createShape(shape?: Partial<GraphShape>): GraphShape`

Create the shape by overriding default param.

## Example

We will create an example app, showing the graph editor full screen, with these functionalities:

- button to auto-generate specified number of nodes and edges
- button to toggle create mode. In this mode every click will add new node, dragging from node will create new edge
- button to toggle move mode. In this mode, click will select node, dragging will move node.
- Keyboard shortcut holding shift for create mode if move mode is currently selected, and vice versa.
- Slider for zoom in/out.
- Pinch for zooming.
- Export/Import

## Repo

- Use pnpm workspace for monorepo
- Use vite

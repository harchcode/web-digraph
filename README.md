# web-digraph

> A library to render a simple directed graph editor. See the demo at [https://web-digraph.hulahula.dev/](https://web-digraph.hulahula.dev/).

## Overview

This is a library for creating a simple directed graph. It was heavily inspired by [react-digraph](https://github.com/uber/react-digraph), but with less features, less polished, and less everything. However, it uses canvas instead of svg for rendering, giving much better performance, and have mobile/touchscreen support. Also, it is not using react, because we love imperative things. React is for the weak! (just kidding xD). The bundle size is also really small with no external dependencies, which is one thing I don't like the most about react-digraph.

Note that this is just a renderer, not something that you should use to store your actual node/edge data. Your actual data should live separately from this renderer.

## Features

- Built with TypeScript.
- Small size (~8KB minified and gzipped, compared to `react-digraph` ~100KB minified and gzipped).
- Imperative API (yes, this is a feature).
- Touch input support.

## Installation

```bash
npm install --save web-digraph
```

## Note about the versioning

I admit, i made a grave mistake. I released v1, then years later, i remake it. I updated to v2 because there are many breaking changes. V1 and v2 were not really tested extensively. So now shortly after v2, i have ideas to improve it more, with breaking changes again.. But now I will not make the same mistake. I will just call the current version v3 alpha, and deprecate v1 and v2. So if i want to break things again, i can just call it v3 alpha 1, alpha 2, and so on. Absolutely no one is using this library yet anyway, so I think it is fine to just break things.

Changes from v2 to v3:

- Restructured memory into a Structure of Arrays (SoA) layout using TypedArrays (Float32Array/Int32Array) for optimizing memory usage.
- Going back to a Quad Tree. But different from v1, this time is a correctly (hopefully) implemented AABB Quad Tree.
- Some API changes.
- This version actually has a bit more complex API, a bit larger, and have a caveat (when deleting nodes/edges, see caveat section below), but with a much more optimized memory usage compared to v2. I will think of a way to solve this in the future.

Changes from v1 to v2:

- Simplify so much of the codebase, it is practically a rewrite, making the size of the library much smaller.
- Just use 1 canvas instead of multiple canvas on v1, as it turns out there is no real performance gain, because the most expensive operation is zooming, which is frequently used and need to rerender everything anyway.
- Fixed the FATAL bug on v1 where it doesn't respect `window.devicePixelRatio`, making the graph looked blurry on high resolution display. I didn't knew this bug exist because I didn't have expensive gadget to notice this.
- Now interactions (event handler) are decoupled from the renderer, making it tree-shakeable and possible for user to create their own.

BTW, you can still visit the demo of v1 on https://web-digraph.netlify.app/ if you want to compare the differences.

## Usage

Here is a minimal example to use the library and get the graph running on a canvas:

```ts
import {
  createGraphRenderer,
  createGraphInteractions,
  createShape
} from "web-digraph";

// 1. Get your canvas element
const canvas = document.getElementById("graph-canvas") as HTMLCanvasElement;

// 2. Create the renderer engine
const graph = createGraphRenderer({
  bgColor: "#ffffff",
  nodeShapeColor: "#e2e8f0"
});

graph.mount(canvas);

// 3. Register a custom shape for nodes
const customNodeShape = graph.registerShape(
  createShape({
    w: 80,
    h: 80,
    path: new Path2D("M -40 -40 L 40 -40 L 40 40 L -40 40 Z")
  })
);

// 4. Add some nodes and an edge
const nodeA = graph.addNode(100, 100, customNodeShape);
const nodeB = graph.addNode(300, 100, customNodeShape);
graph.addEdge(nodeA, nodeB);

// 5. Flush the renderer to draw the initial state
graph.flush();

// 6. Attach default mouse/touch interactions
createGraphInteractions(canvas, graph);
```

For slightly more complex usage, including custom shapes and dynamic UI syncing, see the example site.

## Graph Renderer

The `createGraphRenderer(options)` function creates the core engine. It manages the internal state of nodes, edges, zooming, panning, and handles rendering to the canvas. It exports the following imperative API:

| Property/Method     | Type / Signature                           | Description                                                    |
| :------------------ | :----------------------------------------- | :------------------------------------------------------------- |
| **`nodes`**         | `NodeStore`                                | The SoA structure storing all nodes.                           |
| **`edges`**         | `EdgeStore`                                | The SoA structure storing all edges.                           |
| **`nodeCount`**     | `number`                                   | Total number of nodes (getter).                                |
| **`edgeCount`**     | `number`                                   | Total number of edges (getter).                                |
| **`selectedNodes`** | `Int32Array`                               | Subarray of currently selected node IDs (getter).              |
| **`selectedEdges`** | `Int32Array`                               | Subarray of currently selected edge IDs (getter).              |
| **`zoom`**          | `number`                                   | Current zoom level (getter).                                   |
| **`cameraX`**       | `number`                                   | Current camera X position (getter).                            |
| **`cameraY`**       | `number`                                   | Current camera Y position (getter).                            |
| **`mount`**         | `(el: HTMLCanvasElement) => void`          | Mounts the renderer to a canvas element.                       |
| **`registerShape`** | `(id, shape) => void`                      | Registers a custom graph shape.                                |
| **`addNode`**       | `(x, y, shapeId) => number`                | Adds a node at `(x,y)`. Returns the node ID.                   |
| **`addEdge`**       | `(sourceId, targetId, shapeId?) => number` | Connects two nodes with an edge. Returns edge ID.              |
| **`moveNodeTo`**    | `(id, x, y) => void`                       | Moves a node to an absolute coordinate.                        |
| **`moveNodeBy`**    | `(id, dx, dy) => void`                     | Moves a node by a relative offset.                             |
| **`removeNode`**    | `(id) => number`                           | Removes a node (and connected edges). Returns swapped item ID. |
| **`removeEdge`**    | `(id) => number`                           | Removes a specific edge. Returns swapped item ID.              |
| **`removeItems`**   | `(nodeIds, edgeIds) => SwapLogs`           | Batch removes items and returns O(1) swap-and-pop logs.        |
| **`clear`**         | `() => void`                               | Deletes all nodes and edges from the graph.                    |
| **`setWorldSize`**  | `(size) => void`                           | Rebuilds the quad-tree bounds to a new size.                   |
| **`beginDrag`**     | `(nodeIds: ArrayLike<number>) => void`     | Initiates dragging on an array of nodes.                       |
| **`endDrag`**       | `() => void`                               | Finishes the dragging state.                                   |
| **`selectNode`**    | `(id) => void`                             | Marks a node as selected.                                      |
| **`selectEdge`**    | `(id) => void`                             | Marks an edge as selected.                                     |
| **`unselectNode`**  | `(id?) => void`                            | Unselects a node (or all nodes if omitted).                    |
| **`unselectEdge`**  | `(id?) => void`                            | Unselects an edge (or all edges if omitted).                   |
| **`unselectAll`**   | `() => void`                               | Clears all selections across nodes and edges.                  |
| **`getNodeAt`**     | `(x, y) => number \| -1`                   | Returns the ID of the node under graph coords `(x,y)`.         |
| **`getEdgeAt`**     | `(x, y) => number \| -1`                   | Returns the ID of the edge under graph coords `(x,y)`.         |
| **`zoomTo`**        | `(value, targetX?, targetY?) => void`      | Zooms to an absolute value.                                    |
| **`zoomBy`**        | `(dv, targetX?, targetY?) => void`         | Zooms by a relative offset.                                    |
| **`panTo`**         | `(x, y) => void`                           | Pans the camera to an absolute coordinate.                     |
| **`panBy`**         | `(dx, dy) => void`                         | Pans the camera by a relative offset.                          |
| **`centerView`**    | `() => void`                               | Pans and zooms to fit the entire graph on screen.              |
| **`screenToGraph`** | `(x, y) => Pos`                            | Converts physical screen coordinates to graph coordinates.     |
| **`graphToScreen`** | `(x, y) => Pos`                            | Converts graph coordinates to physical screen coordinates.     |
| **`flush`**         | `() => void`                               | Triggers a re-render. Throttled to requestAnimationFrame.      |
| **`resize`**        | `() => void`                               | Syncs physical canvas resolution with logical dimensions.      |
| **`setGhostEdge`**  | `(sourceId, x?, y?) => void`               | Renders an interactive rubber-band edge during creation.       |

## Caveat: Swap-and-Pop Deletions

To achieve good performance and minimize garbage collection, this library stores nodes and edges in tightly packed TypedArray buffers (wanted to use WASM to make things easier, but then I remember this is a library, not so easy for user to install if i include wasm. Hopefully will update to wasm in the future, to make the codebase much cleaner when playing with buffers).

When a node or edge is deleted, the engine performs a "swap-and-pop" operation. It takes the **very last item in the buffer and moves it into the memory slot of the deleted item**.

This means **the ID of the last item in the graph changes**.

Because this library is just a renderer, you likely maintain your own external data structures mapping these IDs to your business logic. **You MUST update your external data structures to reflect this ID change.**

To help you do this, the deletion APIs provide tracking logs:

- `removeItems(nodeIds, edgeIds)` returns a `SwapLogs` object containing arrays of which IDs were deleted, and which IDs were moved to replace them (`nodeSwapDeletedLog`, `nodeSwapMovedLog`, `edgeSwapDeletedLog`, `edgeSwapMovedLog`).
- `removeNode(id)` and `removeEdge(id)` directly return the `number` ID of the item that was swapped to fill the hole (or `-1` if no swap was needed).

If you fail to update your application state with these swapped IDs, your application will end up pointing to the wrong items in the renderer, leading to "zombie" bugs. So if you have custom data, you pretty much need to add 4-5 lines in the interaction's `onDeleteSelectedItems` event. Please see the example site's code for how it is done.

## Graph Shape

Nodes and edges are rendered using `GraphShape` objects. You can create completely custom SVG-like paths using the standard Canvas 2D API.

| Property   | Type                                | Description                                                  |
| :--------- | :---------------------------------- | :----------------------------------------------------------- |
| **`w`**    | `number`                            | The logical width of the shape.                              |
| **`h`**    | `number`                            | The logical height of the shape.                             |
| **`path`** | `Path2D`                            | Used for precise hit-detection via `ctx.isPointInPath`.      |
| **`draw`** | `(ctx, path, id, renderer) => void` | The render loop function where you fill and stroke the path. |

## Graph Options

When creating a renderer, you can pass a `GraphOptions` object to customize the visual appearance.

| Option                      | Type              | Default               | Description                                |
| :-------------------------- | :---------------- | :-------------------- | :----------------------------------------- |
| **`bgColor`**               | `string`          | `"#fffdf7"`           | Canvas background color.                   |
| **`drawGrid`**              | `boolean`         | `true`                | Whether to render the background grid.     |
| **`gridType`**              | `"line" \| "dot"` | `"dot"`               | The style of the grid.                     |
| **`gridSize`**              | `number`          | `64`                  | The spacing between grid lines/dots.       |
| **`gridLineColor`**         | `string`          | `"#d1c9b8"`           | The color of the grid.                     |
| **`gridLineWidth`**         | `number`          | `1`                   | Line width if grid type is `line`.         |
| **`gridDotRadius`**         | `number`          | `2.5`                 | Radius of the dot if grid type is `dot`.   |
| **`initialMaxNodes`**       | `number`          | `1000`                | Initial capacity for nodes (auto-expands). |
| **`initialMaxEdges`**       | `number`          | `10000`               | Initial capacity for edges (auto-expands). |
| **`minZoom`**               | `number`          | `0.2`                 | The maximum zoom-out limit.                |
| **`maxZoom`**               | `number`          | `5.0`                 | The maximum zoom-in limit.                 |
| **`nodeLineWidth`**         | `number`          | `2`                   | Stroke width for nodes.                    |
| **`nodeLineColor`**         | `string`          | `"#475569"`           | Stroke color for nodes.                    |
| **`nodeShapeColor`**        | `string`          | `"#ffffff"`           | Fill color for nodes.                      |
| **`nodeFont`**              | `string`          | `"600 12px Inter..."` | CSS font string for node text.             |
| **`edgeLineWidth`**         | `number`          | `2`                   | Stroke width for edges.                    |
| **`edgeLineColor`**         | `string`          | `"#3f6212"`           | Stroke color for edges.                    |
| **`edgeShapeColor`**        | `string`          | `"#ffffff"`           | Fill color for edge labels.                |
| **`edgeFont`**              | `string`          | `"500 12px Inter..."` | CSS font string for edge labels.           |
| **`selectedNodeLineWidth`** | `number`          | `2`                   | Stroke width for selected nodes.           |
| **`selectedNodeLineColor`** | `string`          | `"#2563eb"`           | Stroke color for selected nodes.           |
| **`selectedEdgeLineWidth`** | `number`          | `2`                   | Stroke width for selected edges.           |
| **`selectedEdgeLineColor`** | `string`          | `"#2563eb"`           | Stroke color for selected edges.           |

## Default Interaction

Event handling (mouse, touch, keyboard) is completely decoupled from the `GraphRenderer`.
This architecture ensures the core renderer stays lean and tree-shakeable. `createGraphInteractions(canvas, graph)` provides the standard behaviors you'd expect (drag-and-drop, box selection, panning, zooming).

If you want a read-only graph, you can simply not mount the interaction. If you want custom hotkeys or entirely different behaviors, you can bypass the default interaction completely and build your own!

## FAQ

**Q**: Why not just use `react-digraph` if this is basically an inferior version of `react-digraph`?  
**A**: Size, performance, and mobile support are the main reasons. `react-digraph` depends on D3 and other dependencies, which make it heavy. Also they use react and svg, which is not performant when the nodes and edges count are really big. Try 1000 nodes on react-digraph's example and then try 999999 (I am not joking) nodes on web-digraph's example and you will see the difference.

**Q**: Why no react?  
**A**: There are some reasons for this:

- First, `react-digraph` already use React, so why should we do the same?
- I am not a real fan of React. I just use React because of job's requirements xD
- Well, actually I tried to use React at first xD But it is not performing as well as I wanted and the code becomes ugly very quick (maybe I am just not good with React). And I didn't even know about `react-digraph` at first. So after knowing about `react-digraph`, I immediately redo from scratch without React and copies `react-digraph`. xD

**Q**: Is it production ready?  
**A**: Use at your own risk! If you find any bugs, please let me know or create a PR. xD

**Q**: There are some missing event that I need, like `onViewMoved`, `onHoverChange`, etc.
**A:** The core graph renderer is just a rendering engine, so it has no concept of events. All event handling lives in the Interaction layer. You can create a custom interaction layer tailored exactly to your needs, or submit a PR to add hooks into `createGraphInteractions`!

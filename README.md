# web-digraph

> A library to render a simple directed graph editor. See the demo at [https://web-digraph.hulahula.dev/](https://web-digraph.hulahula.dev/).

## Overview

This is a library for creating a simple directed graph. It was heavily inspired by [react-digraph](https://github.com/uber/react-digraph), but with less features, less polished, and less everything. However, it uses canvas instead of svg for rendering, giving much better performance, and have mobile/touchscreen support. Also, it is not using react, because we love imperative things. React is for the weak! (just kidding xD). The bundle size is also really small with no external dependencies, which is one thing I don't like the most about react-digraph.

Note that this is just a renderer, not something that you should use to store your actual node/edge data. Your actual data should live separately from this renderer.

## Features

- Built with TypeScript.
- Small size (~6KB minified and gzipped, compared to `react-digraph` ~100KB minified and gzipped).
- Imperative API (yes, this is a feature).
- Touch input support.

## Installation

```bash
npm install --save web-digraph
```

## Usage

Here is a minimal example to use the library and get the graph running on a canvas:

```ts
import {
  createGraphRenderer,
  createGraphInteractions,
  createShape
} from "web-digraph";

// 1. Get your canvas element
const canvas = document.getElementById("my-canvas") as HTMLCanvasElement;

// 2. Create a custom shape (a simple square)
const customShape = createShape({
  w: 80,
  h: 80,
  path: new Path2D("M -40 -40 L 40 -40 L 40 40 L -40 40 Z")
});

// 3. Create the renderer engine
const graph = createGraphRenderer({
  bgColor: "#ffffff",
  nodeShapeColor: "#e2e8f0"
});
graph.mount(canvas);

// 4. Add some nodes and an edge
const nodeA = graph.addNode(100, 100, customShape);
const nodeB = graph.addNode(300, 100, customShape);
graph.addEdge(nodeA, nodeB);

// 5. Attach default mouse/touch interactions
const interaction = createGraphInteractions(canvas, graph);
```

For slightly more complex usage, including custom shapes and dynamic UI syncing, see the example site.

## Graph Renderer

The `createGraphRenderer(options)` function creates the core engine. It manages the internal state of nodes, edges, zooming, panning, and handles rendering to the canvas. It exports the following imperative API:

| Property/Method        | Type / Signature                         | Description                                                    |
| :--------------------- | :--------------------------------------- | :------------------------------------------------------------- |
| **`nodes`**            | `Record<number, GraphNode>`              | Map of all nodes in the graph by ID.                           |
| **`edges`**            | `Record<number, GraphEdge>`              | Map of all edges in the graph by ID.                           |
| **`nodeCount`**        | `number`                                 | Total number of nodes.                                         |
| **`edgeCount`**        | `number`                                 | Total number of edges.                                         |
| **`mount`**            | `(el: HTMLCanvasElement) => void`        | Mounts the renderer to a canvas element.                       |
| **`addNode`**          | `(x, y, shape) => number`                | Adds a node at `(x,y)`. Returns the node ID.                   |
| **`addEdge`**          | `(sourceId, targetId, label?) => number` | Connects two nodes with an edge. Returns edge ID.              |
| **`moveNodeTo`**       | `(id, x, y, skipGrid?) => void`          | Moves a node to an absolute coordinate.                        |
| **`moveNodeBy`**       | `(id, dx, dy, skipGrid?) => void`        | Moves a node by a relative offset.                             |
| **`updateNodeGrid`**   | `(id) => void`                           | Updates a node's position in the spatial hash grid.            |
| **`updateEdgeGrid`**   | `(id) => void`                           | Updates an edge's bounds in the spatial hash grid.             |
| **`removeItem`**       | `(id) => void`                           | Removes an item (node or edge) by its ID.                      |
| **`removeNode`**       | `(id) => void`                           | Removes a node and automatically removes connected edges.      |
| **`removeEdge`**       | `(id) => void`                           | Removes a specific edge.                                       |
| **`clear`**            | `() => void`                             | Deletes all nodes and edges from the graph.                    |
| **`select`**           | `(ids: number[]) => void`                | Marks an array of items as selected.                           |
| **`unselect`**         | `(ids?: number[]) => void`               | Unselects specified items (or all if omitted).                 |
| **`getSelectedItems`** | `() => Set<number>`                      | Returns a Set containing all currently selected IDs.           |
| **`getItemAt`**        | `(x, y) => number \| null`               | Returns the ID of the topmost item under graph coords `(x,y)`. |
| **`getZoom`**          | `() => number`                           | Returns the current zoom level.                                |
| **`zoomTo`**           | `(value, targetX?, targetY?) => void`    | Zooms to an absolute value.                                    |
| **`zoomBy`**           | `(dv, targetX?, targetY?) => void`       | Zooms by a relative offset.                                    |
| **`panTo`**            | `(x, y) => void`                         | Pans the camera to an absolute coordinate.                     |
| **`panBy`**            | `(dx, dy) => void`                       | Pans the camera by a relative offset.                          |
| **`centerView`**       | `() => void`                             | Pans and zooms to fit the entire graph on screen.              |
| **`screenToGraph`**    | `(x, y) => Pos`                          | Converts physical screen coordinates to graph coordinates.     |
| **`graphToScreen`**    | `(x, y) => Pos`                          | Converts graph coordinates to physical screen coordinates.     |
| **`flush`**            | `() => void`                             | Triggers a re-render. Throttled to requestAnimationFrame.      |
| **`resize`**           | `() => void`                             | Syncs physical canvas resolution with logical dimensions.      |
| **`setGhostEdge`**     | `(sourceId, x?, y?) => void`             | Renders an interactive rubber-band edge during creation.       |

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

| Option                      | Type              | Default               | Description                                   |
| :-------------------------- | :---------------- | :-------------------- | :-------------------------------------------- |
| **`bgColor`**               | `string`          | `"#fffdf7"`           | Canvas background color.                      |
| **`drawGrid`**              | `boolean`         | `true`                | Whether to render the background grid.        |
| **`gridType`**              | `"line" \| "dot"` | `"dot"`               | The style of the grid.                        |
| **`gridSize`**              | `number`          | `64`                  | The spacing between grid lines/dots.          |
| **`gridLineColor`**         | `string`          | `"#d1c9b8"`           | The color of the grid.                        |
| **`gridLineWidth`**         | `number`          | `1`                   | Line width if grid type is `line`.            |
| **`gridDotRadius`**         | `number`          | `2.5`                 | Radius of the dot if grid type is `dot`.      |
| **`shgCellSize`**           | `number`          | `500`                 | The chunk size for spatial hash grid culling. |
| **`minZoom`**               | `number`          | `0.2`                 | The maximum zoom-out limit.                   |
| **`maxZoom`**               | `number`          | `5.0`                 | The maximum zoom-in limit.                    |
| **`nodeLineWidth`**         | `number`          | `2`                   | Stroke width for nodes.                       |
| **`nodeLineColor`**         | `string`          | `"#475569"`           | Stroke color for nodes.                       |
| **`nodeShapeColor`**        | `string`          | `"#ffffff"`           | Fill color for nodes.                         |
| **`nodeFont`**              | `string`          | `"600 12px Inter..."` | CSS font string for node text.                |
| **`edgeLineWidth`**         | `number`          | `2`                   | Stroke width for edges.                       |
| **`edgeLineColor`**         | `string`          | `"#3f6212"`           | Stroke color for edges.                       |
| **`edgeShapeColor`**        | `string`          | `"#ffffff"`           | Fill color for edge labels.                   |
| **`edgeFont`**              | `string`          | `"500 12px Inter..."` | CSS font string for edge labels.              |
| **`selectedNodeLineWidth`** | `number`          | `2`                   | Stroke width for selected nodes.              |
| **`selectedNodeLineColor`** | `string`          | `"#2563eb"`           | Stroke color for selected nodes.              |
| **`selectedEdgeLineWidth`** | `number`          | `2`                   | Stroke width for selected edges.              |
| **`selectedEdgeLineColor`** | `string`          | `"#2563eb"`           | Stroke color for selected edges.              |

## Default Interaction

Event handling (mouse, touch, keyboard) is completely decoupled from the `GraphRenderer`.
This architecture ensures the core renderer stays lean and tree-shakeable. `createGraphInteractions(canvas, graph)` provides the standard behaviors you'd expect (drag-and-drop, box selection, panning, zooming).

If you want a read-only graph, you can simply not mount the interaction. If you want custom hotkeys or entirely different behaviors, you can bypass the default interaction completely and build your own!

## Note about V2

Tbh it was a real mistake to call the previous version v1 as it was not really tested extensively. Even the current v2 should not have been v1 yet, but now I was forced to update the version to v2 because there are many breaking changes. But because absolutely no one is using this library, so I guess it is fine.

Anyway, there are some improvements compared to V1:

- Simplify so much of the codebase, it is practically a rewrite.
- Just use 1 canvas instead of multiple canvas on v1, as it turns out there is no performance difference.
- Fixed the FATAL bug on v1 where it doesn't respect `window.devicePixelRatio`, making the graph looked blurry on high resolution display. I didn't knew this bug exist because I didn't have expensive gadget to notice this.
- Now interactions (event handler) are decoupled from the renderer, making it tree-shakeable and possible for user to create their own.
- Now I use a simple Spatial Hash Grid instead of custom (and not really correct) Quad Tree. The performance got hurt when there are edges that has really long length, but not in real use case. In the future maybe I will try better approach (like R-tree) if needed.

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

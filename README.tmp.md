# web-digraph

> A highly-performant, zero-dependency library to render a simple directed graph editor on the web. See the demo at [https://web-digraph.hulahula.dev/](https://web-digraph.hulahula.dev/).

## Overview

This is a library for creating simple directed graphs. It was heavily inspired by [react-digraph](https://github.com/uber/react-digraph), but opts for raw Canvas over SVG to achieve massively superior performance. It works beautifully on mobile/touchscreens, ships with no external dependencies, and exposes a clean, imperative API.

Note that this is purely a **renderer and interaction layer**, not a data store. Your actual application state and business logic should live separately from this renderer.

## Features

- **Blazing Fast**: Uses raw HTML5 Canvas and Spatial Hash Grid culling to easily render 100,000+ nodes without breaking a sweat.
- **Microscopic Size**: ~13.8 KB minified (~5 KB gzipped). Compare that to `react-digraph`'s ~100 KB!
- **Zero Dependencies**: Doesn't force React, D3, or anything else into your bundle.
- **Mobile Ready**: Built-in support for touch inputs, panning, and zooming.
- **Customizable**: Create custom node and edge shapes with the standard Canvas 2D API.

## Installation

```bash
npm install --save web-digraph
```

## Usage

Here is a minimal example to get a graph running on a canvas:

```ts
import {
  createGraphRenderer,
  createDefaultInteraction,
  defaultShape
} from "web-digraph";

// 1. Get your canvas element
const canvas = document.getElementById("my-canvas");

// 2. Create the renderer engine
const graph = createGraphRenderer({
  bgColor: "#ffffff",
  nodeShapeColor: "#e2e8f0"
});
graph.mount(canvas);

// 3. Add some nodes and an edge
const nodeA = graph.addNode(100, 100, defaultShape);
const nodeB = graph.addNode(300, 100, defaultShape);
graph.addEdge(nodeA, nodeB);

// 4. Attach default mouse/touch interactions
const interaction = createDefaultInteraction(graph);
interaction.mount(canvas);
```

For more complex usage, including custom shapes and dynamic UI syncing, check out the source code of the example site!

## Graph Renderer

The `createGraphRenderer(options)` function creates the core engine. It manages the internal state of nodes, edges, zooming, panning, and handles rendering to the canvas. It exposes a robust imperative API (e.g. `addNode`, `addEdge`, `zoomTo`, `flush`) that you can use to programmatically control the graph.

## Graph Options

When creating a renderer, you can pass an optional `GraphOptions` object to customize the visual appearance. This includes settings for grid styles, background colors, node/edge line widths, zoom limits, and fonts.

## Graph Shape

Nodes and edges are rendered using `GraphShape` objects. A shape requires:

- `w` and `h`: The logical width and height.
- `path`: A `Path2D` object used for precise hit detection (clicking/hovering).
- `draw`: A render function `(ctx, path, id, renderer)` where you use the raw Canvas 2D context to draw your shape however you like.

## Default Interaction

Event handling (mouse, touch, keyboard) is completely decoupled from the `GraphRenderer`.
This architecture ensures the core renderer stays lean and tree-shakeable. `createDefaultInteraction(graph)` provides the standard behaviors you'd expect (drag-and-drop, box selection, panning, zooming).

If you want a read-only graph, you can simply not mount the interaction. If you want custom hotkeys or entirely different behaviors, you can bypass the default interaction completely and build your own!

## FAQ

**Q: Why not just use `react-digraph`?**  
**A:** Size, performance, and mobile support. `react-digraph` depends on D3 and React, making it heavy. Because they use SVG, rendering performance tanks when the node and edge counts get large. Try rendering 1,000 nodes on `react-digraph`, and then try rendering 100,000 nodes on `web-digraph`'s example site to see the difference.

**Q: Why no React?**  
**A:** A few reasons:

- `react-digraph` already uses React, so we wanted to build something different!
- Raw canvas rendering maps perfectly to an imperative API. Forcing React's declarative lifecycle over a high-performance 60fps canvas loop often leads to ugly code and poor performance.
- Keeping it framework-agnostic means you can use this library in React, Vue, Svelte, or Vanilla JS.

**Q: Is it production ready?**  
**A:** Use at your own risk! If you find any bugs or need new features, please open an issue or create a PR.

**Q: There are some missing events that I need, like `onViewMoved`, `onHoverChange`, etc.**  
**A:** The core graph renderer is just a rendering engine—it has no concept of events. All event handling lives in the Interaction layer. You can create a custom interaction layer tailored exactly to your needs, or submit a PR to add hooks into `createDefaultInteraction`!

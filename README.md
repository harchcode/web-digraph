# web-digraph

> A library to render a simple directed graph editor. See the demo at [https://web-digraph.hulahula.dev/](https://web-digraph.hulahula.dev/).

## Overview

This is a library for creating a simple directed graph. It was heavily inspired by [react-digraph](https://github.com/uber/react-digraph), but with less features, less polished, and less everything, but using canvas instead of svg for rendering, giving much better performance, works on mobile/touchscreen, and also not using react, because we love imperative things. React is for the weak! (just kidding xD). Also bundle size is really small with no external dependencies, which is one i dont like the most about react-digraph.

Note that this is just a renderer, not something that you should use to store your actual node/edge data. Your actual data should live separately from this renderer

## Features

- Built with Typescript.
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

For a little more complex usage, including custom shapes and dynamic UI syncing, see the example site.

## Graph Shape

Nodes and edges are rendered using `GraphShape` objects. A shape requires:

- `w` and `h`: The logical width and height.
- `path`: A `Path2D` object used for precise hit detection (clicking/hovering).
- `draw`: A render function `(ctx, path, id, renderer)` where you use the raw Canvas 2D context to draw your shape however you like.

## Graph Renderer

The `createGraphRenderer(options)` function creates the core engine. It manages the internal state of nodes, edges, zooming, panning, and handles rendering to the canvas. It exports an imperative API (e.g. `addNode`, `addEdge`, `zoomTo`, `flush`) that you can use to programmatically control the graph.

## Graph Options

When creating a renderer, you can pass an optional `GraphOptions` object to customize the visual appearance. This includes settings for grid styles, background colors, node/edge line widths, zoom limits, and fonts.

## Default Interaction

Event handling (mouse, touch, keyboard) is completely decoupled from the `GraphRenderer`.
This architecture ensures the core renderer stays lean and tree-shakeable. `createDefaultInteraction(graph)` provides the standard behaviors you'd expect (drag-and-drop, box selection, panning, zooming).

If you want a read-only graph, you can simply not mount the interaction. If you want custom hotkeys or entirely different behaviors, you can bypass the default interaction completely and build your own!

## Note about V2

Tbh it was a real mistake to call the previous version v1 as it was not really tested extensively. Even the current v2 should not have been v1 yet, but now i was forced to update to version to v2 because there are many breaking changes. But because absolutely no one is using this library, so I guess it is fine.

Anyway, there are some improvements compared to V1:

- Simplify so much of the codebase, it is practically a rewrite.
- Just use 1 canvas instead of multiple canvas on v1, as it turns out there is no performance difference.
- Fixed the FATAL bug on v1 where it doesn't respect `window.devicePixelRatio`, making the graph looked blurry on high resolution display. I didn't knew this bug exist because i didn't have expensive gadget to notice this.
- Now interactions (event handler) are decoupled from the renderer, making it tree-shakeable and possible for user to create their own.

## FAQ

**Q**: Why not just use `react-digraph` if this is basically an inferior version of `react-digraph`?  
**A**: Size, performance, and mobile support are the main reasons. `react-digraph` depends on D3 and other dependencies, which make it heavy. Also they use react and svg, which is not performant when the nodes and edges count are really big. Try 1000 nodes on react-digraph's example and then try 999999 (i am not joking) nodes on web-digraph's example and you will see the difference.

**Q**: Why no react?  
**A**: There are some reasons for this:

- First, `react-digraph` already use React, so why should we do the same?
- I am not a real fan of React. I just use React because of job's requirements xD
- Well, actually I tried to use React at first xD But it is not performing as well as I wanted and the code becomes ugly very quick (maybe i am just not good with React). And I didn't even know about `react-digraph` at first. So after knowing about `react-digraph`, I immediately redo from scratch without React and copies `react-digraph`. xD

**Q**: Is it production ready?  
**A**: Not sure, maybe not. xD If you find any bugs, please let me know or create a PR. xD

**Q**: There are some missing event that I need, like `onViewMoved`, `onHoverChange`, etc.
**A**: Well, please let me know or create a PR. xD Btw the graph renderer are only functions with no events. All those event handlers are in the interaction. You can actually create new interaction yourself to customize all event handling if you want to.

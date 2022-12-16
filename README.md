# web-digraph

> A library to create a simple directed graph editor. See the demo at [https://web-digraph.netlify.app/](https://web-digraph.netlify.app/).

## Overview

This is a library for creating a simple directed graph. It is heavily inspired by [react-digraph](https://github.com/uber/react-digraph), but with less features, less polished, and less everything, but using canvas instead of svg for rendering, and also not using react, because we love imperative things. React is for the weak! (just kidding xD)

## Features

- Built with Typescript.
- Small size (~8KB minified and gzipped, compared to `react-digraph` ~100KB minified and gzipped).
- Imperative API and class-based (yes, this is a feature).
- Touch input support.

## Installation

```bash
npm install --save web-digraph
```

## Usage

- Import the GraphView class and needed types.

```js
import {
  createGraphView,
  GraphEdge,
  GraphMode,
  GraphNode,
  GraphView,
  createEdgeShape,
  createNodeShape,
  defaultEdgeShape,
  defaultNodeShape
} from "web-digraph";
```

- Define the node and edge types. I suggest putting this node and edge types definition in its own file because it may get long.

```js
const rectNodeShape = createNodeShape({
  width: 160,
  height: 120,
  createPath: (x, y, w, h) => {
    const p = new Path2D();

    p.rect(x - w * 0.5, y - h * 0.5, w, h);
    p.closePath();

    return p;
  }
});

const starNodeShape = createNodeShape({
  width: 218,
  height: 205,
  createPath: (x, y, w, h) => {
    const p = new Path2D();

    const l = x - w * 0.5;
    const t = y - h * 0.5;

    p.moveTo(l + 108, t + 0.0);
    p.lineTo(l + 141, t + 70);
    p.lineTo(l + 218, t + 78.3);
    p.lineTo(l + 162, t + 131);
    p.lineTo(l + 175, t + 205);
    p.lineTo(l + 108, t + 170);
    p.lineTo(l + 41.2, t + 205);
    p.lineTo(l + 55, t + 131);
    p.lineTo(l + 0, t + 78);
    p.lineTo(l + 75, t + 68);
    p.lineTo(l + 108, t + 0);
    p.closePath();

    return p;
  }
});

const circleEdgeShape = createEdgeShape({
  width: 48,
  height: 48,
  createPath: (x, y, w) => {
    const p = new Path2D();

    p.arc(x, y, w * 0.5, 0, 2 * Math.PI);
    p.closePath();

    return p;
  }
});

const nodeShapes = [
  defaultNodeShape,
  rectNodeShape,
  starNodeShape,
  wowNodeShape
];

const edgeShapes = [defaultEdgeShape, circleEdgeShape];
```

- Create a new instance of GraphView class. The first parameter is the container, and second parameter is the options. Please see the example for the options' detail.

```js
const graphDiv = document.getElementById("graph-div");
const graphView = new GraphView<GraphNode, GraphEdge>(graphDiv, {
  width: 100000,
  height: 100000,
  minScale: 0.2,
  maxScale: 3.0,
  onViewZoom: handleViewZoom,
  onCreateNode: handleCreateNode,
  onCreateEdge: handleCreateEdge
});
```

- Do some operations. See the example for more detail.

```js
graphView.addNode(
  {
    id: 1,
    x: 0
    y: 0
  },
  nodeShapes[getRandomInt(0, nodeShapes.length)]
);
```

## Options

```typescript
width: number;
height: number;
bgColor: string;
bgDotColor: string;
bgLineWidth: number;
bgLineGap: number;
bgShowDots: boolean;
bgBorderWidth: number;
bgBorderColor: string;
bgOutboundColor: string;
minScale: number;
maxScale: number;
edgeLineWidth: number;
edgeLineColor: string;
edgeArrowHeight: number;
edgeArrowWidth: number;
edgeShapeColor: string;
edgeContentColor: string;
edgeTextAlign: CanvasTextAlign;
edgeTextBaseline: CanvasTextBaseline;
edgeFont: string;
edgeHoveredLineColor: string;
edgeSelectedLineColor: string;
edgeSelectedShapeColor: string;
edgeSelectedContentColor: string;
nodeLineWidth: number;
nodeLineColor: string;
nodeColor: string;
nodeContentColor: string;
nodeTextAlign: CanvasTextAlign;
nodeTextBaseline: CanvasTextBaseline;
nodeFont: string;
nodeHoveredLineColor: string;
nodeSelectedLineColor: string;
nodeSelectedColor: string;
nodeSelectedContentColor: string;
onViewZoom: () => void;
onCreateNode: (x: number, y: number) => void;
onCreateEdge: (sourceId: number, targetId: number) => void;
```

## GraphNode

If you want to use your own Node data type, you can. Just make sure that your custom type have all the properties of GraphNode. The same also apply to GraphEdge.

| Prop |   Type   | Required |            Notes            |
| ---- | :------: | :------: | :-------------------------: |
| `id` | `number` |  `true`  | A unique identifier number. |
| `x`  | `number` |  `true`  |  X coordinate of the node.  |
| `y`  | `number` |  `true`  |  Y coordinate of the node.  |

## GraphEdge

| Prop       |   Type   | Required |            Notes            |
| ---------- | :------: | :------: | :-------------------------: |
| `id`       | `number` |  `true`  | A unique identifier number. |
| `sourceId` | `number` |  `true`  |     The source node id      |
| `targetId` | `number` |  `true`  |     The target node id.     |

## Notes

- Nodes' and edges' ids must be unique or there will be unexpected behaviors.
- Nodes' and edges' ids must be greater than 0.

## Limitations

- No swap edge (`react-digraph` has it, but i don't think it is needed).

## FAQ

**Q**: Why not just use `react-digraph` if this is basically an inferior version of `react-digraph`?  
**A**: Size and performance are the main reasons. `react-digraph` depends on D3 and other dependencies, which make it heavy. Also they use react and svg, which is not performant when the nodes and edges count are really big. Try 1000 nodes on react-digraph's example and then try 999999 (i am not joking) nodes on web-digraph's example and you will see the difference.

**Q**: Why no react?  
**A**: There are some reasons for this:

- First, `react-digraph` already use React, so why should we do the same?
- I am not a fan nor an expert of React. I just use React because of job's requirements xD
- Well, actually I tried to use React at first xD But it is not performing as well as I wanted and the code becomes ugly very quick (maybe i am just not good with React). And I didn't even know about `react-digraph` at first. So after knowing about `react-digraph`, I immediately redo from scratch without React and copies `react-digraph`. xD

**Q**: Is it production ready?  
**A**: Not sure, maybe not. xD If you find any bugs, please let me know or create a PR. xD

**Q**: There are some missing event that I need, like `onViewMoved`, `onHoverChange`, etc.
**A**: Well, please let me know or create a PR. xD

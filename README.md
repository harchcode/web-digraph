# web-digraph

> A library to create a simple directed graph editor. See the demo at [https://web-digraph.netlify.app/](https://web-digraph.netlify.app/).

## Overview

Initially, this library was basically a copy of [react-digraph](https://github.com/uber/react-digraph), but with less features, less polished, and less everything. but using canvas instead of svg for rendering, and also not using react, because we love imperative things. React is for the weak.

## Features

- Built with Typescript.
- Small size (at least compared to `react-digraph`, because of no D3 dependency, and much less features).
- Imperative API and class-based (yes, this is a feature).
- Touch input support.

## Installation

```bash
npm install --save web-digraph
```

## Usage

- Import the GraphView class and needed types.

```js
import { GEView, GEShapeTypes, GEShapeName, GENode, GEEdge } from "web-digraph";
```

- Define the node and edge types. I suggest putting this node and edge types definition in its own file because it may get long.

```js
const nodeTypes = {
  empty: [
    {
      shape: GEShapeName.CIRCLE,
      r: 80
    }
  ],
  complex: [
    {
      shape: GEShapeName.CIRCLE,
      r: 80
    },
    {
      shape: GEShapeName.CIRCLE,
      r: 60,
      color: "pink"
    },
    {
      shape: GEShapeName.CIRCLE,
      r: 40,
      color: "white"
    }
  ]
};

const edgeTypes = {
  normal: [
    {
      shape: GEShapeName.POLYGON,
      points: [
        [0, -25],
        [25, 0],
        [0, 25],
        [-25, 0]
      ]
    }
  ]
};
```

- Create a new instance of GEView class.

```js
const graphView = new GEView();
```

- Set options. This is the minimal needed options needed for the graph to work properly. For the event handler (like `handleCreateNode`), see the example for detail.

```js
graphView.setOptions({
  nodeTypes,
  edgeTypes,
  onCreateNode: handleCreateNode,
  onCreateEdge: handleCreateEdge,
  onDeleteNode: handleDeleteNode,
  onDeleteEdge: handleDeleteEdge,
  onMoveNode: handleMoveNode
});
```

- Init the graph view, passing it the parent element to put it into the dom.

```js
graphView.init(document.body);
```

## Options

```typescript
edgeArrowLength: number;
edgeArrowRadian: number;
backgroundColor: string;
showGrid: boolean;
gridType: GEGridType;
gridColor: string;
gridLineWidth: number;
gridGap: number;
defaultSubShapeColor: string;
nodeLineWidth: number;
nodeColor: string;
nodeSelectedColor: string;
nodeStrokeColor: string;
nodeTextColor: string;
nodeSelectedTextColor: string;
nodeTextStyle: string;
edgeLineWidth: number;
edgeLineColor: string;
edgeLineSelectedColor: string;
edgeShapeFillColor: string;
edgeTextColor: string;
edgeSelectedTextColor: string;
edgeTextStyle: string;
minScale: number;
maxScale: number;
cursorGrab: string;
cursorPointer: string;
cursorCrosshair: string;
nodeTypes: GEShapeTypes;
edgeTypes: GEShapeTypes;
onViewMoved?: () => void;
onViewZoom?: () => void;
onCreateNode?: (x: number, y: number, evt: MouseEvent) => void;
onMoveNode?: (node: GENode, newX: number, newY: number) => void;
onDeleteNode?: (node: GENode) => void;
onCreateEdge?: (
  sourceNode: GENode,
  targetNode: GENode,
  evt: MouseEvent
) => void;
onDeleteEdge?: (edge: GEEdge, sourceNode: GENode, targetNode: GENode) => void;
onSelectionChange?: (
  selectedNode: GENode | undefined,
  selectedEdge: GEEdge | undefined
) => void;
onHoverChange?: (
  hoveredNode: GENode | undefined,
  hoveredEdge: GEEdge | undefined,
  viewX: number,
  viewY: number,
  canvasX: number,
  canvasY: number,
  clientX: number,
  clientY: number
) => void;
```

## GENode

If you want to use your own Node data type, you can. Just make sure that your custom type have all the properties of GENode. The same also apply to GEEdge.

| Prop   |   Type   | Required |                Notes                |
| ------ | :------: | :------: | :---------------------------------: |
| `id`   | `number` |  `true`  |     A unique identifier number.     |
| `text` | `string` |  `true`  |      The text inside the node.      |
| `x`    | `number` |  `true`  |      X coordinate of the node.      |
| `y`    | `number` |  `true`  |      Y coordinate of the node.      |
| `type` | `string` |  `true`  | Node type, for displaying the shape |

## GEEdge

| Prop         |   Type   | Required |                Notes                 |
| ------------ | :------: | :------: | :----------------------------------: |
| `id`         | `number` |  `true`  |     A unique identifier number.      |
| `sourceNode` | `GENode` |  `true`  |        The source node object        |
| `targetNode` | `GENode` |  `true`  |       The target node object.        |
| `type`       | `string` |  `true`  | Edge type, for displaying the shape. |
| `text`       | `string` |  `true`  |     Text to render on the edge.      |

## Limitations

- No swap edge (`react-digraph` has it, but i don't think it is needed).

## FAQ

**Q**: Why not just use react-digraph if this is basically an inferior version of react-digraph?  
**A**: Size and performance are the main reasons. React-digraph depends on D3 and other dependencies, which make it heavy. Also they use react and svg, which is not performant when the nodes and edges count are really big. Try 1000 nodes on react-digraph's example and then try 999999 (i am not joking) nodes on web-digraph's example and you will see the difference.

**Q**: Why not use react?  
**A**: I am not an expert on React. Never really liked React anyway, it's all just for the job. But I actually tried React first, with SVG. It ends up very slow on high node or edge count (maybe because of all the diffing and garbage created). Then I optimized it by using React.memo and update the component manually. It ends up looking just like imperative code, except far more complicated. So I decided to just throw React into the trash bin. And then after doing all that, I then found out about react-digraph and i feel like I just wasted my time. So I got angry and just go rewrite it without React, and use canvas to be cool and different.

**Q**: Why not use D3?  
**A**: I think we don't need any D3 feature to create this...

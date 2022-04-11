import { GraphNode } from "./graph-view";

export function circleIntersection<Node extends GraphNode>(
  out: [number, number],
  self: Node,
  other: Node
) {
  const dx = other.x - self.x;
  const dy = other.y - self.y;
  const r = (self.shape.size || 100) * 0.5;

  const rad = Math.atan2(dy, dx);
  const sinr = Math.sin(rad);
  const cosr = Math.cos(rad);

  out[0] = self.x + cosr * r;
  out[1] = self.y + sinr * r;
}

// export function getDefaultOptions(): GraphViewOptions {
//   return {
//     edgeArrowLength: 16,
//     edgeArrowRadian: Math.PI / 6,
//     backgroundColor: "#F7FAFC",
//     showGrid: true,
//     gridColor: "#CBD5E0",
//     gridLineWidth: 8,
//     gridGap: 64,
//     defaultSubShapeColor: "green",
//     nodeLineWidth: 2,
//     nodeColor: "white",
//     nodeSelectedColor: "#4299E1",
//     nodeStrokeColor: "#1A202C",
//     nodeTextColor: "#1A202C",
//     nodeSelectedTextColor: "white",
//     nodeTextStyle: "16px sans-serif",
//     edgeLineWidth: 3,
//     edgeLineColor: "#2B6CB0",
//     edgeLineSelectedColor: "#4299E1",
//     edgeShapeFillColor: "white",
//     edgeTextColor: "#1A202C",
//     edgeSelectedTextColor: "white",
//     edgeTextStyle: "16px sans-serif",
//     minScale: 0.2,
//     maxScale: 1.8,
//     cursorGrab: "grab",
//     cursorPointer: "pointer",
//     cursorCrosshair: "crosshair",
//     nodeTypes: {
//       empty: []
//     },
//     edgeTypes: {
//       empty: [
//         {
//           shape: GEShapeName.RECTANGLE,
//           width: 30,
//           height: 20
//         }
//       ]
//     }
//   };
// }

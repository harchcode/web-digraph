import {
  NodeShape,
  EdgeShape,
  circleIntersection,
  rectIntersection,
  createPathFromPoints,
  polygonIntersection,
  renderNodeContentFromField
} from "../src";
import { ExampleNode } from "./types";

const normalNodePath = new Path2D();
normalNodePath.arc(100, 100, 100, 0, Math.PI * 2);

export const normalNodeShape: NodeShape = {
  paths: [normalNodePath],
  setIntersectionPoint: circleIntersection,
  size: [200, 200],
  renderContent: renderNodeContentFromField<ExampleNode>("label", [200, 200])
};

const rectNodePath = new Path2D();
rectNodePath.rect(0, 0, 200, 120);

export const rectNodeShape: NodeShape = {
  paths: [rectNodePath],
  setIntersectionPoint: rectIntersection,
  size: [200, 120],
  renderContent: renderNodeContentFromField<ExampleNode>("label", [200, 120])
};

const randomNodePoints: [number, number][] = [
  [0, 10],
  [20, 15],
  [15, 200],
  [175, 180],
  [200, 120],
  [140, 0]
];

export const randomNodeShape: NodeShape = {
  paths: [createPathFromPoints(randomNodePoints)],
  setIntersectionPoint: polygonIntersection(randomNodePoints),
  size: [200, 200],
  renderContent: renderNodeContentFromField<ExampleNode>("label", [200, 200])
};

const normalEdgePath = new Path2D();
normalEdgePath.arc(25, 25, 25, 0, Math.PI * 2);

export const normalEdgeShape: EdgeShape = {
  paths: [normalEdgePath],
  size: [50, 50],
  renderContent: renderNodeContentFromField<ExampleNode>("label", [50, 50])
};

// export const nodeTypes: GEShapeTypes = {
//   empty: [
//     {
//       shape: GEShapeName.CIRCLE,
//       r: 80
//     }
//   ],
//   decision: [
//     {
//       shape: GEShapeName.RECTANGLE,
//       width: 150,
//       height: 120
//     }
//   ],
//   unknown: [
//     {
//       shape: GEShapeName.POLYGON,
//       points: [
//         [0, -80],
//         [80, 0],
//         [0, 80],
//         [-80, 0]
//       ]
//     }
//   ],
//   complex: [
//     {
//       shape: GEShapeName.CIRCLE,
//       r: 80
//     },
//     {
//       shape: GEShapeName.CIRCLE,
//       r: 60,
//       color: "#9AE6B4"
//     },
//     {
//       shape: GEShapeName.CIRCLE,
//       r: 40,
//       color: "white"
//     }
//   ]
// };

// export const edgeTypes: GEShapeTypes = {
//   normal: [
//     {
//       shape: GEShapeName.POLYGON,
//       points: [
//         [0, -25],
//         [25, 0],
//         [0, 25],
//         [-25, 0]
//       ]
//     }
//   ],
//   round: [
//     {
//       shape: GEShapeName.CIRCLE,
//       r: 25
//     }
//   ],
//   double: [
//     {
//       shape: GEShapeName.CIRCLE,
//       r: 25,
//       color: "#E9D8FD"
//     },
//     {
//       shape: GEShapeName.CIRCLE,
//       r: 15,
//       color: "white"
//     }
//   ]
// };

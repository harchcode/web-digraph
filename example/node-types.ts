import { NodeShape, EdgeShape } from "../src";

const circlePath = new Path2D();
circlePath.arc(50, 50, 50, 0, Math.PI * 2);

const rectPath = new Path2D();
rectPath.rect(0, 20, 100, 60);

export const normalNodeShape: NodeShape = {
  paths: [circlePath],
  size: 200
};

export const rectNodeShape: NodeShape = {
  paths: [rectPath],
  size: 200
};

export const normalEdgeShape: EdgeShape = {
  paths: [circlePath],
  size: 50
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

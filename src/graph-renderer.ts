import { GraphEdge, GraphNode, GraphView } from "./graph-view";

const LINE_CAP_ROUND = "round";
const LINE_CAP_SQUARE = "square";
const BG_COLOR = "#F7FAFC";
const GRID_COLOR = "#CBD5E0";

export function drawBackground(view: GraphView<GraphNode, GraphEdge>) {
  const { canvas, ctx, transform } = view;
  const [scale, translateX, translateY] = transform;

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const lw = 8 * scale;
  const gap = 64 * scale;

  const offsetX = (translateX % gap) - lw;
  const offsetY = (translateY % gap) - lw;

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = lw;

  ctx.beginPath();

  for (let i = offsetX; i < canvas.width + lw; i += gap) {
    ctx.moveTo(i, offsetY);
    ctx.lineTo(i, canvas.height + lw);
  }

  ctx.lineCap = LINE_CAP_ROUND;
  ctx.setLineDash([0, gap]);
  ctx.stroke();
  ctx.setLineDash([0]);
  ctx.lineCap = LINE_CAP_SQUARE;
}

// export function drawNode(
//   view: GraphView<GraphNode, GraphEdge>,
//   node: GraphNode
// ) {
//   // if (this.isNodeOutOfView(node)) return;

//   const { ctx, pointerPos, moveNodePos, selectedNodes, movingNode } = view;
//   const [pointerX, pointerY] = pointerPos;
//   const [moveNodeX, moveNodeY] = moveNodePos;

//   const isMovingNode = movingNode === node;
//   const x = isMovingNode ? moveNodeX : node.x;
//   const y = isMovingNode ? moveNodeY : node.y;

//   const shapes = options.nodeTypes[node.type];

//   ctx.strokeStyle = options.nodeStrokeColor;
//   ctx.lineWidth = options.nodeLineWidth;

//   ctx.beginPath();
//   this.shapePath(x, y, shapes[0]);

//   if (ctx.isPointInPath(pointerCanvasX, pointerCanvasY)) {
//     this.state.hoveredNode = node;
//   }

//   const selected = node === this.state.selectedNode;
//   const hovered = node === this.state.hoveredNode;

//   ctx.strokeStyle =
//     selected || hovered ? options.nodeSelectedColor : options.nodeStrokeColor;
//   ctx.fillStyle = shapes[0].color || options.nodeColor;

//   ctx.fill();
//   ctx.stroke();

//   this.drawSubShapes(shapes, x, y);

//   if (selected) {
//     this.drawSelectedShape(shapes[0], x, y, options.nodeSelectedColor);
//   }

//   if (selected) {
//     ctx.fillStyle = options.nodeSelectedTextColor;
//   } else {
//     ctx.fillStyle = options.nodeTextColor;
//   }

//   ctx.font = options.nodeTextStyle;
//   ctx.textAlign = TEXT_ALIGN;
//   ctx.textBaseline = TEXT_BASELINE;

//   ctx.fillText(node.text, x, y);
// }

export type GraphNode = {
  id: number;
  x: number;
  y: number;
};

export type GraphEdge = {
  id: number;
  sourceId: number;
  targetId: number;
};

export enum GraphDataType {
  NODE,
  EDGE
}

export type NodeDrawData = {
  type: GraphDataType.NODE;
  sourceOfEdgeIds: Set<number>;
  targetOfEdgeIds: Set<number>;
  path?: Path2D;
  shape: GraphShape;
};

export type EdgeDrawData = {
  type: GraphDataType.EDGE;
  shape: GraphShape;
  path?: Path2D;
  linePath?: Path2D;
  arrowPath?: Path2D;
  lineSourceX?: number;
  lineSourceY?: number;
  lineTargetX?: number;
  lineTargetY?: number;
  shapeX?: number;
  shapeY?: number;
};

export type GraphShape = {
  width: number;
  height: number;
  drawContent: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    id: number
  ) => void;
  createPath: (
    x: number,
    y: number,
    w: number,
    h: number,
    id: number
  ) => Path2D;
};

export const defaultNodeShape: GraphShape = {
  width: 160,
  height: 160,
  drawContent: (ctx, x, y, w, _h, id) => {
    ctx.fillText(`Node ID: ${id}`, x, y, w);
  },
  createPath: (x, y, w) => {
    const p = new Path2D();

    p.arc(x, y, w * 0.5, 0, Math.PI * 2);
    p.closePath();

    return p;
  }
};

export const defaultEdgeShape: GraphShape = {
  width: 48,
  height: 48,
  drawContent: (ctx, x, y, w, _h, id) => {
    ctx.fillText(id.toString(), x, y, w);
  },
  createPath: (x, y, w, h) => {
    const wh = w * 0.5;
    const hh = h * 0.5;

    const p = new Path2D();

    p.moveTo(x - wh, y);
    p.lineTo(x, y + wh);
    p.lineTo(x + wh, y);
    p.lineTo(x, y - hh);
    p.closePath();

    return p;
  }
};

export type GraphOptions = {
  width: number;
  height: number;
  bgColor: string;
  bgDotColor: string;
  bgLineWidth: number;
  bgLineGap: number;
  bgShowDots: boolean;
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
};

export const defaultGraphOptions: GraphOptions = {
  width: 100000,
  height: 100000,
  bgColor: "#f1f5f9",
  bgDotColor: "#64748b",
  bgLineWidth: 4,
  bgLineGap: 64,
  bgShowDots: true,
  minScale: 0.25,
  maxScale: 10,
  edgeLineColor: "black",
  edgeLineWidth: 2,
  edgeArrowHeight: 20,
  edgeArrowWidth: 18,
  edgeShapeColor: "white",
  edgeContentColor: "black",
  edgeTextAlign: "center",
  edgeTextBaseline: "middle",
  edgeFont: "16px sans-serif",
  edgeHoveredLineColor: "#3b82f6",
  edgeSelectedLineColor: "#2563eb",
  edgeSelectedShapeColor: "#3b82f6",
  edgeSelectedContentColor: "white",
  nodeLineColor: "black",
  nodeLineWidth: 2,
  nodeColor: "white",
  nodeContentColor: "black",
  nodeTextAlign: "center",
  nodeTextBaseline: "middle",
  nodeFont: "16px sans-serif",
  nodeHoveredLineColor: "#3b82f6",
  nodeSelectedLineColor: "#2563eb",
  nodeSelectedColor: "#3b82f6",
  nodeSelectedContentColor: "white"
};

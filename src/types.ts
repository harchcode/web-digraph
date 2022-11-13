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
  drawPath: (
    path: Path2D,
    x: number,
    y: number,
    w: number,
    h: number,
    id: number
  ) => void;
};

export const defaultNodeShape: GraphShape = {
  width: 160,
  height: 160,
  drawContent: (ctx, x, y, w, _h, id) => {
    ctx.fillText(`Node ID: ${id}`, x, y, w);
  },
  drawPath: (p, x, y, w) => {
    p.arc(x, y, w * 0.5, 0, Math.PI * 2);
    p.closePath();
  }
};

export const defaultEdgeShape: GraphShape = {
  width: 48,
  height: 48,
  drawContent: (ctx, x, y, w, _h, id) => {
    ctx.fillText(id.toString(), x, y, w);
  },
  drawPath: (p, x, y, w, h) => {
    const wh = w * 0.5;
    const hh = h * 0.5;

    p.moveTo(x - wh, y);
    p.lineTo(x, y + wh);
    p.lineTo(x + wh, y);
    p.lineTo(x, y - hh);
    p.closePath();
  }
};

export type GraphOptions = {
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
  nodeLineWidth: number;
  nodeLineColor: string;
  nodeColor: string;
  nodeContentColor: string;
  nodeTextAlign: CanvasTextAlign;
  nodeTextBaseline: CanvasTextBaseline;
  nodeFont: string;
  nodeHoveredLineColor: string;
};

export const defaultGraphOptions: GraphOptions = {
  bgColor: "#eee",
  bgDotColor: "#999",
  bgLineWidth: 8,
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
  edgeHoveredLineColor: "cornflowerblue",
  nodeLineColor: "black",
  nodeLineWidth: 2,
  nodeColor: "white",
  nodeContentColor: "black",
  nodeTextAlign: "center",
  nodeTextBaseline: "middle",
  nodeFont: "16px sans-serif",
  nodeHoveredLineColor: "cornflowerblue"
};

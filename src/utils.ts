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
  nodeLineWidth: number;
  nodeLineColor: string;
  nodeColor: string;
  nodeContentColor: string;
  nodeTextAlign: CanvasTextAlign;
  nodeTextBaseline: CanvasTextBaseline;
  nodeFont: string;
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
  nodeLineColor: "black",
  nodeLineWidth: 2,
  nodeColor: "white",
  nodeContentColor: "black",
  nodeTextAlign: "center",
  nodeTextBaseline: "middle",
  nodeFont: "16px sans-serif"
};

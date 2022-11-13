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
  nodeLineWidth: number;
  nodeLineColor: string;
  nodeColor: string;
};

export const defaultGraphOptions: GraphOptions = {
  bgColor: "#eee",
  bgDotColor: "#999",
  bgLineWidth: 4,
  bgLineGap: 32,
  bgShowDots: false,
  minScale: 0.25,
  maxScale: 10,
  edgeLineColor: "black",
  edgeLineWidth: 2,
  edgeArrowHeight: 20,
  edgeArrowWidth: 18,
  edgeShapeColor: "white",
  nodeLineColor: "black",
  nodeLineWidth: 2,
  nodeColor: "white"
};

import { GraphEdge, GraphNode } from "../src";

export type ExampleNode = GraphNode & {
  id: number;
  label: string;
};

export type ExampleEdge = GraphEdge & {
  id: number;
  label: string;
};

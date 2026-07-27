import { createGraphRenderer } from 'web-digraph';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Web Digraph Test</h1>
    <canvas id="graph-canvas" width="800" height="600" style="border: 1px solid #ccc;"></canvas>
  </div>
`;

createGraphRenderer({});

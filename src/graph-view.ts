export class GraphView {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  private translateX = 0;
  private translateY = 0;
  private scale = 1.6;

  private viewX = 0;
  private viewY = 0;
  private viewW = 0;
  private viewH = 0;

  private isDrawing = false;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.textContent = "Canvas is not supported in your browser.";
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;

    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw "Canvas is not supported in your browser.";
    }

    this.ctx = ctx;

    this.requestDraw();
    container.appendChild(this.canvas);
  }

  getTranslateX() {
    return this.translateX;
  }

  setTranslateX(v: number) {
    if (v === this.translateX) return;

    this.translateX = v;
    this.requestDraw();
  }

  getTranslateY() {
    return this.translateY;
  }

  setTranslateY(v: number) {
    if (v === this.translateY) return;

    this.translateY = v;
    this.requestDraw();
  }

  getScale() {
    return this.scale;
  }

  setScale(v: number) {
    if (v === this.scale) return;

    this.scale = v;
    this.requestDraw();
  }

  setTransform(translateX: number, translateY: number, scale: number) {
    if (
      translateX === this.translateX &&
      translateY === this.translateY &&
      scale === this.scale
    )
      return;

    this.translateX = translateX;
    this.translateY = translateY;
    this.scale = scale;

    this.requestDraw();
  }

  moveBy(x: number, y: number) {
    this.translateX += x;
    this.translateY += y;

    this.requestDraw();
  }

  private requestDraw() {
    if (!this.isDrawing) {
      requestAnimationFrame(this.requestDrawHandler);
    }

    this.isDrawing = true;
  }

  private requestDrawHandler = () => {
    this.isDrawing = false;
    this.draw();
  };

  private setView() {
    const { canvas, translateX, translateY, scale } = this;

    this.viewX = -translateX;
    this.viewY = -translateY;
    this.viewW = canvas.width / scale;
    this.viewH = canvas.height / scale;
  }

  private draw() {
    const { ctx, canvas, scale, translateX, translateY } = this;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // console.log("abc");

    ctx.setTransform(scale, 0, 0, scale, translateX, translateY);

    this.setView();

    this.drawBackground();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawBackground() {
    const { ctx, viewX, viewY, viewW, viewH } = this;

    const lw = 8;
    const gap = 64;

    ctx.strokeStyle = "#000";
    ctx.lineWidth = lw;

    const bl = viewX - lw * 0.5;
    const br = viewX + viewW + lw * 0.5;
    const bt = viewY - lw * 0.5;
    const bb = viewY + viewH + lw * 0.5;

    const ll = bl - (bl % gap);
    const lr = br - (br % gap);
    const lt = bt - (bt % gap);
    const lb = bb - (bb % gap);

    ctx.beginPath();

    for (let i = ll; i <= lr; i += gap) {
      ctx.moveTo(i | 0, lt | 0);
      ctx.lineTo(i | 0, lb | 0);
    }

    ctx.lineCap = "round";
    ctx.setLineDash([0, gap]);
    ctx.stroke();
    ctx.setLineDash([0]);
    ctx.lineCap = "square";
  }
}

export function createGraphView(container: HTMLElement) {
  return new GraphView(container);
}

const FPS = 60;
const MPF = 1000 / FPS;
const SPF = MPF * 0.001;
const raf = requestAnimationFrame || setTimeout;

export class Ticker {
  private isRunning = false;
  private startTime = 0;
  private lastTime = 0;

  private counter = 0;
  private update: (dt: number) => void;
  private draw: () => void;

  constructor(update: (dt: number) => void, draw: () => void) {
    this.update = update;
    this.draw = draw;
  }

  start = (): void => {
    this.startTime = Date.now();
    this.lastTime = this.startTime;
    this.isRunning = true;

    raf(this.run);
  };

  stop = (): void => {
    this.isRunning = false;
  };

  private run = (): void => {
    const current = Date.now();
    const dt = current - this.lastTime;

    this.counter += dt;
    this.lastTime = current;

    while (this.counter > MPF) {
      this.update(SPF);

      this.counter -= MPF;
    }

    this.draw();

    if (this.isRunning) raf(this.run);
  };
}

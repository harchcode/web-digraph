import { MIN_ZOOM, MAX_ZOOM } from "./constants";

const MIN_ZOOM_VAL = Math.round(MIN_ZOOM * 100);
const MAX_ZOOM_VAL = Math.round(MAX_ZOOM * 100);

/**
 * A custom web component for the vertical zoom slider.
 * This is completely unrelated to the core web-digraph library.
 */
export class ZoomSlider extends HTMLElement {
  private input: HTMLInputElement;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    const minVal = MIN_ZOOM_VAL;
    const maxVal = MAX_ZOOM_VAL;

    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          width: 16px;
          height: 100px;
          margin: 4px 0;
        }

        input[type="range"] {
          -webkit-appearance: none;
          width: 100px;
          height: 6px;
          background: linear-gradient(
            to right,
            var(--primary, #3b82f6) var(--val, 0%),
            #e2e8f0 var(--val, 0%)
          );
          border-radius: 3px;
          outline: none;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-90deg);
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary, #3b82f6);
          cursor: pointer;
          transition: transform 0.1s;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        @media (max-width: 600px) {
          :host {
            width: 70px;
            height: 16px;
            margin: 0;
          }
          input[type="range"] {
            width: 70px;
            transform: translate(-50%, -50%);
          }
        }
      </style>
      <input type="range" min="${minVal}" max="${maxVal}" value="100" />
    `;

    this.input = this.shadowRoot!.querySelector("input")!;
    this.updateCSS();

    this.input.addEventListener("input", () => {
      this.updateCSS();
      const val = parseInt(this.input.value, 10);
      this.dispatchEvent(
        new CustomEvent("zoom-change", {
          detail: { zoom: val / 100 },
          bubbles: true,
          composed: true
        })
      );
    });
  }

  private updateCSS() {
    const min = parseFloat(this.input.min) || MIN_ZOOM_VAL;
    const max = parseFloat(this.input.max) || MAX_ZOOM_VAL;
    const val = parseFloat(this.input.value);
    const percentage = ((val - min) / (max - min)) * 100;
    this.input.style.setProperty("--val", `${percentage}%`);
  }

  public setZoom(zoom: number) {
    this.input.value = Math.round(zoom * 100).toString();
    this.updateCSS();
  }
}

customElements.define("zoom-slider", ZoomSlider);

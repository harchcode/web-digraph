class GraphView extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });

    const tes = document.createElement("div");

    shadow.appendChild(tes);
  }

  connectedCallback() {
    this.shadowRoot.querySelector("div").textContent = "djnfjsfjsbfafnsf";
  }
}

customElements.define("graph-view", GraphView);

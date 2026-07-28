import type { GraphRenderer } from "./types.js";

export function attachDefaultInteractions(
  canvas: HTMLCanvasElement,
  renderer: GraphRenderer
): () => void {
  const onPointerDown = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const pos = renderer.screenToGraph(rawX, rawY);
    const hit = renderer.getItemAt(pos.x, pos.y);

    if (hit) {
      if (e.shiftKey) {
        const selected = renderer.getSelectedItems();
        if (selected.has(hit.id)) {
          renderer.unselect([hit.id]);
        } else {
          renderer.select([hit.id]);
        }
      } else {
        renderer.unselect();
        renderer.select([hit.id]);
      }
    } else {
      if (!e.shiftKey) {
        renderer.unselect();
      }
    }

    renderer.flush();
  };

  canvas.addEventListener("pointerdown", onPointerDown);

  // Return a cleanup function
  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
  };
}

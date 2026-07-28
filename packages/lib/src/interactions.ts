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

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      // Only delete if the user is focused on the body or the canvas
      if (
        document.activeElement === document.body ||
        document.activeElement === canvas
      ) {
        const selected = renderer.getSelectedItems();
        if (selected.size > 0) {
          for (const id of selected) {
            renderer.removeItem(id);
          }
          renderer.unselect();
          renderer.flush();
        }
      }
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("keydown", onKeyDown);

  // Return a cleanup function
  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("keydown", onKeyDown);
  };
}

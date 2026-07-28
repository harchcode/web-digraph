import type { GraphRenderer } from "./types.js";
import { defaultShape } from "./index.js";

export function attachDefaultInteractions(
  canvas: HTMLCanvasElement,
  renderer: GraphRenderer
): () => void {
  let isDraggingNode = false;
  let lastGraphX = 0;
  let lastGraphY = 0;

  let isPanning = false;
  let lastPanX = 0;
  let lastPanY = 0;

  let isCreatingEdge = false;
  let edgeSourceId: number | null = null;
  let didCreateEdgeMove = false;

  const onPointerDown = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const pos = renderer.screenToGraph(rawX, rawY);
    const hit = renderer.getItemAt(pos.x, pos.y);

    if (hit !== null) {
      if (renderer.nodes[hit]) {
        if (e.shiftKey) {
          isCreatingEdge = true;
          edgeSourceId = hit;
          didCreateEdgeMove = false;
          canvas.setPointerCapture(e.pointerId);
        } else {
          isDraggingNode = true;
          lastGraphX = pos.x;
          lastGraphY = pos.y;
          canvas.setPointerCapture(e.pointerId);
        }
      }

      if (!e.shiftKey) {
        // If clicking on an already selected node, don't clear selection so we can drag multiple
        const selected = renderer.getSelectedItems();
        if (!selected.has(hit)) {
          renderer.unselect();
          renderer.select([hit]);
        }
      }
    } else {
      if (e.shiftKey) {
        renderer.addNode(pos.x, pos.y, defaultShape);
      } else {
        isPanning = true;
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
        renderer.unselect();
      }
    }

    renderer.flush();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (isCreatingEdge && edgeSourceId !== null) {
      didCreateEdgeMove = true;
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      const pos = renderer.screenToGraph(rawX, rawY);
      renderer.setGhostEdge(edgeSourceId, pos.x, pos.y);
      renderer.flush();
    } else if (isDraggingNode) {
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      const pos = renderer.screenToGraph(rawX, rawY);
      const dx = pos.x - lastGraphX;
      const dy = pos.y - lastGraphY;

      const selected = renderer.getSelectedItems();
      for (const id of selected) {
        if (renderer.nodes[id]) {
          // skipGrid = true for speed during drag
          renderer.moveNodeBy(id, dx, dy, true);
        }
      }

      lastGraphX = pos.x;
      lastGraphY = pos.y;
      renderer.flush();
    } else if (isPanning) {
      const dx = e.clientX - lastPanX;
      const dy = e.clientY - lastPanY;
      lastPanX = e.clientX;
      lastPanY = e.clientY;

      renderer.panBy(dx, dy);
      renderer.flush();
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (isCreatingEdge) {
      if (!didCreateEdgeMove && edgeSourceId !== null) {
        // It was just a shift+click, toggle selection
        const selected = renderer.getSelectedItems();
        if (selected.has(edgeSourceId)) {
          renderer.unselect([edgeSourceId]);
        } else {
          renderer.select([edgeSourceId]);
        }
      } else if (didCreateEdgeMove && edgeSourceId !== null) {
        const rect = canvas.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        const pos = renderer.screenToGraph(rawX, rawY);
        const hit = renderer.getItemAt(pos.x, pos.y);

        if (hit !== null && renderer.nodes[hit] && hit !== edgeSourceId) {
          renderer.addEdge(edgeSourceId, hit);
        }
      }

      renderer.setGhostEdge(null);
      isCreatingEdge = false;
      edgeSourceId = null;
      didCreateEdgeMove = false;
      canvas.releasePointerCapture(e.pointerId);
      renderer.flush();
    } else if (isDraggingNode) {
      isDraggingNode = false;
      canvas.releasePointerCapture(e.pointerId);

      // Re-insert into grid now that drag is finished
      const selected = renderer.getSelectedItems();
      for (const id of selected) {
        if (renderer.nodes[id]) {
          renderer.updateNodeGrid(id);
        }
      }
    }
    if (isPanning) {
      isPanning = false;
      canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = "default";
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.002;
    const dv = -e.deltaY * zoomSensitivity;
    renderer.zoomBy(dv, e.offsetX, e.offsetY);
    renderer.flush();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Backspace" || e.key === "Delete") {
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
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel);
  window.addEventListener("keydown", onKeyDown);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKeyDown);
  };
}

import type {
  GraphRenderer,
  GraphInteractions,
  InteractionMode,
  InteractionOptions
} from "./types.js";
import { defaultShape } from "./index.js";

export function createGraphInteractions(
  canvas: HTMLCanvasElement,
  renderer: GraphRenderer,
  options?: InteractionOptions
): GraphInteractions {
  let mode: InteractionMode = "move";
  let multiSelect = false;

  let isDraggingNode = false;
  let lastGraphX = 0;
  let lastGraphY = 0;

  let isPanning = false;
  let lastPanX = 0;
  let lastPanY = 0;

  let isCreatingEdge = false;
  let edgeSourceId: number | null = null;
  let didCreateEdgeMove = false;

  const activePointers = new Map<number, PointerEvent>();
  let lastPinchDist = 0;
  let lastPinchCenterX = 0;
  let lastPinchCenterY = 0;

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault(); // Prevents mobile browser heuristics from delaying events
    activePointers.set(e.pointerId, e);
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const pos = renderer.screenToGraph(rawX, rawY);
    const hit = renderer.getItemAt(pos.x, pos.y);

    if (hit !== null) {
      if (renderer.nodes[hit]) {
        if (mode === "create") {
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
      } else if (multiSelect) {
        // It's an edge: toggle selection immediately since there's no drag/create conflict
        const selected = renderer.getSelectedItems();
        if (selected.has(hit)) {
          renderer.unselect([hit]);
        } else {
          renderer.select([hit]);
        }
      }

      if (!multiSelect) {
        // If clicking on an already selected node, don't clear selection so we can drag multiple
        const selected = renderer.getSelectedItems();
        if (!selected.has(hit)) {
          renderer.unselect();
          renderer.select([hit]);
        }
      }
    } else {
      if (mode === "create") {
        if (options?.onAddNode) {
          options.onAddNode(pos.x, pos.y);
        } else {
          renderer.addNode(pos.x, pos.y, defaultShape);
        }
      } else {
        isPanning = true;
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
        if (!multiSelect) renderer.unselect();
      }
    }

    renderer.flush();
  };

  const onPointerMove = (e: PointerEvent) => {
    e.preventDefault(); // Prevents mobile browser heuristics from delaying events

    if (activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, e);
    }

    if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const p1 = pts[0];
      const p2 = pts[1];

      const dx = p1.clientX - p2.clientX;
      const dy = p1.clientY - p2.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const cx = (p1.clientX + p2.clientX) / 2;
      const cy = (p1.clientY + p2.clientY) / 2;

      if (lastPinchDist > 0) {
        const zoomDelta = (dist - lastPinchDist) * 0.005; // Pinch sensitivity
        renderer.zoomBy(zoomDelta, cx, cy);
        options?.onZoom?.(renderer.getZoom());

        const panDx = cx - lastPinchCenterX;
        const panDy = cy - lastPinchCenterY;
        if (panDx !== 0 || panDy !== 0) {
          renderer.panBy(panDx, panDy);
        }
      }
      lastPinchDist = dist;
      lastPinchCenterX = cx;
      lastPinchCenterY = cy;
      renderer.flush();
      return;
    }

    lastPinchDist = 0;

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
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) {
      lastPinchDist = 0;
    }
    if (activePointers.size === 1) {
      // Reset dragging anchors for the remaining finger so it doesn't jump
      const remaining = Array.from(activePointers.values())[0];
      lastPanX = remaining.clientX;
      lastPanY = remaining.clientY;
      const rect = canvas.getBoundingClientRect();
      const pos = renderer.screenToGraph(
        remaining.clientX - rect.left,
        remaining.clientY - rect.top
      );
      lastGraphX = pos.x;
      lastGraphY = pos.y;
    }

    if (isCreatingEdge) {
      if (!didCreateEdgeMove && edgeSourceId !== null) {
        // It was just a click, toggle selection if multiSelect is enabled
        if (multiSelect) {
          const selected = renderer.getSelectedItems();
          if (selected.has(edgeSourceId)) {
            renderer.unselect([edgeSourceId]);
          } else {
            renderer.select([edgeSourceId]);
          }
        }
      } else if (didCreateEdgeMove && edgeSourceId !== null) {
        const rect = canvas.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        const pos = renderer.screenToGraph(rawX, rawY);
        const hit = renderer.getItemAt(pos.x, pos.y);

        if (hit !== null && renderer.nodes[hit] && hit !== edgeSourceId) {
          if (options?.onAddEdge) {
            options.onAddEdge(edgeSourceId, hit);
          } else {
            renderer.addEdge(edgeSourceId, hit);
          }
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
    options?.onZoom?.(renderer.getZoom());
    renderer.flush();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Shift") {
      multiSelect = true;
      mode = "create";
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      if (
        document.activeElement === document.body ||
        document.activeElement === canvas
      ) {
        const selected = renderer.getSelectedItems();
        if (selected.size > 0) {
          const nodeIds: number[] = [];
          const edgeIds: number[] = [];
          for (const id of selected) {
            if (renderer.nodes[id]) nodeIds.push(id);
            else if (renderer.edges[id]) edgeIds.push(id);
          }

          if (options?.onDeleteNodes && nodeIds.length > 0) {
            options.onDeleteNodes(nodeIds);
          } else {
            for (const id of nodeIds) renderer.removeItem(id);
          }

          if (options?.onDeleteEdges && edgeIds.length > 0) {
            options.onDeleteEdges(edgeIds);
          } else {
            for (const id of edgeIds) renderer.removeItem(id);
          }
          renderer.unselect();
          renderer.flush();
        }
      }
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Shift") {
      multiSelect = false;
      mode = "move";
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel);

  const bindKeys = options?.bindDefaultKeyboardHandlers !== false;
  if (bindKeys) {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  }

  return {
    setMode: (newMode: InteractionMode) => {
      mode = newMode;
    },
    getMode: () => mode,
    setMultiSelect: (active: boolean) => {
      multiSelect = active;
    },
    getMultiSelect: () => multiSelect,
    dispose: () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      if (bindKeys) {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
      }
    }
  };
}

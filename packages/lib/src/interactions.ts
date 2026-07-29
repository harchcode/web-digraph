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

  let state: "idle" | "panning" | "dragging" | "edge" = "idle";
  let downX = 0,
    downY = 0;
  let lastX = 0,
    lastY = 0;
  let hasMoved = false;
  let wasMultiTouch = false;
  let pointerDownHitWasSelected = false;
  let edgeSourceId: number | null = null;

  const activePointers = new Map<number, PointerEvent>();
  let lastPinchDist = 0;
  let lastPinchCenterX = 0;
  let lastPinchCenterY = 0;

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    if (activePointers.size >= 2) return;
    activePointers.set(e.pointerId, e);

    if (activePointers.size > 1) {
      wasMultiTouch = true;
      return;
    }
    wasMultiTouch = false;

    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    downX = e.clientX;
    downY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;
    hasMoved = false;

    const pos = renderer.screenToGraph(rawX, rawY);
    const hit = renderer.getItemAt(pos.x, pos.y);
    pointerDownHitWasSelected =
      hit !== null ? renderer.getSelectedItems().has(hit) : false;

    if (hit !== null && renderer.nodes[hit]) {
      if (!pointerDownHitWasSelected) {
        if (!multiSelect) renderer.unselect();
        renderer.select([hit]);
      }

      if (mode === "create") {
        state = "edge";
        edgeSourceId = hit;
      } else {
        state = "dragging";
      }
      canvas.setPointerCapture(e.pointerId);
    } else {
      state = "panning";
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    e.preventDefault();
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, e);

    if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(
        pts[0].clientX - pts[1].clientX,
        pts[0].clientY - pts[1].clientY
      );
      const cx = (pts[0].clientX + pts[1].clientX) / 2;
      const cy = (pts[0].clientY + pts[1].clientY) / 2;

      if (lastPinchDist > 0) {
        renderer.zoomBy((dist - lastPinchDist) * 0.005, cx, cy);
        options?.onZoom?.(renderer.getZoom());
        const panDx = cx - lastPinchCenterX,
          panDy = cy - lastPinchCenterY;
        if (panDx !== 0 || panDy !== 0) renderer.panBy(panDx, panDy);
      }
      lastPinchDist = dist;
      lastPinchCenterX = cx;
      lastPinchCenterY = cy;
      renderer.flush();
      return;
    }
    lastPinchDist = 0;

    const moveDist = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moveDist > 3) hasMoved = true;

    if (state === "edge") {
      const rect = canvas.getBoundingClientRect();
      const pos = renderer.screenToGraph(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
      if (edgeSourceId !== null)
        renderer.setGhostEdge(edgeSourceId, pos.x, pos.y);
      renderer.flush();
    } else if (state === "dragging") {
      if (e.pointerType === "touch" && !hasMoved) return;
      const rect = canvas.getBoundingClientRect();
      const pos = renderer.screenToGraph(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
      const lastPos = renderer.screenToGraph(
        lastX - rect.left,
        lastY - rect.top
      );
      const dx = pos.x - lastPos.x,
        dy = pos.y - lastPos.y;

      const nodesToMove = Array.from(renderer.getSelectedItems()).filter(
        id => renderer.nodes[id]
      );
      for (const id of nodesToMove) renderer.moveNodeBy(id, dx, dy, true);
      renderer.flush();
    } else if (state === "panning") {
      if (e.pointerType === "touch" && !hasMoved) return;
      renderer.panBy(e.clientX - lastX, e.clientY - lastY);
      renderer.flush();
    }

    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) lastPinchDist = 0;
    if (activePointers.size === 1) {
      const remaining = Array.from(activePointers.values())[0];
      lastX = remaining.clientX;
      lastY = remaining.clientY;
    }

    if (!hasMoved && !wasMultiTouch) {
      const rect = canvas.getBoundingClientRect();
      const pos = renderer.screenToGraph(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
      const hit = renderer.getItemAt(pos.x, pos.y);

      if (hit === null) {
        if (mode === "create") {
          if (options?.onAddNode) options.onAddNode(pos.x, pos.y);
          else renderer.addNode(pos.x, pos.y, defaultShape);
        }
        renderer.unselect();
      } else {
        if (multiSelect) {
          const selected = renderer.getSelectedItems();
          if (selected.has(hit)) {
            const wasAlreadySelected = renderer.nodes[hit]
              ? pointerDownHitWasSelected
              : true;
            if (wasAlreadySelected) renderer.unselect([hit]);
          } else {
            renderer.select([hit]);
          }
        } else {
          renderer.unselect();
          renderer.select([hit]);
        }
      }
    }

    if (state === "edge") {
      if (hasMoved && edgeSourceId !== null) {
        const rect = canvas.getBoundingClientRect();
        const pos = renderer.screenToGraph(
          e.clientX - rect.left,
          e.clientY - rect.top
        );
        const targetHit = renderer.getItemAt(pos.x, pos.y);

        if (
          targetHit !== null &&
          renderer.nodes[targetHit] &&
          targetHit !== edgeSourceId
        ) {
          if (options?.onAddEdge) options.onAddEdge(edgeSourceId, targetHit);
          else renderer.addEdge(edgeSourceId, targetHit);
        }
      }
      renderer.setGhostEdge(null);
    } else if (state === "dragging") {
      const nodesToUpdate = Array.from(renderer.getSelectedItems()).filter(
        id => renderer.nodes[id]
      );
      for (const id of nodesToUpdate) renderer.updateNodeGrid(id);
    }

    state = "idle";
    edgeSourceId = null;
    canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = "default";

    if (activePointers.size === 0) {
      wasMultiTouch = false;
    }

    renderer.flush();
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    renderer.zoomBy(-e.deltaY * 0.002, e.offsetX, e.offsetY);
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
          if (options?.onDeleteNodes && nodeIds.length > 0)
            options.onDeleteNodes(nodeIds);
          else for (const id of nodeIds) renderer.removeItem(id);
          if (options?.onDeleteEdges && edgeIds.length > 0)
            options.onDeleteEdges(edgeIds);
          else for (const id of edgeIds) renderer.removeItem(id);
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
    setMode: (newMode: InteractionMode) => (mode = newMode),
    getMode: () => mode,
    setMultiSelect: (active: boolean) => (multiSelect = active),
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

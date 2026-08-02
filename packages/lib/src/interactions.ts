import type {
  GraphRenderer,
  GraphInteractions,
  InteractionMode,
  InteractionOptions
} from "./types.js";

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

  const pos: [number, number] = [0, 0];
  const lastPos: [number, number] = [0, 0];

  const nodeInts = new Int32Array(renderer.nodeBuffer);
  const edgeInts = new Int32Array(renderer.edgeBuffer);

  const isNodeSelected = (id: number) =>
    (nodeInts[id * 5 + 2] & (1 << 16)) !== 0;
  const isEdgeSelected = (id: number) =>
    (edgeInts[id * 7 + 2] & (1 << 16)) !== 0;

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

    renderer.screenToGraph(rawX, rawY, pos);

    let hitId = renderer.getNodeAt(pos[0], pos[1]);
    let hitType: "node" | "edge" | null = null;

    if (hitId !== -1) {
      hitType = "node";
    } else {
      hitId = renderer.getEdgeAt(pos[0], pos[1]);
      if (hitId !== -1) hitType = "edge";
    }

    if (hitType !== null) {
      pointerDownHitWasSelected =
        hitType === "node" ? isNodeSelected(hitId) : isEdgeSelected(hitId);

      if (!pointerDownHitWasSelected) {
        if (!multiSelect) renderer.unselectAll();
        if (hitType === "node") renderer.selectNode(hitId);
        else renderer.selectEdge(hitId);
      }

      if (mode === "create" && hitType === "node") {
        state = "edge";
        edgeSourceId = hitId;
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
      const rect = canvas.getBoundingClientRect();
      const cx = (pts[0].clientX + pts[1].clientX) / 2 - rect.left;
      const cy = (pts[0].clientY + pts[1].clientY) / 2 - rect.top;

      if (lastPinchDist > 0) {
        renderer.zoomBy(dist / lastPinchDist, cx, cy);
        options?.onZoom?.(renderer.zoom);
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
      // NOTE: edge drawing disabled for now
      /*
      const rect = canvas.getBoundingClientRect();
      renderer.screenToGraph(
        e.clientX - rect.left,
        e.clientY - rect.top,
        pos
      );
      if (edgeSourceId !== null)
        renderer.setGhostEdge(edgeSourceId, pos[0], pos[1]);
      */
      renderer.flush();
    } else if (state === "dragging") {
      if (e.pointerType === "touch" && !hasMoved) return;
      // NOTE: node movement disabled for now
      /*
      const rect = canvas.getBoundingClientRect();
      renderer.screenToGraph(
        e.clientX - rect.left,
        e.clientY - rect.top,
        pos
      );
      renderer.screenToGraph(
        lastX - rect.left,
        lastY - rect.top,
        lastPos
      );
      const dx = pos[0] - lastPos[0],
        dy = pos[1] - lastPos[1];

      for (let i = 0; i < renderer.nodeCount; i++) {
        if (isNodeSelected(i)) {
          renderer.moveNodeBy(i, dx, dy);
        }
      }
      */
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
      renderer.screenToGraph(e.clientX - rect.left, e.clientY - rect.top, pos);

      let hitId = renderer.getNodeAt(pos[0], pos[1]);
      let hitType: "node" | "edge" | null = null;
      if (hitId !== -1) hitType = "node";
      else {
        hitId = renderer.getEdgeAt(pos[0], pos[1]);
        if (hitId !== -1) hitType = "edge";
      }

      if (hitType === null) {
        if (mode === "create") {
          // NOTE: node creation disabled for now
          /*
          if (options?.onAddNode) options.onAddNode(pos[0], pos[1]);
          else renderer.addNode(pos[0], pos[1], 0);
          */
        }
        renderer.unselectAll();
      } else {
        if (multiSelect) {
          const isSelected =
            hitType === "node" ? isNodeSelected(hitId) : isEdgeSelected(hitId);
          if (isSelected) {
            const wasAlreadySelected =
              hitType === "node" ? pointerDownHitWasSelected : true;
            if (wasAlreadySelected) {
              if (hitType === "node") renderer.unselectNode(hitId);
              else renderer.unselectEdge(hitId);
            }
          } else {
            if (hitType === "node") renderer.selectNode(hitId);
            else renderer.selectEdge(hitId);
          }
        } else {
          renderer.unselectAll();
          if (hitType === "node") renderer.selectNode(hitId);
          else renderer.selectEdge(hitId);
        }
      }
    }

    if (state === "edge") {
      if (hasMoved && edgeSourceId !== null) {
        // NOTE: edge creation disabled for now
        /*
        const rect = canvas.getBoundingClientRect();
        renderer.screenToGraph(
          e.clientX - rect.left,
          e.clientY - rect.top,
          pos
        );
        const targetHit = renderer.getNodeAt(pos[0], pos[1]);

        if (
          targetHit !== -1 &&
          targetHit !== edgeSourceId
        ) {
          if (options?.onAddEdge) options.onAddEdge(edgeSourceId, targetHit);
          else renderer.addEdge(edgeSourceId, targetHit, 0);
        }
        */
      }
      // renderer.setGhostEdge(-1);
    } else if (state === "dragging") {
      // nothing needed for DOD mode, tree is rebuilt on flush
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
    renderer.zoomBy(Math.exp(-e.deltaY * 0.002), e.offsetX, e.offsetY);
    options?.onZoom?.(renderer.zoom);
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
        const nodeIds: number[] = [];
        for (let i = 0; i < renderer.nodeCount; i++) {
          if (isNodeSelected(i)) nodeIds.push(i);
        }

        const edgeIds: number[] = [];
        for (let i = 0; i < renderer.edgeCount; i++) {
          if (isEdgeSelected(i)) edgeIds.push(i);
        }

        if (nodeIds.length > 0 || edgeIds.length > 0) {
          if (options?.onDeleteNodes && nodeIds.length > 0)
            options.onDeleteNodes(nodeIds);
          else for (const id of nodeIds) renderer.removeNode(id);

          if (options?.onDeleteEdges && edgeIds.length > 0)
            options.onDeleteEdges(edgeIds);
          else for (const id of edgeIds) renderer.removeEdge(id);

          renderer.unselectAll();
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

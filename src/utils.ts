// This function is to get mouse position relative to an element position in the DOM
export function getScreenToContainerPosition(
  el: HTMLElement | SVGElement,
  screenX: number,
  screenY: number
): [number, number] {
  const rect = el.getBoundingClientRect();

  const x = Math.floor(screenX - rect.left);
  const y = Math.floor(screenY - rect.top);

  return [x, y];
}

// Convert position on screen/window to position inside drawing area
export function getContainerToViewPosition(
  containerX: number,
  containerY: number,
  translateX: number,
  translateY: number,
  scale: number
): [number, number] {
  return [(containerX - translateX) / scale, (containerY - translateY) / scale];
}

export function getScreenToViewPosition(
  containerEl: HTMLElement | SVGElement,
  screenX: number,
  screenY: number,
  translateX: number,
  translateY: number,
  scale: number
): [number, number] {
  const [containerX, containerY] = getScreenToContainerPosition(
    containerEl,
    screenX,
    screenY
  );

  return getContainerToViewPosition(
    containerX,
    containerY,
    translateX,
    translateY,
    scale
  );
}

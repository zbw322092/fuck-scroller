function prefixPointerEvent (pointerEvent) {
  return window.MSPointerEvent ? 
    'MSPointer' + pointerEvent.charAt(7).toUpperCase() + pointerEvent.substr(8) :
    pointerEvent;
}

export default prefixPointerEvent;
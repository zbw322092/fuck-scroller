var hasPointer = !!(window.PointerEvent || window.MSPointerEvent); // IE10 is prefixed
var hasTouch = 'ontouchstart' in window;

export {
  hasPointer,
  hasTouch
}
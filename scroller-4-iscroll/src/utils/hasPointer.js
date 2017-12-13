var hasPointer = !!(window.PointerEvent || window.MSPointerEvent); // IE10 is prefixed

export default hasPointer;
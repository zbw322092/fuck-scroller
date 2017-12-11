/**
 * @t is the current time (or position) of the tween. This can be seconds or frames, steps, seconds, ms, whatever – as long as the unit is the same as is used for the total time [3].
 * @b is the beginning value of the property.
 * @c is the change between the beginning and destination value of the property.
 * @d is the total time of the tween.
 */

var easeInOutQuad = function easeInOutQuad(t, b, c, d) {
  t /= d / 2;
  if (t < 1) return c / 2 * t * t + b;
  t--;
  return -c / 2 * (t * (t - 2) - 1) + b;
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var jumper = function jumper() {

  var element = void 0; // element to scroll to                   (node)

  var start = void 0; // where scroll starts                    (px)
  var stop = void 0; // where scroll stops                     (px)

  var offset = void 0; // adjustment from the stop position      (px)
  var easing = void 0; // easing function                        (function)
  var a11y = void 0; // accessibility support flag             (boolean)

  var distance = void 0; // distance of scroll                     (px)
  var duration = void 0; // scroll duration                        (ms)

  var timeStart = void 0; // time scroll started                    (ms)
  var timeElapsed = void 0; // time spent scrolling thus far          (ms)

  var next = void 0; // next scroll position                   (px)

  var callback = void 0; // to call when done scrolling            (function)

  // element offset helper
  function top(element) {
    return element.getBoundingClientRect().top + start;
  }

  function location() {
    return window.scrollY || window.pageYOffset;
  }

  function loop(timeCurrent) {
    if (!timeStart) {
      timeStart = timeCurrent;
    }

    timeElapsed = timeCurrent - timeStart;

    // calculate next scroll position
    next = easing(timeElapsed, start, distance, duration);

    window.scrollTo(0, next);

    timeElapsed < duration ? window.requestAnimationFrame(loop) : done();
  }

  function done() {
    // account for rAF time rounding inaccuracies
    window.scrollTo(0, start + distance);

    // if scrolling to an element, and accessibility is enabled
    if (element && a11y) {
      // add tabindex indicating programmatic focus
      element.setAttribute('tabindex', '-1');

      // focus the element
      element.focus();
    }

    // if it exists, fire the callback
    if (typeof callback === 'function') {
      callback();
    }

    // reset time for next jump
    timeStart = false;
  }

  var jump = function jump(target) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    duration = options.duration || 1000;
    offset = options.offset || 0;
    callback = options.callback;
    easing = options.easing || easeInOutQuad;
    a11y = options.a11y || false;

    start = location();

    switch (Object.prototype.toString.call(target)) {
      // pixel
      case "[object Number]":
        element = undefined; // no element to scroll to
        a11y = false; // make sure accessibility is off
        stop = start + target; // absolute y position
        break;

      // element object
      case "[object HTMLDivElement]":
        element = target;
        stop = top(element);
        break;

      // selector
      case "[object String]":
        element = document.querySelector(target);
        stop = top(element);
        break;

      default:
        throw new Error("invalid target (target should be an element, pixel number or selector string)");
    }

    distance = stop - start + offset;

    switch (_typeof(options.duration)) {
      // number in ms
      case 'number':
        duration = options.duration;
        break;

      // function passed the distance of the scroll
      case 'function':
        duration = options.duration(distance);
        break;
    }

    window.requestAnimationFrame(loop);
  };

  return jump;
};

var singleton = jumper();

export default singleton;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianVtcC5tb2R1bGUuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9lYXNpbmcuanMiLCIuLi9zcmMvbXktc2Nyb2xsZXItanVtcGVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQHQgaXMgdGhlIGN1cnJlbnQgdGltZSAob3IgcG9zaXRpb24pIG9mIHRoZSB0d2Vlbi4gVGhpcyBjYW4gYmUgc2Vjb25kcyBvciBmcmFtZXMsIHN0ZXBzLCBzZWNvbmRzLCBtcywgd2hhdGV2ZXIg4oCTIGFzIGxvbmcgYXMgdGhlIHVuaXQgaXMgdGhlIHNhbWUgYXMgaXMgdXNlZCBmb3IgdGhlIHRvdGFsIHRpbWUgWzNdLlxuICogQGIgaXMgdGhlIGJlZ2lubmluZyB2YWx1ZSBvZiB0aGUgcHJvcGVydHkuXG4gKiBAYyBpcyB0aGUgY2hhbmdlIGJldHdlZW4gdGhlIGJlZ2lubmluZyBhbmQgZGVzdGluYXRpb24gdmFsdWUgb2YgdGhlIHByb3BlcnR5LlxuICogQGQgaXMgdGhlIHRvdGFsIHRpbWUgb2YgdGhlIHR3ZWVuLlxuICovXG5cbmNvbnN0IGVhc2VJbk91dFF1YWQgPSAodCwgYiwgYywgZCkgPT4ge1xuICB0IC89IGQgLyAyXG4gIGlmICh0IDwgMSkgcmV0dXJuIGMgLyAyICogdCAqIHQgKyBiXG4gIHQtLVxuICByZXR1cm4gLWMgLyAyICogKHQgKiAodCAtIDIpIC0gMSkgKyBiXG59XG5cbmV4cG9ydCBkZWZhdWx0IGVhc2VJbk91dFF1YWQiLCJpbXBvcnQgZWFzZUluT3V0UXVhZCBmcm9tICcuL2Vhc2luZy5qcyc7XG5cbmNvbnN0IGp1bXBlciA9ICgpID0+IHtcblxuICBsZXQgZWxlbWVudCAgICAgICAgIC8vIGVsZW1lbnQgdG8gc2Nyb2xsIHRvICAgICAgICAgICAgICAgICAgIChub2RlKVxuXG4gIGxldCBzdGFydCAgICAgICAgICAgLy8gd2hlcmUgc2Nyb2xsIHN0YXJ0cyAgICAgICAgICAgICAgICAgICAgKHB4KVxuICBsZXQgc3RvcCAgICAgICAgICAgIC8vIHdoZXJlIHNjcm9sbCBzdG9wcyAgICAgICAgICAgICAgICAgICAgIChweClcblxuICBsZXQgb2Zmc2V0ICAgICAgICAgIC8vIGFkanVzdG1lbnQgZnJvbSB0aGUgc3RvcCBwb3NpdGlvbiAgICAgIChweClcbiAgbGV0IGVhc2luZyAgICAgICAgICAvLyBlYXNpbmcgZnVuY3Rpb24gICAgICAgICAgICAgICAgICAgICAgICAoZnVuY3Rpb24pXG4gIGxldCBhMTF5ICAgICAgICAgICAgLy8gYWNjZXNzaWJpbGl0eSBzdXBwb3J0IGZsYWcgICAgICAgICAgICAgKGJvb2xlYW4pXG5cbiAgbGV0IGRpc3RhbmNlICAgICAgICAvLyBkaXN0YW5jZSBvZiBzY3JvbGwgICAgICAgICAgICAgICAgICAgICAocHgpXG4gIGxldCBkdXJhdGlvbiAgICAgICAgLy8gc2Nyb2xsIGR1cmF0aW9uICAgICAgICAgICAgICAgICAgICAgICAgKG1zKVxuXG4gIGxldCB0aW1lU3RhcnQgICAgICAgLy8gdGltZSBzY3JvbGwgc3RhcnRlZCAgICAgICAgICAgICAgICAgICAgKG1zKVxuICBsZXQgdGltZUVsYXBzZWQgICAgIC8vIHRpbWUgc3BlbnQgc2Nyb2xsaW5nIHRodXMgZmFyICAgICAgICAgIChtcylcblxuICBsZXQgbmV4dCAgICAgICAgICAgIC8vIG5leHQgc2Nyb2xsIHBvc2l0aW9uICAgICAgICAgICAgICAgICAgIChweClcblxuICBsZXQgY2FsbGJhY2sgICAgICAgIC8vIHRvIGNhbGwgd2hlbiBkb25lIHNjcm9sbGluZyAgICAgICAgICAgIChmdW5jdGlvbilcblxuICAvLyBlbGVtZW50IG9mZnNldCBoZWxwZXJcbiAgZnVuY3Rpb24gdG9wKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgKyBzdGFydFxuICB9XG5cbiAgZnVuY3Rpb24gbG9jYXRpb24oKSB7XG4gICAgcmV0dXJuIHdpbmRvdy5zY3JvbGxZIHx8IHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvb3AodGltZUN1cnJlbnQpIHtcbiAgICBpZiAoIXRpbWVTdGFydCkge1xuICAgICAgdGltZVN0YXJ0ID0gdGltZUN1cnJlbnQ7XG4gICAgfVxuXG4gICAgdGltZUVsYXBzZWQgPSB0aW1lQ3VycmVudCAtIHRpbWVTdGFydDtcblxuICAgIC8vIGNhbGN1bGF0ZSBuZXh0IHNjcm9sbCBwb3NpdGlvblxuICAgIG5leHQgPSBlYXNpbmcodGltZUVsYXBzZWQsIHN0YXJ0LCBkaXN0YW5jZSwgZHVyYXRpb24pO1xuXG4gICAgd2luZG93LnNjcm9sbFRvKDAsIG5leHQpO1xuXG4gICAgdGltZUVsYXBzZWQgPCBkdXJhdGlvblxuICAgICAgPyB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3ApXG4gICAgICA6IGRvbmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRvbmUoKSB7XG4gICAgLy8gYWNjb3VudCBmb3IgckFGIHRpbWUgcm91bmRpbmcgaW5hY2N1cmFjaWVzXG4gICAgd2luZG93LnNjcm9sbFRvKDAsIHN0YXJ0ICsgZGlzdGFuY2UpXG5cbiAgICAvLyBpZiBzY3JvbGxpbmcgdG8gYW4gZWxlbWVudCwgYW5kIGFjY2Vzc2liaWxpdHkgaXMgZW5hYmxlZFxuICAgIGlmIChlbGVtZW50ICYmIGExMXkpIHtcbiAgICAgIC8vIGFkZCB0YWJpbmRleCBpbmRpY2F0aW5nIHByb2dyYW1tYXRpYyBmb2N1c1xuICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgJy0xJyk7XG5cbiAgICAgIC8vIGZvY3VzIHRoZSBlbGVtZW50XG4gICAgICBlbGVtZW50LmZvY3VzKCk7XG4gICAgfVxuXG4gICAgLy8gaWYgaXQgZXhpc3RzLCBmaXJlIHRoZSBjYWxsYmFja1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgLy8gcmVzZXQgdGltZSBmb3IgbmV4dCBqdW1wXG4gICAgdGltZVN0YXJ0ID0gZmFsc2U7XG4gIH1cblxuICBjb25zdCBqdW1wID0gKHRhcmdldCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uIHx8IDEwMDA7XG4gICAgb2Zmc2V0ID0gb3B0aW9ucy5vZmZzZXQgfHwgMDtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnMuY2FsbGJhY2s7XG4gICAgZWFzaW5nID0gb3B0aW9ucy5lYXNpbmcgfHwgZWFzZUluT3V0UXVhZDtcbiAgICBhMTF5ID0gb3B0aW9ucy5hMTF5IHx8IGZhbHNlO1xuXG4gICAgc3RhcnQgPSBsb2NhdGlvbigpO1xuXG4gICAgc3dpdGNoIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGFyZ2V0KSkge1xuICAgICAgLy8gcGl4ZWxcbiAgICAgIGNhc2UgXCJbb2JqZWN0IE51bWJlcl1cIjpcbiAgICAgICAgZWxlbWVudCA9IHVuZGVmaW5lZDsgICAgICAgICAgIC8vIG5vIGVsZW1lbnQgdG8gc2Nyb2xsIHRvXG4gICAgICAgIGExMXkgPSBmYWxzZTsgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgYWNjZXNzaWJpbGl0eSBpcyBvZmZcbiAgICAgICAgc3RvcCA9IHN0YXJ0ICsgdGFyZ2V0OyAgICAgICAgIC8vIGFic29sdXRlIHkgcG9zaXRpb25cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIGVsZW1lbnQgb2JqZWN0XG4gICAgICBjYXNlIFwiW29iamVjdCBIVE1MRGl2RWxlbWVudF1cIjpcbiAgICAgICAgZWxlbWVudCA9IHRhcmdldDtcbiAgICAgICAgc3RvcCA9IHRvcChlbGVtZW50KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIHNlbGVjdG9yXG4gICAgICBjYXNlIFwiW29iamVjdCBTdHJpbmddXCI6XG4gICAgICAgIGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldCk7XG4gICAgICAgIHN0b3AgPSB0b3AoZWxlbWVudCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIHRhcmdldCAodGFyZ2V0IHNob3VsZCBiZSBhbiBlbGVtZW50LCBwaXhlbCBudW1iZXIgb3Igc2VsZWN0b3Igc3RyaW5nKVwiKTtcbiAgICB9XG5cbiAgICBkaXN0YW5jZSA9IHN0b3AgLSBzdGFydCArIG9mZnNldDtcblxuICAgIHN3aXRjaCAodHlwZW9mIG9wdGlvbnMuZHVyYXRpb24pIHtcbiAgICAgIC8vIG51bWJlciBpbiBtc1xuICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uO1xuICAgICAgICBicmVhaztcbiAgICAgIFxuICAgICAgLy8gZnVuY3Rpb24gcGFzc2VkIHRoZSBkaXN0YW5jZSBvZiB0aGUgc2Nyb2xsXG4gICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgIGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbihkaXN0YW5jZSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcCk7XG4gIH07XG5cbiAgcmV0dXJuIGp1bXA7XG59XG5cbmNvbnN0IHNpbmdsZXRvbiA9IGp1bXBlcigpO1xuXG5leHBvcnQgZGVmYXVsdCBzaW5nbGV0b247Il0sIm5hbWVzIjpbImVhc2VJbk91dFF1YWQiLCJ0IiwiYiIsImMiLCJkIiwianVtcGVyIiwiZWxlbWVudCIsInN0YXJ0Iiwic3RvcCIsIm9mZnNldCIsImVhc2luZyIsImExMXkiLCJkaXN0YW5jZSIsImR1cmF0aW9uIiwidGltZVN0YXJ0IiwidGltZUVsYXBzZWQiLCJuZXh0IiwiY2FsbGJhY2siLCJ0b3AiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJsb2NhdGlvbiIsIndpbmRvdyIsInNjcm9sbFkiLCJwYWdlWU9mZnNldCIsImxvb3AiLCJ0aW1lQ3VycmVudCIsInNjcm9sbFRvIiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiZG9uZSIsInNldEF0dHJpYnV0ZSIsImZvY3VzIiwianVtcCIsInRhcmdldCIsIm9wdGlvbnMiLCJPYmplY3QiLCJwcm90b3R5cGUiLCJ0b1N0cmluZyIsImNhbGwiLCJ1bmRlZmluZWQiLCJkb2N1bWVudCIsInF1ZXJ5U2VsZWN0b3IiLCJFcnJvciIsInNpbmdsZXRvbiJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7QUFPQSxJQUFNQSxnQkFBZ0IsU0FBaEJBLGFBQWdCLENBQUNDLENBQUQsRUFBSUMsQ0FBSixFQUFPQyxDQUFQLEVBQVVDLENBQVYsRUFBZ0I7T0FDL0JBLElBQUksQ0FBVDtNQUNJSCxJQUFJLENBQVIsRUFBVyxPQUFPRSxJQUFJLENBQUosR0FBUUYsQ0FBUixHQUFZQSxDQUFaLEdBQWdCQyxDQUF2Qjs7U0FFSixDQUFDQyxDQUFELEdBQUssQ0FBTCxJQUFVRixLQUFLQSxJQUFJLENBQVQsSUFBYyxDQUF4QixJQUE2QkMsQ0FBcEM7Q0FKRjs7Ozs7Ozs7QUNMQSxJQUFNRyxTQUFTLFNBQVRBLE1BQVMsR0FBTTs7TUFFZkMsZ0JBQUosQ0FGbUI7O01BSWZDLGNBQUosQ0FKbUI7TUFLZkMsYUFBSixDQUxtQjs7TUFPZkMsZUFBSixDQVBtQjtNQVFmQyxlQUFKLENBUm1CO01BU2ZDLGFBQUosQ0FUbUI7O01BV2ZDLGlCQUFKLENBWG1CO01BWWZDLGlCQUFKLENBWm1COztNQWNmQyxrQkFBSixDQWRtQjtNQWVmQyxvQkFBSixDQWZtQjs7TUFpQmZDLGFBQUosQ0FqQm1COztNQW1CZkMsaUJBQUosQ0FuQm1COzs7V0FzQlZDLEdBQVQsQ0FBYVosT0FBYixFQUFzQjtXQUNiQSxRQUFRYSxxQkFBUixHQUFnQ0QsR0FBaEMsR0FBc0NYLEtBQTdDOzs7V0FHT2EsUUFBVCxHQUFvQjtXQUNYQyxPQUFPQyxPQUFQLElBQWtCRCxPQUFPRSxXQUFoQzs7O1dBR09DLElBQVQsQ0FBY0MsV0FBZCxFQUEyQjtRQUNyQixDQUFDWCxTQUFMLEVBQWdCO2tCQUNGVyxXQUFaOzs7a0JBR1lBLGNBQWNYLFNBQTVCOzs7V0FHT0osT0FBT0ssV0FBUCxFQUFvQlIsS0FBcEIsRUFBMkJLLFFBQTNCLEVBQXFDQyxRQUFyQyxDQUFQOztXQUVPYSxRQUFQLENBQWdCLENBQWhCLEVBQW1CVixJQUFuQjs7a0JBRWNILFFBQWQsR0FDSVEsT0FBT00scUJBQVAsQ0FBNkJILElBQTdCLENBREosR0FFSUksTUFGSjs7O1dBS09BLElBQVQsR0FBZ0I7O1dBRVBGLFFBQVAsQ0FBZ0IsQ0FBaEIsRUFBbUJuQixRQUFRSyxRQUEzQjs7O1FBR0lOLFdBQVdLLElBQWYsRUFBcUI7O2NBRVhrQixZQUFSLENBQXFCLFVBQXJCLEVBQWlDLElBQWpDOzs7Y0FHUUMsS0FBUjs7OztRQUlFLE9BQU9iLFFBQVAsS0FBb0IsVUFBeEIsRUFBb0M7Ozs7O2dCQUt4QixLQUFaOzs7TUFHSWMsT0FBTyxTQUFQQSxJQUFPLENBQUNDLE1BQUQsRUFBMEI7UUFBakJDLE9BQWlCLHVFQUFQLEVBQU87O2VBQzFCQSxRQUFRcEIsUUFBUixJQUFvQixJQUEvQjthQUNTb0IsUUFBUXhCLE1BQVIsSUFBa0IsQ0FBM0I7ZUFDV3dCLFFBQVFoQixRQUFuQjthQUNTZ0IsUUFBUXZCLE1BQVIsSUFBa0JWLGFBQTNCO1dBQ09pQyxRQUFRdEIsSUFBUixJQUFnQixLQUF2Qjs7WUFFUVMsVUFBUjs7WUFFUWMsT0FBT0MsU0FBUCxDQUFpQkMsUUFBakIsQ0FBMEJDLElBQTFCLENBQStCTCxNQUEvQixDQUFSOztXQUVPLGlCQUFMO2tCQUNZTSxTQUFWLENBREY7ZUFFUyxLQUFQLENBRkY7ZUFHUy9CLFFBQVF5QixNQUFmLENBSEY7Ozs7V0FPSyx5QkFBTDtrQkFDWUEsTUFBVjtlQUNPZCxJQUFJWixPQUFKLENBQVA7Ozs7V0FJRyxpQkFBTDtrQkFDWWlDLFNBQVNDLGFBQVQsQ0FBdUJSLE1BQXZCLENBQVY7ZUFDT2QsSUFBSVosT0FBSixDQUFQOzs7O2NBSU0sSUFBSW1DLEtBQUosQ0FBVSwrRUFBVixDQUFOOzs7ZUFHT2pDLE9BQU9ELEtBQVAsR0FBZUUsTUFBMUI7O29CQUVld0IsUUFBUXBCLFFBQXZCOztXQUVPLFFBQUw7bUJBQ2FvQixRQUFRcEIsUUFBbkI7Ozs7V0FJRyxVQUFMO21CQUNhb0IsUUFBUXBCLFFBQVIsQ0FBaUJELFFBQWpCLENBQVg7Ozs7V0FJR2UscUJBQVAsQ0FBNkJILElBQTdCO0dBL0NGOztTQWtET08sSUFBUDtDQXZIRjs7QUEwSEEsSUFBTVcsWUFBWXJDLFFBQWxCOzs7OyJ9

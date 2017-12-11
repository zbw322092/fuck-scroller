(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Jump = factory());
}(this, (function () { 'use strict';

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

return singleton;

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianVtcC5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL2Vhc2luZy5qcyIsIi4uL3NyYy9teS1zY3JvbGxlci1qdW1wZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAdCBpcyB0aGUgY3VycmVudCB0aW1lIChvciBwb3NpdGlvbikgb2YgdGhlIHR3ZWVuLiBUaGlzIGNhbiBiZSBzZWNvbmRzIG9yIGZyYW1lcywgc3RlcHMsIHNlY29uZHMsIG1zLCB3aGF0ZXZlciDigJMgYXMgbG9uZyBhcyB0aGUgdW5pdCBpcyB0aGUgc2FtZSBhcyBpcyB1c2VkIGZvciB0aGUgdG90YWwgdGltZSBbM10uXG4gKiBAYiBpcyB0aGUgYmVnaW5uaW5nIHZhbHVlIG9mIHRoZSBwcm9wZXJ0eS5cbiAqIEBjIGlzIHRoZSBjaGFuZ2UgYmV0d2VlbiB0aGUgYmVnaW5uaW5nIGFuZCBkZXN0aW5hdGlvbiB2YWx1ZSBvZiB0aGUgcHJvcGVydHkuXG4gKiBAZCBpcyB0aGUgdG90YWwgdGltZSBvZiB0aGUgdHdlZW4uXG4gKi9cblxuY29uc3QgZWFzZUluT3V0UXVhZCA9ICh0LCBiLCBjLCBkKSA9PiB7XG4gIHQgLz0gZCAvIDJcbiAgaWYgKHQgPCAxKSByZXR1cm4gYyAvIDIgKiB0ICogdCArIGJcbiAgdC0tXG4gIHJldHVybiAtYyAvIDIgKiAodCAqICh0IC0gMikgLSAxKSArIGJcbn1cblxuZXhwb3J0IGRlZmF1bHQgZWFzZUluT3V0UXVhZCIsImltcG9ydCBlYXNlSW5PdXRRdWFkIGZyb20gJy4vZWFzaW5nLmpzJztcblxuY29uc3QganVtcGVyID0gKCkgPT4ge1xuXG4gIGxldCBlbGVtZW50ICAgICAgICAgLy8gZWxlbWVudCB0byBzY3JvbGwgdG8gICAgICAgICAgICAgICAgICAgKG5vZGUpXG5cbiAgbGV0IHN0YXJ0ICAgICAgICAgICAvLyB3aGVyZSBzY3JvbGwgc3RhcnRzICAgICAgICAgICAgICAgICAgICAocHgpXG4gIGxldCBzdG9wICAgICAgICAgICAgLy8gd2hlcmUgc2Nyb2xsIHN0b3BzICAgICAgICAgICAgICAgICAgICAgKHB4KVxuXG4gIGxldCBvZmZzZXQgICAgICAgICAgLy8gYWRqdXN0bWVudCBmcm9tIHRoZSBzdG9wIHBvc2l0aW9uICAgICAgKHB4KVxuICBsZXQgZWFzaW5nICAgICAgICAgIC8vIGVhc2luZyBmdW5jdGlvbiAgICAgICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbilcbiAgbGV0IGExMXkgICAgICAgICAgICAvLyBhY2Nlc3NpYmlsaXR5IHN1cHBvcnQgZmxhZyAgICAgICAgICAgICAoYm9vbGVhbilcblxuICBsZXQgZGlzdGFuY2UgICAgICAgIC8vIGRpc3RhbmNlIG9mIHNjcm9sbCAgICAgICAgICAgICAgICAgICAgIChweClcbiAgbGV0IGR1cmF0aW9uICAgICAgICAvLyBzY3JvbGwgZHVyYXRpb24gICAgICAgICAgICAgICAgICAgICAgICAobXMpXG5cbiAgbGV0IHRpbWVTdGFydCAgICAgICAvLyB0aW1lIHNjcm9sbCBzdGFydGVkICAgICAgICAgICAgICAgICAgICAobXMpXG4gIGxldCB0aW1lRWxhcHNlZCAgICAgLy8gdGltZSBzcGVudCBzY3JvbGxpbmcgdGh1cyBmYXIgICAgICAgICAgKG1zKVxuXG4gIGxldCBuZXh0ICAgICAgICAgICAgLy8gbmV4dCBzY3JvbGwgcG9zaXRpb24gICAgICAgICAgICAgICAgICAgKHB4KVxuXG4gIGxldCBjYWxsYmFjayAgICAgICAgLy8gdG8gY2FsbCB3aGVuIGRvbmUgc2Nyb2xsaW5nICAgICAgICAgICAgKGZ1bmN0aW9uKVxuXG4gIC8vIGVsZW1lbnQgb2Zmc2V0IGhlbHBlclxuICBmdW5jdGlvbiB0b3AoZWxlbWVudCkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCArIHN0YXJ0XG4gIH1cblxuICBmdW5jdGlvbiBsb2NhdGlvbigpIHtcbiAgICByZXR1cm4gd2luZG93LnNjcm9sbFkgfHwgd2luZG93LnBhZ2VZT2Zmc2V0O1xuICB9XG5cbiAgZnVuY3Rpb24gbG9vcCh0aW1lQ3VycmVudCkge1xuICAgIGlmICghdGltZVN0YXJ0KSB7XG4gICAgICB0aW1lU3RhcnQgPSB0aW1lQ3VycmVudDtcbiAgICB9XG5cbiAgICB0aW1lRWxhcHNlZCA9IHRpbWVDdXJyZW50IC0gdGltZVN0YXJ0O1xuXG4gICAgLy8gY2FsY3VsYXRlIG5leHQgc2Nyb2xsIHBvc2l0aW9uXG4gICAgbmV4dCA9IGVhc2luZyh0aW1lRWxhcHNlZCwgc3RhcnQsIGRpc3RhbmNlLCBkdXJhdGlvbik7XG5cbiAgICB3aW5kb3cuc2Nyb2xsVG8oMCwgbmV4dCk7XG5cbiAgICB0aW1lRWxhcHNlZCA8IGR1cmF0aW9uXG4gICAgICA/IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcClcbiAgICAgIDogZG9uZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gZG9uZSgpIHtcbiAgICAvLyBhY2NvdW50IGZvciByQUYgdGltZSByb3VuZGluZyBpbmFjY3VyYWNpZXNcbiAgICB3aW5kb3cuc2Nyb2xsVG8oMCwgc3RhcnQgKyBkaXN0YW5jZSlcblxuICAgIC8vIGlmIHNjcm9sbGluZyB0byBhbiBlbGVtZW50LCBhbmQgYWNjZXNzaWJpbGl0eSBpcyBlbmFibGVkXG4gICAgaWYgKGVsZW1lbnQgJiYgYTExeSkge1xuICAgICAgLy8gYWRkIHRhYmluZGV4IGluZGljYXRpbmcgcHJvZ3JhbW1hdGljIGZvY3VzXG4gICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnLTEnKTtcblxuICAgICAgLy8gZm9jdXMgdGhlIGVsZW1lbnRcbiAgICAgIGVsZW1lbnQuZm9jdXMoKTtcbiAgICB9XG5cbiAgICAvLyBpZiBpdCBleGlzdHMsIGZpcmUgdGhlIGNhbGxiYWNrXG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICAvLyByZXNldCB0aW1lIGZvciBuZXh0IGp1bXBcbiAgICB0aW1lU3RhcnQgPSBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IGp1bXAgPSAodGFyZ2V0LCBvcHRpb25zID0ge30pID0+IHtcbiAgICBkdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24gfHwgMTAwMDtcbiAgICBvZmZzZXQgPSBvcHRpb25zLm9mZnNldCB8fCAwO1xuICAgIGNhbGxiYWNrID0gb3B0aW9ucy5jYWxsYmFjaztcbiAgICBlYXNpbmcgPSBvcHRpb25zLmVhc2luZyB8fCBlYXNlSW5PdXRRdWFkO1xuICAgIGExMXkgPSBvcHRpb25zLmExMXkgfHwgZmFsc2U7XG5cbiAgICBzdGFydCA9IGxvY2F0aW9uKCk7XG5cbiAgICBzd2l0Y2ggKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0YXJnZXQpKSB7XG4gICAgICAvLyBwaXhlbFxuICAgICAgY2FzZSBcIltvYmplY3QgTnVtYmVyXVwiOlxuICAgICAgICBlbGVtZW50ID0gdW5kZWZpbmVkOyAgICAgICAgICAgLy8gbm8gZWxlbWVudCB0byBzY3JvbGwgdG9cbiAgICAgICAgYTExeSA9IGZhbHNlOyAgICAgICAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSBhY2Nlc3NpYmlsaXR5IGlzIG9mZlxuICAgICAgICBzdG9wID0gc3RhcnQgKyB0YXJnZXQ7ICAgICAgICAgLy8gYWJzb2x1dGUgeSBwb3NpdGlvblxuICAgICAgICBicmVhaztcblxuICAgICAgLy8gZWxlbWVudCBvYmplY3RcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEhUTUxEaXZFbGVtZW50XVwiOlxuICAgICAgICBlbGVtZW50ID0gdGFyZ2V0O1xuICAgICAgICBzdG9wID0gdG9wKGVsZW1lbnQpO1xuICAgICAgICBicmVhaztcblxuICAgICAgLy8gc2VsZWN0b3JcbiAgICAgIGNhc2UgXCJbb2JqZWN0IFN0cmluZ11cIjpcbiAgICAgICAgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0KTtcbiAgICAgICAgc3RvcCA9IHRvcChlbGVtZW50KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgdGFyZ2V0ICh0YXJnZXQgc2hvdWxkIGJlIGFuIGVsZW1lbnQsIHBpeGVsIG51bWJlciBvciBzZWxlY3RvciBzdHJpbmcpXCIpO1xuICAgIH1cblxuICAgIGRpc3RhbmNlID0gc3RvcCAtIHN0YXJ0ICsgb2Zmc2V0O1xuXG4gICAgc3dpdGNoICh0eXBlb2Ygb3B0aW9ucy5kdXJhdGlvbikge1xuICAgICAgLy8gbnVtYmVyIGluIG1zXG4gICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICBkdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb247XG4gICAgICAgIGJyZWFrO1xuICAgICAgXG4gICAgICAvLyBmdW5jdGlvbiBwYXNzZWQgdGhlIGRpc3RhbmNlIG9mIHRoZSBzY3JvbGxcbiAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uKGRpc3RhbmNlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShsb29wKTtcbiAgfTtcblxuICByZXR1cm4ganVtcDtcbn1cblxuY29uc3Qgc2luZ2xldG9uID0ganVtcGVyKCk7XG5cbmV4cG9ydCBkZWZhdWx0IHNpbmdsZXRvbjsiXSwibmFtZXMiOlsiZWFzZUluT3V0UXVhZCIsInQiLCJiIiwiYyIsImQiLCJqdW1wZXIiLCJlbGVtZW50Iiwic3RhcnQiLCJzdG9wIiwib2Zmc2V0IiwiZWFzaW5nIiwiYTExeSIsImRpc3RhbmNlIiwiZHVyYXRpb24iLCJ0aW1lU3RhcnQiLCJ0aW1lRWxhcHNlZCIsIm5leHQiLCJjYWxsYmFjayIsInRvcCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsImxvY2F0aW9uIiwid2luZG93Iiwic2Nyb2xsWSIsInBhZ2VZT2Zmc2V0IiwibG9vcCIsInRpbWVDdXJyZW50Iiwic2Nyb2xsVG8iLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJkb25lIiwic2V0QXR0cmlidXRlIiwiZm9jdXMiLCJqdW1wIiwidGFyZ2V0Iiwib3B0aW9ucyIsIk9iamVjdCIsInByb3RvdHlwZSIsInRvU3RyaW5nIiwiY2FsbCIsInVuZGVmaW5lZCIsImRvY3VtZW50IiwicXVlcnlTZWxlY3RvciIsIkVycm9yIiwic2luZ2xldG9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7Ozs7OztBQU9BLElBQU1BLGdCQUFnQixTQUFoQkEsYUFBZ0IsQ0FBQ0MsQ0FBRCxFQUFJQyxDQUFKLEVBQU9DLENBQVAsRUFBVUMsQ0FBVixFQUFnQjtPQUMvQkEsSUFBSSxDQUFUO01BQ0lILElBQUksQ0FBUixFQUFXLE9BQU9FLElBQUksQ0FBSixHQUFRRixDQUFSLEdBQVlBLENBQVosR0FBZ0JDLENBQXZCOztTQUVKLENBQUNDLENBQUQsR0FBSyxDQUFMLElBQVVGLEtBQUtBLElBQUksQ0FBVCxJQUFjLENBQXhCLElBQTZCQyxDQUFwQztDQUpGOzs7Ozs7OztBQ0xBLElBQU1HLFNBQVMsU0FBVEEsTUFBUyxHQUFNOztNQUVmQyxnQkFBSixDQUZtQjs7TUFJZkMsY0FBSixDQUptQjtNQUtmQyxhQUFKLENBTG1COztNQU9mQyxlQUFKLENBUG1CO01BUWZDLGVBQUosQ0FSbUI7TUFTZkMsYUFBSixDQVRtQjs7TUFXZkMsaUJBQUosQ0FYbUI7TUFZZkMsaUJBQUosQ0FabUI7O01BY2ZDLGtCQUFKLENBZG1CO01BZWZDLG9CQUFKLENBZm1COztNQWlCZkMsYUFBSixDQWpCbUI7O01BbUJmQyxpQkFBSixDQW5CbUI7OztXQXNCVkMsR0FBVCxDQUFhWixPQUFiLEVBQXNCO1dBQ2JBLFFBQVFhLHFCQUFSLEdBQWdDRCxHQUFoQyxHQUFzQ1gsS0FBN0M7OztXQUdPYSxRQUFULEdBQW9CO1dBQ1hDLE9BQU9DLE9BQVAsSUFBa0JELE9BQU9FLFdBQWhDOzs7V0FHT0MsSUFBVCxDQUFjQyxXQUFkLEVBQTJCO1FBQ3JCLENBQUNYLFNBQUwsRUFBZ0I7a0JBQ0ZXLFdBQVo7OztrQkFHWUEsY0FBY1gsU0FBNUI7OztXQUdPSixPQUFPSyxXQUFQLEVBQW9CUixLQUFwQixFQUEyQkssUUFBM0IsRUFBcUNDLFFBQXJDLENBQVA7O1dBRU9hLFFBQVAsQ0FBZ0IsQ0FBaEIsRUFBbUJWLElBQW5COztrQkFFY0gsUUFBZCxHQUNJUSxPQUFPTSxxQkFBUCxDQUE2QkgsSUFBN0IsQ0FESixHQUVJSSxNQUZKOzs7V0FLT0EsSUFBVCxHQUFnQjs7V0FFUEYsUUFBUCxDQUFnQixDQUFoQixFQUFtQm5CLFFBQVFLLFFBQTNCOzs7UUFHSU4sV0FBV0ssSUFBZixFQUFxQjs7Y0FFWGtCLFlBQVIsQ0FBcUIsVUFBckIsRUFBaUMsSUFBakM7OztjQUdRQyxLQUFSOzs7O1FBSUUsT0FBT2IsUUFBUCxLQUFvQixVQUF4QixFQUFvQzs7Ozs7Z0JBS3hCLEtBQVo7OztNQUdJYyxPQUFPLFNBQVBBLElBQU8sQ0FBQ0MsTUFBRCxFQUEwQjtRQUFqQkMsT0FBaUIsdUVBQVAsRUFBTzs7ZUFDMUJBLFFBQVFwQixRQUFSLElBQW9CLElBQS9CO2FBQ1NvQixRQUFReEIsTUFBUixJQUFrQixDQUEzQjtlQUNXd0IsUUFBUWhCLFFBQW5CO2FBQ1NnQixRQUFRdkIsTUFBUixJQUFrQlYsYUFBM0I7V0FDT2lDLFFBQVF0QixJQUFSLElBQWdCLEtBQXZCOztZQUVRUyxVQUFSOztZQUVRYyxPQUFPQyxTQUFQLENBQWlCQyxRQUFqQixDQUEwQkMsSUFBMUIsQ0FBK0JMLE1BQS9CLENBQVI7O1dBRU8saUJBQUw7a0JBQ1lNLFNBQVYsQ0FERjtlQUVTLEtBQVAsQ0FGRjtlQUdTL0IsUUFBUXlCLE1BQWYsQ0FIRjs7OztXQU9LLHlCQUFMO2tCQUNZQSxNQUFWO2VBQ09kLElBQUlaLE9BQUosQ0FBUDs7OztXQUlHLGlCQUFMO2tCQUNZaUMsU0FBU0MsYUFBVCxDQUF1QlIsTUFBdkIsQ0FBVjtlQUNPZCxJQUFJWixPQUFKLENBQVA7Ozs7Y0FJTSxJQUFJbUMsS0FBSixDQUFVLCtFQUFWLENBQU47OztlQUdPakMsT0FBT0QsS0FBUCxHQUFlRSxNQUExQjs7b0JBRWV3QixRQUFRcEIsUUFBdkI7O1dBRU8sUUFBTDttQkFDYW9CLFFBQVFwQixRQUFuQjs7OztXQUlHLFVBQUw7bUJBQ2FvQixRQUFRcEIsUUFBUixDQUFpQkQsUUFBakIsQ0FBWDs7OztXQUlHZSxxQkFBUCxDQUE2QkgsSUFBN0I7R0EvQ0Y7O1NBa0RPTyxJQUFQO0NBdkhGOztBQTBIQSxJQUFNVyxZQUFZckMsUUFBbEI7Ozs7Ozs7OyJ9

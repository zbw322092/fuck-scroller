import easeInOutQuad from './easing.js';

const jumper = () => {

  let element         // element to scroll to                   (node)

  let start           // where scroll starts                    (px)
  let stop            // where scroll stops                     (px)

  let offset          // adjustment from the stop position      (px)
  let easing          // easing function                        (function)
  let a11y            // accessibility support flag             (boolean)

  let distance        // distance of scroll                     (px)
  let duration        // scroll duration                        (ms)

  let timeStart       // time scroll started                    (ms)
  let timeElapsed     // time spent scrolling thus far          (ms)

  let next            // next scroll position                   (px)

  let callback        // to call when done scrolling            (function)

  // element offset helper
  function top(element) {
    return element.getBoundingClientRect().top + start
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

    timeElapsed < duration
      ? window.requestAnimationFrame(loop)
      : done();
  }

  function done() {
    // account for rAF time rounding inaccuracies
    window.scrollTo(0, start + distance)

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

  const jump = (target, options = {}) => {
    duration = options.duration || 1000;
    offset = options.offset || 0;
    callback = options.callback;
    easing = options.easing || easeInOutQuad;
    a11y = options.a11y || false;

    start = location();

    switch (Object.prototype.toString.call(target)) {
      // pixel
      case "[object Number]":
        element = undefined;           // no element to scroll to
        a11y = false;                  // make sure accessibility is off
        stop = start + target;         // absolute y position
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

    switch (typeof options.duration) {
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
}

const singleton = jumper();

export default singleton;
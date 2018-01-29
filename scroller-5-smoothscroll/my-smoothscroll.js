var w = window;
var d = document;

function isMicrosoftBrowser(userAgent) {
  var userAgentPatterns = ['MSIE ', 'Trident/', 'Edge/'];

  return new RegExp(userAgentPatterns.join('|')).test(userAgent);
}

function polyfill() {
  var documentStyle = d.documentElement.style;

  // natively support. Do nothing.
  if ('scrollBehavior' in documentStyle &&
    w.__forceSmoothScrollPolyfill__ !== true) {
    return;
  }

  var Element = w.HTMLElement || w.Element;
  var SCROLL_TIME = 468;

  var ROUNDING_TOLERANCE = isMicrosoftBrowser(w.navigator.userAgent) ? 1 : 0;

  function scrollElement(x, y) {
    this.scrollLeft = x;
    this.scrollTop = y;
  }

  var original = {
    scroll: w.scroll || w.scrollTo,
    scrollBy: w.scrollBy,
    elementScroll: Element.prototype.scroll || scrollElement,
    scrollIntoView: Element.prototype.scrollIntoView
  };

  var now = w.performance && w.performance.now
    ? w.performance.now.bind(w.performance)
    : Date.now;


  function ease(k) {
    return 0.5 * (1 - Math.cos(Math.PI * k));
  }

  function shouldBailOut(firstArg) {
    if (firstArg === null
      || typeof firstArg !== 'object'
      || firstArg.behavior === undefined
      || firstArg.behavior === 'auto'
      || firstArg.behavior === 'instant') {
      // first argument is not an object/null
      // or behavior is auto, instant or undefined
      return true;
    }

    if (typeof firstArg === 'object' && firstArg.behavior === 'smooth') {
      // first argument is an object and behavior is smooth
      return false;
    }

    // throw error when behavior is not supported
    throw new TypeError(
      'behavior member of ScrollOptions '
      + firstArg.behavior
      + ' is not a valid value for enumeration ScrollBehavior.'
    );
  }

  function hasScrollableSpace(el, axis) {
    if (axis === 'Y') {
      return (el.clientHeight + ROUNDING_TOLERANCE) < el.scrollHeight;
    }

    if (axis === 'X') {
      return (el.clientWidth + ROUNDING_TOLERANCE) < el.scrollWidth;
    }
  }

  function canOverflow(el, axis) {
    var overflowValue = w.getComputedStyle(el, null)['overflow' + axis];

    return overflowValue === 'auto' || overflowValue === 'scroll';
  }

  function isScrollable(el) {
    var isScrollableY = hasScrollableSpace(el, 'Y') && canOverflow(el, 'Y');
    var isScrollableX = hasScrollableSpace(el, 'X') && canOverflow(el, 'X');

    return isScrollableY || isScrollableX;
  }

  function findScrollableParent(el) {
    var isBody;

    do {
      el = el.parentNode;

      isBody = el === d.body;
    } while (isBody === false && isScrollable(el) === false);

    isBody = null;

    return el;
  }

  
}
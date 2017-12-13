var easings = {
  quadratic: {
    style: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    fn: function (k) {
      return k * (2 - k);
    }
  },
  circular: {
    style: 'cubic-bezier(0.1, 0.57, 0.1, 1)', // Not properly "circular" but this looks better, it should be (0.075, 0.82, 0.165, 1)
    fn: function (k) {
      return Math.sqrt(1 - --k * k);
    }
  },
  back: {
    style: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    fn: function (k) {
      var b = 4;
      return (k = k - 1) * k * ((b + 1) * k + b) + 1;
    }
  },
  bounce: {
    style: '',
    fn: function (k) {
      if ((k /= 1) < 1 / 2.75) {
        return 7.5625 * k * k;
      } else if (k < 2 / 2.75) {
        return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75;
      } else if (k < 2.5 / 2.75) {
        return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375;
      } else {
        return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375;
      }
    }
  },
  elastic: {
    style: '',
    fn: function (k) {
      var f = 0.22,
          e = 0.4;

      if (k === 0) {
        return 0;
      }
      if (k == 1) {
        return 1;
      }

      return e * Math.pow(2, -10 * k) * Math.sin((k - f / 4) * (2 * Math.PI) / f) + 1;
    }
  }
};

var _elementStyle = document.createElement('div').style;

var _vendor = function () {
  var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
      transform,
      i = 0,
      l = vendors.length;

  while (i < l) {
    transform = vendors[i] + 'ransform';
    if (transform in _elementStyle) {
      return vendors[i].substr(0, vendors[i].length - 1);
    }
    i++;
  }

  return false;
}();

function _prefixStyle(style) {
  if (_vendor === false) return false; // no vendor found
  if (_vendor === '') return style; // no prefix needed
  return _vendor + style.charAt(0).toUpperCase() + style.substr(1); // otherwise add prefix
}

// style that has vendor prefix, eg: webkitTransform
var style = {
  transform: _prefixStyle('transform'),
  transitionTimingFunction: _prefixStyle('transitionTimingFunction'),
  transitionDuration: _prefixStyle('transitionDuration'),
  transitionDelay: _prefixStyle('transitionDelay'),
  transformOrigin: _prefixStyle('transformOrigin'),
  touchAction: _prefixStyle('touchAction')
};

var isBadAndroid = function () {
  var appVersion = window.navigator.appVersion;

  if (/Android/.test(appVersion) && !/Chrome\/\d/.test(appVersion)) {
    var safariVersion = appVersion.match(/Safari\/(\d+.\d)/);
    if (safariVersion && typeof safariVersion === "object" && safariVersion.length >= 2) {
      return parseFloat(safariVersion[1]) < 535.19;
    } else {
      return true;
    }
  } else {
    return false;
  }
}();

/**
 * 1. Date.prototype.getTime has BETTER compatibility than Date.now
 * reference: 
 *  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime#Browser_compatibility
 *  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Browser_compatibility
 * 
 * 2. Date.prototype.getTime speed is SLOWSER than Date.now
 * reference:
 *  https://jsperf.com/date-now-vs-date-gettime/7
 */

var getTime = Date.now || function getTime() {
  return new Date().getTime();
};

var offset = function (el) {
  var left = -el.offsetLeft,
      top = -el.offsetTop;

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
   * Returns null when the element has style.display set to "none". The offsetParent 
   * is useful because offsetTop and offsetLeft are relative to its padding edge.
   */
  while (el = el.offsetParent) {
    left -= el.offsetLeft;
    top -= el.offsetTop;
  }

  return {
    left: left,
    top: top
  };
};

function getRect(el) {
  if (el instanceof SVGElement) {
    var rect = el.getBoundingClientRect();

    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    };
  } else {
    return {
      top: el.offsetTop,
      left: el.offsetLeft,
      width: el.offsetWidth,
      height: el.offsetHeight
    };
  }
}

var hasPointer = !!(window.PointerEvent || window.MSPointerEvent); // IE10 is prefixed
var hasTouch = 'ontouchstart' in window;

var getTouchAction = function (eventPassthrough, addPinch) {
  var touchAction = 'none';
  if (eventPassthrough === 'vertical') {
    touchAction = 'pan-y';
  } else if (eventPassthrough === 'horizontal') {
    touchAction = 'pan-x';
  }

  if (addPinch && touchAction != 'none') {
    // add pinch-zoom support if the browser supports it, but if not (eg. Chrome <55) do nothing
    touchAction += ' pinch-zoom';
  }
  return touchAction;
};

function addEvent(el, type, fn, capture) {
  el.addEventListener(type, fn, !!capture);
}

function removeEvent(el, type, fn, capture) {
  el.removeEventListener(type, fn, !!capture);
}

var rAF = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
  window.setTimeout(callback, 1000 / 60);
};

function Iscroll(elem, options) {
  /**
   * get scroll node element
   */
  this.wrapper = typeof elem === 'string' ? document.querySelector(elem) : elem;
  this.scroller = this.wrapper.children[0];
  this.scrollerStyle = this.scroller.style;

  /**
   * merge default options and customized options
   */
  this.options = {
    disablePointer: !hasPointer,
    disableTouch: hasPointer || !hasTouch,
    disableMouse: hasPointer || !hasTouch,
    useTransition: true,
    useTransform: true,
    scrollY: true,
    startX: 0,
    startY: 0,
    bindToWrapper: typeof window.onmousedown === "undefined"
  };

  for (var i in options) {
    this.options[i] = options[i];
  }

  this.options.eventPassthrough = this.options.eventPassthrough === true ? 'vertical' : this.options.eventPassthrough;

  // If you want eventPassthrough I have to lock one of the axes
  this.options.scrollY = this.options.eventPassthrough == 'vertical' ? false : this.options.scrollY;
  this.options.scrollX = this.options.eventPassthrough == 'horizontal' ? false : this.options.scrollX;

  this.options.bounceEasing = typeof this.options.bounceEasing == 'string' ? easings[this.options.bounceEasing] || easings.circular : this.options.bounceEasing;

  this.x = 0;
  this.y = 0;

  this._init();
  this.refresh();
  this.scrollTo(this.options.startX, this.options.startY);
}

Iscroll.prototype = {

  _init: function () {
    this._initEvents();
  },

  _initEvents: function (remove) {
    var eventType = remove ? removeEvent : addEvent,
        target = this.options.bindToWrapper ? this.wrapper : window;

    eventType(window, 'orientationchange', this);
    eventType(window, 'resize', this);

    if (this.options.click) {
      eventType(this.wrapper, 'click', this, true);
    }

    if (!this.options.disableMouse) {
      eventType(this.wrapper, 'mousedown', this);
      eventType(target, 'mousemove', this);
      eventType(target, 'mousecancel', this);
      eventType(target, 'mouseup', this);
    }

    if (hasPointer && !this.options.disablePointer) {
      eventType(this.wrapper, utils.prefixPointerEvent('pointerdown'), this);
      eventType(target, utils.prefixPointerEvent('pointermove'), this);
      eventType(target, utils.prefixPointerEvent('pointercancel'), this);
      eventType(target, utils.prefixPointerEvent('pointerup'), this);
    }

    if (hasTouch && !this.options.disableTouch) {
      eventType(this.wrapper, 'touchstart', this);
      eventType(target, 'touchmove', this);
      eventType(target, 'touchcancel', this);
      eventType(target, 'touchend', this);
    }

    eventType(this.scroller, 'transitionend', this);
    eventType(this.scroller, 'webkitTransitionEnd', this);
    eventType(this.scroller, 'oTransitionEnd', this);
    eventType(this.scroller, 'MSTransitionEnd', this);
  },

  scrollTo: function (x, y, time, easing) {
    easing = easing || easings.circular;
    this.isInTransition = this.options.useTransition && time > 0;
    var transitionType = this.options.useTransition && easing.style;

    if (!time || transitionType) {
      if (transitionType) {
        this._transitionTimingFunction(easing.style);
        this._transitionTime(time);
      }
      this._translate(x, y);
    } else {
      this._animate(x, y, time, easing.fn);
    }
  },

  scrollToElement: function (el, time, offsetX, offsetY, easing) {
    el = el.nodeType ? el : this.scroller.querySelector(el);

    // if no element selected, then return
    if (!el) {
      return;
    }

    var pos = offset(el);
  },

  _transitionTimingFunction: function (easingStyle) {
    // assign easing css style to scroll container transitionTimingFunction property
    // example: cubic-bezier(0.25, 0.46, 0.45, 0.94)
    this.scrollerStyle[style.transitionTimingFunction] = easingStyle;
  },

  _transitionTime: function (time) {
    // if do not use transition to scroll, return
    if (!this.options.useTransition) {
      return;
    }

    time = time || 0;
    // transitionDuration which has vendor prefix
    var durationProp = style.transitionDuration;
    if (!durationProp) {
      // if no vendor found, durationProp will be false
      return;
    }

    this.scrollerStyle[durationProp] = time + 'ms'; // assign ms to transitionDuration prop

    if (!time && isBadAndroid) {
      this.scrollerStyle[durationProp] = '0.0001ms';
      var self = this;

      rAF(function () {
        if (self.scrollerStyle[durationProp] === '0.0001ms') {
          self.scrollerStyle[durationProp] = '0s';
        }
      });
    }
  },

  _translate: function (x, y) {
    if (this.options.useTransform) {

      this.scrollerStyle[style.transform] = 'translate(' + x + 'px,' + y + 'px)' + 'translateZ(0)';
    } else {
      x = Math.round(x);
      y = Math.round(y);
      this.scrollerStyle.left = x + 'px';
      this.scrollerStyle.top = y + 'px';
    }

    this.x = x;
    this.y = y;
  },

  _animate: function (destX, destY, duration, easingFn) {
    var that = this,
        startX = this.x,
        startY = this.y,
        startTime = getTime(),
        destTime = startTime + duration;

    function step() {
      var now = getTime(),
          newX,
          newY,
          easing;

      if (now >= destTime) {
        that.isAnimating = false;
        that._translate(destX, destY);

        return;
      }

      now = (now - startTime) / duration;
      easing = easingFn(now);
      newX = (destX - startX) * easing + startX;
      newY = (destY - startY) * easing + startY;
      that._translate(newX, newY);

      if (that.isAnimating) {
        rAF(step);
      }
    }

    this.isAnimating = true;
    step();
  },

  refresh: function () {
    getRect(this.wrapper); // Force reflow

    this.wrapperWidth = this.wrapper.clientWidth;
    this.wrapperHeight = this.wrapper.clientHeight;

    var rect = getRect(this.scroller);

    this.scrollerWidth = rect.width;
    this.scrollerHeight = rect.height;

    /**
     * this.maxScrollX or this.maxScrollY smaller than 0, meaning
     * overflow happened.
     */
    this.maxScrollX = this.wrapperWidth - this.scrollerWidth;
    this.maxScrollY = this.wrapperHeight - this.scrollerHeight;

    /**
     * option enables scroll AND overflow exists
     */
    this.hasHorizontalScroll = this.options.scrollX && this.maxScrollX < 0;
    this.hasVerticalScroll = this.options.scrollY && this.maxScrollY < 0;

    if (!this.hasHorizontalScroll) {
      this.maxScrollX = 0;
      this.scrollerWidth = this.wrapperWidth;
    }

    if (!this.hasVerticalScroll) {
      this.maxScrollY = 0;
      this.scrollerHeight = this.wrapperHeight;
    }

    this.endTime = 0;
    this.directionX = 0;
    this.directionY = 0;

    if (hasPointer && !this.options.disablePointer) {
      this.wrapper.style[style.touchAction] = getTouchAction(this.options.eventPassthrough, true);

      if (!this.wrapper.style[style.touchAction]) {
        this.wrapper.style[style.touchAction] = getTouchAction(this.options.eventPassthrough, false);
      }
    }

    this.wrapperOffset = offset(this.wrapper);

    // this._execEvent('refresh');

    this.resetPosition();
  },

  resetPosition: function (time) {
    var x = this.x,
        y = this.y;

    time = time || 0;

    if (!this.hasHorizontalScroll || this.x > 0) {
      x = 0;
    } else if (this.x < this.maxScrollX) {
      x = this.maxScrollX;
    }

    if (!this.hasVerticalScroll || this.y > 0) {
      y = 0;
    } else if (this.y < this.maxScrollY) {
      y = this.maxScrollY;
    }

    if (x === this.x && y === this.y) {
      return false;
    }

    this.scrollTo(x, y, time, this.options.bounceEasing);

    return true;
  }

};

export default Iscroll;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5tb2R1bGUuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9lYXNpbmdzLmpzIiwiLi4vc3JjL3V0aWxzL3N0eWxlLmpzIiwiLi4vc3JjL3V0aWxzL2lzQmFkQW5kcm9pZC5qcyIsIi4uL3NyYy91dGlscy9nZXRUaW1lLmpzIiwiLi4vc3JjL3V0aWxzL29mZnNldC5qcyIsIi4uL3NyYy91dGlscy9nZXRSZWN0LmpzIiwiLi4vc3JjL3V0aWxzL2RldGVjdG9yLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRvdWNoQWN0aW9uLmpzIiwiLi4vc3JjL3V0aWxzL2V2ZW50SGFuZGxlci5qcyIsIi4uL3NyYy9teS1pc2Nyb2xsLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBlYXNpbmdzID0ge1xuICBxdWFkcmF0aWM6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjI1LCAwLjQ2LCAwLjQ1LCAwLjk0KScsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICByZXR1cm4gayAqICgyIC0gayk7XG4gICAgfVxuICB9LFxuICBjaXJjdWxhcjoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMSwgMC41NywgMC4xLCAxKScsXHQvLyBOb3QgcHJvcGVybHkgXCJjaXJjdWxhclwiIGJ1dCB0aGlzIGxvb2tzIGJldHRlciwgaXQgc2hvdWxkIGJlICgwLjA3NSwgMC44MiwgMC4xNjUsIDEpXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KDEgLSAoLS1rICogaykpO1xuICAgIH1cbiAgfSxcbiAgYmFjazoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMTc1LCAwLjg4NSwgMC4zMiwgMS4yNzUpJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciBiID0gNDtcbiAgICAgIHJldHVybiAoayA9IGsgLSAxKSAqIGsgKiAoKGIgKyAxKSAqIGsgKyBiKSArIDE7XG4gICAgfVxuICB9LFxuICBib3VuY2U6IHtcbiAgICBzdHlsZTogJycsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICBpZiAoKGsgLz0gMSkgPCAoMSAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiBrICogaztcbiAgICAgIH0gZWxzZSBpZiAoayA8ICgyIC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIChrIC09ICgxLjUgLyAyLjc1KSkgKiBrICsgMC43NTtcbiAgICAgIH0gZWxzZSBpZiAoayA8ICgyLjUgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuMjUgLyAyLjc1KSkgKiBrICsgMC45Mzc1O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjYyNSAvIDIuNzUpKSAqIGsgKyAwLjk4NDM3NTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGVsYXN0aWM6IHtcbiAgICBzdHlsZTogJycsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICB2YXIgZiA9IDAuMjIsXG4gICAgICAgIGUgPSAwLjQ7XG5cbiAgICAgIGlmIChrID09PSAwKSB7IHJldHVybiAwOyB9XG4gICAgICBpZiAoayA9PSAxKSB7IHJldHVybiAxOyB9XG5cbiAgICAgIHJldHVybiAoZSAqIE1hdGgucG93KDIsIC0gMTAgKiBrKSAqIE1hdGguc2luKChrIC0gZiAvIDQpICogKDIgKiBNYXRoLlBJKSAvIGYpICsgMSk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBlYXNpbmdzOyIsInZhciBfZWxlbWVudFN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jykuc3R5bGU7XG5cbnZhciBfdmVuZG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgdmFyIHZlbmRvcnMgPSBbJ3QnLCAnd2Via2l0VCcsICdNb3pUJywgJ21zVCcsICdPVCddLFxuICAgIHRyYW5zZm9ybSxcbiAgICBpID0gMCxcbiAgICBsID0gdmVuZG9ycy5sZW5ndGg7XG5cbiAgd2hpbGUgKGkgPCBsKSB7XG4gICAgdHJhbnNmb3JtID0gdmVuZG9yc1tpXSArICdyYW5zZm9ybSc7XG4gICAgaWYgKHRyYW5zZm9ybSBpbiBfZWxlbWVudFN0eWxlKSB7XG4gICAgICByZXR1cm4gdmVuZG9yc1tpXS5zdWJzdHIoMCwgdmVuZG9yc1tpXS5sZW5ndGggLSAxKTtcbiAgICB9XG4gICAgaSsrO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufSkoKTtcblxuZnVuY3Rpb24gX3ByZWZpeFN0eWxlIChzdHlsZSkge1xuICBpZiAoIF92ZW5kb3IgPT09IGZhbHNlICkgcmV0dXJuIGZhbHNlOyAvLyBubyB2ZW5kb3IgZm91bmRcbiAgaWYgKCBfdmVuZG9yID09PSAnJyApIHJldHVybiBzdHlsZTsgLy8gbm8gcHJlZml4IG5lZWRlZFxuICByZXR1cm4gX3ZlbmRvciArIHN0eWxlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3R5bGUuc3Vic3RyKDEpOyAvLyBvdGhlcndpc2UgYWRkIHByZWZpeFxufVxuXG4vLyBzdHlsZSB0aGF0IGhhcyB2ZW5kb3IgcHJlZml4LCBlZzogd2Via2l0VHJhbnNmb3JtXG52YXIgc3R5bGUgPSB7XG4gIHRyYW5zZm9ybTogX3ByZWZpeFN0eWxlKCd0cmFuc2Zvcm0nKSxcbiAgdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uOiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbicpLFxuICB0cmFuc2l0aW9uRHVyYXRpb246IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvbkR1cmF0aW9uJyksXG4gIHRyYW5zaXRpb25EZWxheTogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uRGVsYXknKSxcbiAgdHJhbnNmb3JtT3JpZ2luOiBfcHJlZml4U3R5bGUoJ3RyYW5zZm9ybU9yaWdpbicpLFxuICB0b3VjaEFjdGlvbjogX3ByZWZpeFN0eWxlKCd0b3VjaEFjdGlvbicpXG59O1xuXG5leHBvcnQgZGVmYXVsdCBzdHlsZTsiLCJ2YXIgaXNCYWRBbmRyb2lkID0gKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGFwcFZlcnNpb24gPSB3aW5kb3cubmF2aWdhdG9yLmFwcFZlcnNpb247XG5cbiAgaWYgKC9BbmRyb2lkLy50ZXN0KGFwcFZlcnNpb24pICYmICEoL0Nocm9tZVxcL1xcZC8udGVzdChhcHBWZXJzaW9uKSkpIHtcbiAgICB2YXIgc2FmYXJpVmVyc2lvbiA9IGFwcFZlcnNpb24ubWF0Y2goL1NhZmFyaVxcLyhcXGQrLlxcZCkvKTtcbiAgICBpZihzYWZhcmlWZXJzaW9uICYmIHR5cGVvZiBzYWZhcmlWZXJzaW9uID09PSBcIm9iamVjdFwiICYmIHNhZmFyaVZlcnNpb24ubGVuZ3RoID49IDIpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KHNhZmFyaVZlcnNpb25bMV0pIDwgNTM1LjE5O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59KSgpO1xuXG5leHBvcnQgZGVmYXVsdCBpc0JhZEFuZHJvaWQ7IiwiLyoqXG4gKiAxLiBEYXRlLnByb3RvdHlwZS5nZXRUaW1lIGhhcyBCRVRURVIgY29tcGF0aWJpbGl0eSB0aGFuIERhdGUubm93XG4gKiByZWZlcmVuY2U6IFxuICogIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0RhdGUvZ2V0VGltZSNCcm93c2VyX2NvbXBhdGliaWxpdHlcbiAqICBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9EYXRlL25vdyNCcm93c2VyX2NvbXBhdGliaWxpdHlcbiAqIFxuICogMi4gRGF0ZS5wcm90b3R5cGUuZ2V0VGltZSBzcGVlZCBpcyBTTE9XU0VSIHRoYW4gRGF0ZS5ub3dcbiAqIHJlZmVyZW5jZTpcbiAqICBodHRwczovL2pzcGVyZi5jb20vZGF0ZS1ub3ctdnMtZGF0ZS1nZXR0aW1lLzdcbiAqL1xuXG52YXIgZ2V0VGltZSA9IERhdGUubm93IHx8XG4gIGZ1bmN0aW9uIGdldFRpbWUoKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9O1xuXG5leHBvcnQgZGVmYXVsdCBnZXRUaW1lOyIsInZhciBvZmZzZXQgPSBmdW5jdGlvbiAoZWwpIHtcbiAgdmFyIGxlZnQgPSAtZWwub2Zmc2V0TGVmdCxcbiAgdG9wID0gLWVsLm9mZnNldFRvcDtcblxuICAvKipcbiAgICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0hUTUxFbGVtZW50L29mZnNldFBhcmVudFxuICAgKiBSZXR1cm5zIG51bGwgd2hlbiB0aGUgZWxlbWVudCBoYXMgc3R5bGUuZGlzcGxheSBzZXQgdG8gXCJub25lXCIuIFRoZSBvZmZzZXRQYXJlbnQgXG4gICAqIGlzIHVzZWZ1bCBiZWNhdXNlIG9mZnNldFRvcCBhbmQgb2Zmc2V0TGVmdCBhcmUgcmVsYXRpdmUgdG8gaXRzIHBhZGRpbmcgZWRnZS5cbiAgICovXG4gIHdoaWxlIChlbCA9IGVsLm9mZnNldFBhcmVudCkge1xuICAgIGxlZnQgLT0gZWwub2Zmc2V0TGVmdDtcbiAgICB0b3AgLT0gZWwub2Zmc2V0VG9wO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBsZWZ0LFxuICAgIHRvcDogdG9wXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IG9mZnNldDsiLCJmdW5jdGlvbiBnZXRSZWN0KGVsKSB7XG4gIGlmIChlbCBpbnN0YW5jZW9mIFNWR0VsZW1lbnQpIHtcbiAgICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcCA6IHJlY3QudG9wLFxuICAgICAgbGVmdCA6IHJlY3QubGVmdCxcbiAgICAgIHdpZHRoIDogcmVjdC53aWR0aCxcbiAgICAgIGhlaWdodCA6IHJlY3QuaGVpZ2h0XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB7XG4gICAgICB0b3AgOiBlbC5vZmZzZXRUb3AsXG4gICAgICBsZWZ0IDogZWwub2Zmc2V0TGVmdCxcbiAgICAgIHdpZHRoIDogZWwub2Zmc2V0V2lkdGgsXG4gICAgICBoZWlnaHQgOiBlbC5vZmZzZXRIZWlnaHRcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdldFJlY3Q7IiwidmFyIGhhc1BvaW50ZXIgPSAhISh3aW5kb3cuUG9pbnRlckV2ZW50IHx8IHdpbmRvdy5NU1BvaW50ZXJFdmVudCk7IC8vIElFMTAgaXMgcHJlZml4ZWRcbnZhciBoYXNUb3VjaCA9ICdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdztcblxuZXhwb3J0IHtcbiAgaGFzUG9pbnRlcixcbiAgaGFzVG91Y2hcbn0iLCJ2YXIgZ2V0VG91Y2hBY3Rpb24gPSBmdW5jdGlvbiAoZXZlbnRQYXNzdGhyb3VnaCwgYWRkUGluY2gpIHtcbiAgdmFyIHRvdWNoQWN0aW9uID0gJ25vbmUnO1xuICBpZiAoZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ3ZlcnRpY2FsJykge1xuICAgIHRvdWNoQWN0aW9uID0gJ3Bhbi15JztcbiAgfSBlbHNlIGlmIChldmVudFBhc3N0aHJvdWdoID09PSAnaG9yaXpvbnRhbCcpIHtcbiAgICB0b3VjaEFjdGlvbiA9ICdwYW4teCc7XG4gIH1cblxuICBpZiAoYWRkUGluY2ggJiYgdG91Y2hBY3Rpb24gIT0gJ25vbmUnKSB7XG4gICAgLy8gYWRkIHBpbmNoLXpvb20gc3VwcG9ydCBpZiB0aGUgYnJvd3NlciBzdXBwb3J0cyBpdCwgYnV0IGlmIG5vdCAoZWcuIENocm9tZSA8NTUpIGRvIG5vdGhpbmdcbiAgICB0b3VjaEFjdGlvbiArPSAnIHBpbmNoLXpvb20nO1xuICB9XG4gIHJldHVybiB0b3VjaEFjdGlvbjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZ2V0VG91Y2hBY3Rpb247IiwiZnVuY3Rpb24gYWRkRXZlbnQgKGVsLCB0eXBlLCBmbiwgY2FwdHVyZSkge1xuICBlbC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGZuLCAhIWNhcHR1cmUpO1xufTtcblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnQgKGVsLCB0eXBlLCBmbiwgY2FwdHVyZSkge1xuICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGZuLCAhIWNhcHR1cmUpO1xufVxuXG5leHBvcnQge1xuICBhZGRFdmVudCxcbiAgcmVtb3ZlRXZlbnRcbn07IiwiaW1wb3J0IGVhc2luZ3MgZnJvbSAnLi91dGlscy9lYXNpbmdzJztcbmltcG9ydCBzdHlsZVV0aWxzIGZyb20gJy4vdXRpbHMvc3R5bGUnO1xuaW1wb3J0IGlzQmFkQW5kcm9pZCBmcm9tICcuL3V0aWxzL2lzQmFkQW5kcm9pZCc7XG5pbXBvcnQgZ2V0VGltZSBmcm9tICcuL3V0aWxzL2dldFRpbWUnO1xuaW1wb3J0IG9mZnNldFV0aWxzIGZyb20gJy4vdXRpbHMvb2Zmc2V0JztcbmltcG9ydCBnZXRSZWN0IGZyb20gJy4vdXRpbHMvZ2V0UmVjdCc7XG5pbXBvcnQgeyBoYXNQb2ludGVyLCBoYXNUb3VjaCB9IGZyb20gJy4vdXRpbHMvZGV0ZWN0b3InO1xuaW1wb3J0IGdldFRvdWNoQWN0aW9uIGZyb20gJy4vdXRpbHMvZ2V0VG91Y2hBY3Rpb24nO1xuaW1wb3J0IHsgYWRkRXZlbnQsIHJlbW92ZUV2ZW50IH0gZnJvbSAnLi91dGlscy9ldmVudEhhbmRsZXInO1xuaW1wb3J0IHByZWZpeFBvaW50ZXJFdmVudCBmcm9tICcuL3V0aWxzL3ByZWZpeFBvaW50ZXJFdmVudCc7XG5cbi8vIGRlYWwgd2l0aCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgY29tcGF0YmlsaXR5XG52YXIgckFGID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGZ1bmN0aW9uIChjYWxsYmFjaykgeyB3aW5kb3cuc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTsgfTtcblxuZnVuY3Rpb24gSXNjcm9sbChlbGVtLCBvcHRpb25zKSB7XG4gIC8qKlxuICAgKiBnZXQgc2Nyb2xsIG5vZGUgZWxlbWVudFxuICAgKi9cbiAgdGhpcy53cmFwcGVyID0gdHlwZW9mIGVsZW0gPT09ICdzdHJpbmcnID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtKSA6IGVsZW07XG4gIHRoaXMuc2Nyb2xsZXIgPSB0aGlzLndyYXBwZXIuY2hpbGRyZW5bMF07XG4gIHRoaXMuc2Nyb2xsZXJTdHlsZSA9IHRoaXMuc2Nyb2xsZXIuc3R5bGU7XG5cbiAgLyoqXG4gICAqIG1lcmdlIGRlZmF1bHQgb3B0aW9ucyBhbmQgY3VzdG9taXplZCBvcHRpb25zXG4gICAqL1xuICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgZGlzYWJsZVBvaW50ZXI6ICFoYXNQb2ludGVyLFxuICAgIGRpc2FibGVUb3VjaCA6IGhhc1BvaW50ZXIgfHwgIWhhc1RvdWNoLFxuICAgIGRpc2FibGVNb3VzZTogaGFzUG9pbnRlciB8fCAhaGFzVG91Y2gsXG4gICAgdXNlVHJhbnNpdGlvbjogdHJ1ZSxcbiAgICB1c2VUcmFuc2Zvcm06IHRydWUsXG4gICAgc2Nyb2xsWTogdHJ1ZSxcblx0XHRzdGFydFg6IDAsXG4gICAgc3RhcnRZOiAwLFxuICAgIGJpbmRUb1dyYXBwZXI6IHR5cGVvZiB3aW5kb3cub25tb3VzZWRvd24gPT09IFwidW5kZWZpbmVkXCJcbiAgfTtcblxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnNbaV0gPSBvcHRpb25zW2ldO1xuICB9XG5cbiAgdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PT0gdHJ1ZSA/ICd2ZXJ0aWNhbCcgOiB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaDtcblxuICAvLyBJZiB5b3Ugd2FudCBldmVudFBhc3N0aHJvdWdoIEkgaGF2ZSB0byBsb2NrIG9uZSBvZiB0aGUgYXhlc1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWSA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICd2ZXJ0aWNhbCcgPyBmYWxzZSA6IHRoaXMub3B0aW9ucy5zY3JvbGxZO1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICdob3Jpem9udGFsJyA/IGZhbHNlIDogdGhpcy5vcHRpb25zLnNjcm9sbFg7XG5cbiAgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyA9IHR5cGVvZiB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nID09ICdzdHJpbmcnID8gXG4gICAgZWFzaW5nc1t0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nXSB8fCBlYXNpbmdzLmNpcmN1bGFyIDogXG4gICAgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZztcblxuICB0aGlzLnggPSAwO1xuICB0aGlzLnkgPSAwO1xuXG4gIHRoaXMuX2luaXQoKTtcbiAgdGhpcy5yZWZyZXNoKCk7XG4gIHRoaXMuc2Nyb2xsVG8odGhpcy5vcHRpb25zLnN0YXJ0WCwgdGhpcy5vcHRpb25zLnN0YXJ0WSk7XG59XG5cbklzY3JvbGwucHJvdG90eXBlID0ge1xuXG4gIF9pbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faW5pdEV2ZW50cygpO1xuICB9LFxuXG4gIF9pbml0RXZlbnRzOiBmdW5jdGlvbiAocmVtb3ZlKSB7XG4gICAgdmFyIGV2ZW50VHlwZSA9IHJlbW92ZSA/IHJlbW92ZUV2ZW50IDogYWRkRXZlbnQsXG4gICAgICB0YXJnZXQgPSB0aGlzLm9wdGlvbnMuYmluZFRvV3JhcHBlciA/IHRoaXMud3JhcHBlciA6IHdpbmRvdztcblxuICAgIGV2ZW50VHlwZSh3aW5kb3csICdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh3aW5kb3csICdyZXNpemUnLCB0aGlzKTtcblxuICAgIGlmICggdGhpcy5vcHRpb25zLmNsaWNrICkge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ2NsaWNrJywgdGhpcywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKCAhdGhpcy5vcHRpb25zLmRpc2FibGVNb3VzZSApIHtcblx0XHRcdGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsICdtb3VzZWRvd24nLCB0aGlzKTtcblx0XHRcdGV2ZW50VHlwZSh0YXJnZXQsICdtb3VzZW1vdmUnLCB0aGlzKTtcblx0XHRcdGV2ZW50VHlwZSh0YXJnZXQsICdtb3VzZWNhbmNlbCcsIHRoaXMpO1xuXHRcdFx0ZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNldXAnLCB0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAoIGhhc1BvaW50ZXIgJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlUG9pbnRlciApIHtcblx0XHRcdGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsIHV0aWxzLnByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcmRvd24nKSwgdGhpcyk7XG5cdFx0XHRldmVudFR5cGUodGFyZ2V0LCB1dGlscy5wcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJtb3ZlJyksIHRoaXMpO1xuXHRcdFx0ZXZlbnRUeXBlKHRhcmdldCwgdXRpbHMucHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVyY2FuY2VsJyksIHRoaXMpO1xuXHRcdFx0ZXZlbnRUeXBlKHRhcmdldCwgdXRpbHMucHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVydXAnKSwgdGhpcyk7XG4gICAgfVxuXG5cdFx0aWYgKCBoYXNUb3VjaCAmJiAhdGhpcy5vcHRpb25zLmRpc2FibGVUb3VjaCApIHtcblx0XHRcdGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsICd0b3VjaHN0YXJ0JywgdGhpcyk7XG5cdFx0XHRldmVudFR5cGUodGFyZ2V0LCAndG91Y2htb3ZlJywgdGhpcyk7XG5cdFx0XHRldmVudFR5cGUodGFyZ2V0LCAndG91Y2hjYW5jZWwnLCB0aGlzKTtcblx0XHRcdGV2ZW50VHlwZSh0YXJnZXQsICd0b3VjaGVuZCcsIHRoaXMpO1xuXHRcdH1cblxuXHRcdGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAndHJhbnNpdGlvbmVuZCcsIHRoaXMpO1xuXHRcdGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAnd2Via2l0VHJhbnNpdGlvbkVuZCcsIHRoaXMpO1xuXHRcdGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAnb1RyYW5zaXRpb25FbmQnLCB0aGlzKTtcblx0XHRldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ01TVHJhbnNpdGlvbkVuZCcsIHRoaXMpO1xuICB9LFxuXG4gIHNjcm9sbFRvOiBmdW5jdGlvbiAoeCwgeSwgdGltZSwgZWFzaW5nKSB7XG4gICAgZWFzaW5nID0gZWFzaW5nIHx8IGVhc2luZ3MuY2lyY3VsYXI7XG4gICAgdGhpcy5pc0luVHJhbnNpdGlvbiA9IHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRpbWUgPiAwO1xuICAgIHZhciB0cmFuc2l0aW9uVHlwZSA9IHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIGVhc2luZy5zdHlsZTtcblxuICAgIGlmICghdGltZSB8fCB0cmFuc2l0aW9uVHlwZSkge1xuICAgICAgaWYgKHRyYW5zaXRpb25UeXBlKSB7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbihlYXNpbmcuc3R5bGUpO1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uVGltZSh0aW1lKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3RyYW5zbGF0ZSh4LCB5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fYW5pbWF0ZSh4LCB5LCB0aW1lLCBlYXNpbmcuZm4pO1xuICAgIH1cbiAgfSxcblxuICBzY3JvbGxUb0VsZW1lbnQ6IGZ1bmN0aW9uIChlbCwgdGltZSwgb2Zmc2V0WCwgb2Zmc2V0WSwgZWFzaW5nKSB7XG4gICAgZWwgPSBlbC5ub2RlVHlwZSA/IGVsIDogdGhpcy5zY3JvbGxlci5xdWVyeVNlbGVjdG9yKGVsKTtcblxuICAgIC8vIGlmIG5vIGVsZW1lbnQgc2VsZWN0ZWQsIHRoZW4gcmV0dXJuXG4gICAgaWYgKCFlbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBwb3MgPSBvZmZzZXRVdGlscyhlbCk7XG4gIH0sXG5cbiAgX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogZnVuY3Rpb24gKGVhc2luZ1N0eWxlKSB7XG4gICAgLy8gYXNzaWduIGVhc2luZyBjc3Mgc3R5bGUgdG8gc2Nyb2xsIGNvbnRhaW5lciB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24gcHJvcGVydHlcbiAgICAvLyBleGFtcGxlOiBjdWJpYy1iZXppZXIoMC4yNSwgMC40NiwgMC40NSwgMC45NClcbiAgICB0aGlzLnNjcm9sbGVyU3R5bGVbc3R5bGVVdGlscy50cmFuc2l0aW9uVGltaW5nRnVuY3Rpb25dID0gZWFzaW5nU3R5bGU7XG4gIH0sXG5cbiAgX3RyYW5zaXRpb25UaW1lOiBmdW5jdGlvbiAodGltZSkge1xuICAgIC8vIGlmIGRvIG5vdCB1c2UgdHJhbnNpdGlvbiB0byBzY3JvbGwsIHJldHVyblxuICAgIGlmICghdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aW1lID0gdGltZSB8fCAwO1xuICAgIC8vIHRyYW5zaXRpb25EdXJhdGlvbiB3aGljaCBoYXMgdmVuZG9yIHByZWZpeFxuICAgIHZhciBkdXJhdGlvblByb3AgPSBzdHlsZVV0aWxzLnRyYW5zaXRpb25EdXJhdGlvbjtcbiAgICBpZiAoIWR1cmF0aW9uUHJvcCkgeyAvLyBpZiBubyB2ZW5kb3IgZm91bmQsIGR1cmF0aW9uUHJvcCB3aWxsIGJlIGZhbHNlXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSB0aW1lICsgJ21zJzsgLy8gYXNzaWduIG1zIHRvIHRyYW5zaXRpb25EdXJhdGlvbiBwcm9wXG5cbiAgICBpZiAoIXRpbWUgJiYgaXNCYWRBbmRyb2lkKSB7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9ICcwLjAwMDFtcyc7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHJBRihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzZWxmLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9PT0gJzAuMDAwMW1zJykge1xuICAgICAgICAgIHNlbGYuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gJzBzJztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIF90cmFuc2xhdGU6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2Zvcm0pIHtcblxuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW3N0eWxlVXRpbHMudHJhbnNmb3JtXSA9XG4gICAgICAgICd0cmFuc2xhdGUoJyArIHggKyAncHgsJyArIHkgKyAncHgpJyArICd0cmFuc2xhdGVaKDApJztcblxuICAgIH0gZWxzZSB7XG4gICAgICB4ID0gTWF0aC5yb3VuZCh4KTtcbiAgICAgIHkgPSBNYXRoLnJvdW5kKHkpO1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlLmxlZnQgPSB4ICsgJ3B4JztcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZS50b3AgPSB5ICsgJ3B4JztcbiAgICB9XG5cbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gIH0sXG5cbiAgX2FuaW1hdGU6IGZ1bmN0aW9uIChkZXN0WCwgZGVzdFksIGR1cmF0aW9uLCBlYXNpbmdGbikge1xuICAgIHZhciB0aGF0ID0gdGhpcyxcbiAgICAgIHN0YXJ0WCA9IHRoaXMueCxcbiAgICAgIHN0YXJ0WSA9IHRoaXMueSxcbiAgICAgIHN0YXJ0VGltZSA9IGdldFRpbWUoKSxcbiAgICAgIGRlc3RUaW1lID0gc3RhcnRUaW1lICsgZHVyYXRpb247XG5cbiAgICBmdW5jdGlvbiBzdGVwKCkge1xuICAgICAgdmFyIG5vdyA9IGdldFRpbWUoKSxcbiAgICAgICAgbmV3WCwgbmV3WSxcbiAgICAgICAgZWFzaW5nO1xuXG4gICAgICBpZiAobm93ID49IGRlc3RUaW1lKSB7XG4gICAgICAgIHRoYXQuaXNBbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhhdC5fdHJhbnNsYXRlKGRlc3RYLCBkZXN0WSk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBub3cgPSAobm93IC0gc3RhcnRUaW1lKSAvIGR1cmF0aW9uO1xuICAgICAgZWFzaW5nID0gZWFzaW5nRm4obm93KTtcbiAgICAgIG5ld1ggPSAoZGVzdFggLSBzdGFydFgpICogZWFzaW5nICsgc3RhcnRYO1xuICAgICAgbmV3WSA9IChkZXN0WSAtIHN0YXJ0WSkgKiBlYXNpbmcgKyBzdGFydFk7XG4gICAgICB0aGF0Ll90cmFuc2xhdGUobmV3WCwgbmV3WSk7XG5cbiAgICAgIGlmICh0aGF0LmlzQW5pbWF0aW5nKSB7XG4gICAgICAgIHJBRihzdGVwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzQW5pbWF0aW5nID0gdHJ1ZTtcbiAgICBzdGVwKCk7XG4gIH0sXG5cbiAgcmVmcmVzaDogZnVuY3Rpb24gKCkge1xuICAgIGdldFJlY3QodGhpcy53cmFwcGVyKTsgLy8gRm9yY2UgcmVmbG93XG5cbiAgICB0aGlzLndyYXBwZXJXaWR0aCA9IHRoaXMud3JhcHBlci5jbGllbnRXaWR0aDtcbiAgICB0aGlzLndyYXBwZXJIZWlnaHQgPSB0aGlzLndyYXBwZXIuY2xpZW50SGVpZ2h0O1xuXG4gICAgdmFyIHJlY3QgPSBnZXRSZWN0KHRoaXMuc2Nyb2xsZXIpO1xuXG4gICAgdGhpcy5zY3JvbGxlcldpZHRoID0gcmVjdC53aWR0aDtcbiAgICB0aGlzLnNjcm9sbGVySGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XG5cbiAgICAvKipcbiAgICAgKiB0aGlzLm1heFNjcm9sbFggb3IgdGhpcy5tYXhTY3JvbGxZIHNtYWxsZXIgdGhhbiAwLCBtZWFuaW5nXG4gICAgICogb3ZlcmZsb3cgaGFwcGVuZWQuXG4gICAgICovXG4gICAgdGhpcy5tYXhTY3JvbGxYID0gdGhpcy53cmFwcGVyV2lkdGggLSB0aGlzLnNjcm9sbGVyV2lkdGg7XG4gICAgdGhpcy5tYXhTY3JvbGxZID0gdGhpcy53cmFwcGVySGVpZ2h0IC0gdGhpcy5zY3JvbGxlckhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIG9wdGlvbiBlbmFibGVzIHNjcm9sbCBBTkQgb3ZlcmZsb3cgZXhpc3RzXG4gICAgICovXG4gICAgdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsID0gdGhpcy5vcHRpb25zLnNjcm9sbFggJiYgdGhpcy5tYXhTY3JvbGxYIDwgMDtcbiAgICB0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsID0gdGhpcy5vcHRpb25zLnNjcm9sbFkgJiYgdGhpcy5tYXhTY3JvbGxZIDwgMDtcblxuICAgIGlmICghdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsKSB7XG4gICAgICB0aGlzLm1heFNjcm9sbFggPSAwO1xuICAgICAgdGhpcy5zY3JvbGxlcldpZHRoID0gdGhpcy53cmFwcGVyV2lkdGg7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsKSB7XG4gICAgICB0aGlzLm1heFNjcm9sbFkgPSAwO1xuICAgICAgdGhpcy5zY3JvbGxlckhlaWdodCA9IHRoaXMud3JhcHBlckhlaWdodDtcbiAgICB9XG5cbiAgICB0aGlzLmVuZFRpbWUgPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWCA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25ZID0gMDtcblxuICAgIGlmIChoYXNQb2ludGVyICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVBvaW50ZXIpIHtcbiAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSA9XG4gICAgICAgIGdldFRvdWNoQWN0aW9uKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoLCB0cnVlKTtcblxuICAgICAgaWYgKCF0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0pIHtcbiAgICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dID1cbiAgICAgICAgICBnZXRUb3VjaEFjdGlvbih0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCwgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMud3JhcHBlck9mZnNldCA9IG9mZnNldFV0aWxzKHRoaXMud3JhcHBlcik7XG5cbiAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3JlZnJlc2gnKTtcblxuICAgIHRoaXMucmVzZXRQb3NpdGlvbigpO1xuICB9LFxuXG4gIHJlc2V0UG9zaXRpb246IGZ1bmN0aW9uICh0aW1lKSB7XG5cdFx0dmFyIHggPSB0aGlzLngsXG4gICAgeSA9IHRoaXMueTtcblxuICAgIHRpbWUgPSB0aW1lIHx8IDA7XG5cbiAgICBpZiAoICF0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgfHwgdGhpcy54ID4gMCApIHtcbiAgICAgIHggPSAwO1xuICAgIH0gZWxzZSBpZiAoIHRoaXMueCA8IHRoaXMubWF4U2Nyb2xsWCApIHtcbiAgICAgIHggPSB0aGlzLm1heFNjcm9sbFg7XG4gICAgfVxuXG4gICAgaWYgKCAhdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCB8fCB0aGlzLnkgPiAwICkge1xuICAgICAgeSA9IDA7XG4gICAgfSBlbHNlIGlmICggdGhpcy55IDwgdGhpcy5tYXhTY3JvbGxZICkge1xuICAgICAgeSA9IHRoaXMubWF4U2Nyb2xsWTtcbiAgICB9XG5cblx0XHRpZiAoIHggPT09IHRoaXMueCAmJiB5ID09PSB0aGlzLnkgKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG4gICAgdGhpcy5zY3JvbGxUbyh4LCB5LCB0aW1lLCB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cblxufTtcblxuZXhwb3J0IGRlZmF1bHQgSXNjcm9sbDsiXSwibmFtZXMiOlsiZWFzaW5ncyIsImsiLCJNYXRoIiwic3FydCIsImIiLCJmIiwiZSIsInBvdyIsInNpbiIsIlBJIiwiX2VsZW1lbnRTdHlsZSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInN0eWxlIiwiX3ZlbmRvciIsInZlbmRvcnMiLCJ0cmFuc2Zvcm0iLCJpIiwibCIsImxlbmd0aCIsInN1YnN0ciIsIl9wcmVmaXhTdHlsZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwiaXNCYWRBbmRyb2lkIiwiYXBwVmVyc2lvbiIsIndpbmRvdyIsIm5hdmlnYXRvciIsInRlc3QiLCJzYWZhcmlWZXJzaW9uIiwibWF0Y2giLCJwYXJzZUZsb2F0IiwiZ2V0VGltZSIsIkRhdGUiLCJub3ciLCJvZmZzZXQiLCJlbCIsImxlZnQiLCJvZmZzZXRMZWZ0IiwidG9wIiwib2Zmc2V0VG9wIiwib2Zmc2V0UGFyZW50IiwiZ2V0UmVjdCIsIlNWR0VsZW1lbnQiLCJyZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0Iiwid2lkdGgiLCJoZWlnaHQiLCJvZmZzZXRXaWR0aCIsIm9mZnNldEhlaWdodCIsImhhc1BvaW50ZXIiLCJQb2ludGVyRXZlbnQiLCJNU1BvaW50ZXJFdmVudCIsImhhc1RvdWNoIiwiZ2V0VG91Y2hBY3Rpb24iLCJldmVudFBhc3N0aHJvdWdoIiwiYWRkUGluY2giLCJ0b3VjaEFjdGlvbiIsImFkZEV2ZW50IiwidHlwZSIsImZuIiwiY2FwdHVyZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZW1vdmVFdmVudCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJyQUYiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ3ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJtb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJvUmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwibXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJjYWxsYmFjayIsInNldFRpbWVvdXQiLCJJc2Nyb2xsIiwiZWxlbSIsIm9wdGlvbnMiLCJ3cmFwcGVyIiwicXVlcnlTZWxlY3RvciIsInNjcm9sbGVyIiwiY2hpbGRyZW4iLCJzY3JvbGxlclN0eWxlIiwib25tb3VzZWRvd24iLCJzY3JvbGxZIiwic2Nyb2xsWCIsImJvdW5jZUVhc2luZyIsImNpcmN1bGFyIiwieCIsInkiLCJfaW5pdCIsInJlZnJlc2giLCJzY3JvbGxUbyIsInN0YXJ0WCIsInN0YXJ0WSIsInByb3RvdHlwZSIsIl9pbml0RXZlbnRzIiwicmVtb3ZlIiwiZXZlbnRUeXBlIiwidGFyZ2V0IiwiYmluZFRvV3JhcHBlciIsImNsaWNrIiwiZGlzYWJsZU1vdXNlIiwiZGlzYWJsZVBvaW50ZXIiLCJ1dGlscyIsInByZWZpeFBvaW50ZXJFdmVudCIsImRpc2FibGVUb3VjaCIsInRpbWUiLCJlYXNpbmciLCJpc0luVHJhbnNpdGlvbiIsInVzZVRyYW5zaXRpb24iLCJ0cmFuc2l0aW9uVHlwZSIsIl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJfdHJhbnNpdGlvblRpbWUiLCJfdHJhbnNsYXRlIiwiX2FuaW1hdGUiLCJvZmZzZXRYIiwib2Zmc2V0WSIsIm5vZGVUeXBlIiwicG9zIiwib2Zmc2V0VXRpbHMiLCJlYXNpbmdTdHlsZSIsInN0eWxlVXRpbHMiLCJ0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJkdXJhdGlvblByb3AiLCJ0cmFuc2l0aW9uRHVyYXRpb24iLCJzZWxmIiwidXNlVHJhbnNmb3JtIiwicm91bmQiLCJkZXN0WCIsImRlc3RZIiwiZHVyYXRpb24iLCJlYXNpbmdGbiIsInRoYXQiLCJzdGFydFRpbWUiLCJkZXN0VGltZSIsInN0ZXAiLCJuZXdYIiwibmV3WSIsImlzQW5pbWF0aW5nIiwid3JhcHBlcldpZHRoIiwiY2xpZW50V2lkdGgiLCJ3cmFwcGVySGVpZ2h0IiwiY2xpZW50SGVpZ2h0Iiwic2Nyb2xsZXJXaWR0aCIsInNjcm9sbGVySGVpZ2h0IiwibWF4U2Nyb2xsWCIsIm1heFNjcm9sbFkiLCJoYXNIb3Jpem9udGFsU2Nyb2xsIiwiaGFzVmVydGljYWxTY3JvbGwiLCJlbmRUaW1lIiwiZGlyZWN0aW9uWCIsImRpcmVjdGlvblkiLCJ3cmFwcGVyT2Zmc2V0IiwicmVzZXRQb3NpdGlvbiJdLCJtYXBwaW5ncyI6IkFBQUEsSUFBSUEsVUFBVTthQUNEO1dBQ0Ysc0NBREU7UUFFTCxVQUFVQyxDQUFWLEVBQWE7YUFDUkEsS0FBSyxJQUFJQSxDQUFULENBQVA7O0dBSlE7WUFPRjtXQUNELGlDQURDO1FBRUosVUFBVUEsQ0FBVixFQUFhO2FBQ1JDLEtBQUtDLElBQUwsQ0FBVSxJQUFLLEVBQUVGLENBQUYsR0FBTUEsQ0FBckIsQ0FBUDs7R0FWUTtRQWFOO1dBQ0cseUNBREg7UUFFQSxVQUFVQSxDQUFWLEVBQWE7VUFDWEcsSUFBSSxDQUFSO2FBQ08sQ0FBQ0gsSUFBSUEsSUFBSSxDQUFULElBQWNBLENBQWQsSUFBbUIsQ0FBQ0csSUFBSSxDQUFMLElBQVVILENBQVYsR0FBY0csQ0FBakMsSUFBc0MsQ0FBN0M7O0dBakJRO1VBb0JKO1dBQ0MsRUFERDtRQUVGLFVBQVVILENBQVYsRUFBYTtVQUNYLENBQUNBLEtBQUssQ0FBTixJQUFZLElBQUksSUFBcEIsRUFBMkI7ZUFDbEIsU0FBU0EsQ0FBVCxHQUFhQSxDQUFwQjtPQURGLE1BRU8sSUFBSUEsSUFBSyxJQUFJLElBQWIsRUFBb0I7ZUFDbEIsVUFBVUEsS0FBTSxNQUFNLElBQXRCLElBQStCQSxDQUEvQixHQUFtQyxJQUExQztPQURLLE1BRUEsSUFBSUEsSUFBSyxNQUFNLElBQWYsRUFBc0I7ZUFDcEIsVUFBVUEsS0FBTSxPQUFPLElBQXZCLElBQWdDQSxDQUFoQyxHQUFvQyxNQUEzQztPQURLLE1BRUE7ZUFDRSxVQUFVQSxLQUFNLFFBQVEsSUFBeEIsSUFBaUNBLENBQWpDLEdBQXFDLFFBQTVDOzs7R0E5Qk07V0FrQ0g7V0FDQSxFQURBO1FBRUgsVUFBVUEsQ0FBVixFQUFhO1VBQ1hJLElBQUksSUFBUjtVQUNF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

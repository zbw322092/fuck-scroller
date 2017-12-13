(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Iscroll = factory());
}(this, (function () { 'use strict';

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

return Iscroll;

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL3V0aWxzL2Vhc2luZ3MuanMiLCIuLi9zcmMvdXRpbHMvc3R5bGUuanMiLCIuLi9zcmMvdXRpbHMvaXNCYWRBbmRyb2lkLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRpbWUuanMiLCIuLi9zcmMvdXRpbHMvb2Zmc2V0LmpzIiwiLi4vc3JjL3V0aWxzL2dldFJlY3QuanMiLCIuLi9zcmMvdXRpbHMvZGV0ZWN0b3IuanMiLCIuLi9zcmMvdXRpbHMvZ2V0VG91Y2hBY3Rpb24uanMiLCIuLi9zcmMvdXRpbHMvZXZlbnRIYW5kbGVyLmpzIiwiLi4vc3JjL215LWlzY3JvbGwuanMiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIGVhc2luZ3MgPSB7XG4gIHF1YWRyYXRpYzoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBrICogKDIgLSBrKTtcbiAgICB9XG4gIH0sXG4gIGNpcmN1bGFyOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xLCAwLjU3LCAwLjEsIDEpJyxcdC8vIE5vdCBwcm9wZXJseSBcImNpcmN1bGFyXCIgYnV0IHRoaXMgbG9va3MgYmV0dGVyLCBpdCBzaG91bGQgYmUgKDAuMDc1LCAwLjgyLCAwLjE2NSwgMSlcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoMSAtICgtLWsgKiBrKSk7XG4gICAgfVxuICB9LFxuICBiYWNrOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xNzUsIDAuODg1LCAwLjMyLCAxLjI3NSknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGIgPSA0O1xuICAgICAgcmV0dXJuIChrID0gayAtIDEpICogayAqICgoYiArIDEpICogayArIGIpICsgMTtcbiAgICB9XG4gIH0sXG4gIGJvdW5jZToge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIGlmICgoayAvPSAxKSA8ICgxIC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIGsgKiBrO1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDEuNSAvIDIuNzUpKSAqIGsgKyAwLjc1O1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIuNSAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi4yNSAvIDIuNzUpKSAqIGsgKyAwLjkzNzU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuNjI1IC8gMi43NSkpICogayArIDAuOTg0Mzc1O1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZWxhc3RpYzoge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciBmID0gMC4yMixcbiAgICAgICAgZSA9IDAuNDtcblxuICAgICAgaWYgKGsgPT09IDApIHsgcmV0dXJuIDA7IH1cbiAgICAgIGlmIChrID09IDEpIHsgcmV0dXJuIDE7IH1cblxuICAgICAgcmV0dXJuIChlICogTWF0aC5wb3coMiwgLSAxMCAqIGspICogTWF0aC5zaW4oKGsgLSBmIC8gNCkgKiAoMiAqIE1hdGguUEkpIC8gZikgKyAxKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGVhc2luZ3M7IiwidmFyIF9lbGVtZW50U3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKS5zdHlsZTtcblxudmFyIF92ZW5kb3IgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgdmVuZG9ycyA9IFsndCcsICd3ZWJraXRUJywgJ01velQnLCAnbXNUJywgJ09UJ10sXG4gICAgdHJhbnNmb3JtLFxuICAgIGkgPSAwLFxuICAgIGwgPSB2ZW5kb3JzLmxlbmd0aDtcblxuICB3aGlsZSAoaSA8IGwpIHtcbiAgICB0cmFuc2Zvcm0gPSB2ZW5kb3JzW2ldICsgJ3JhbnNmb3JtJztcbiAgICBpZiAodHJhbnNmb3JtIGluIF9lbGVtZW50U3R5bGUpIHtcbiAgICAgIHJldHVybiB2ZW5kb3JzW2ldLnN1YnN0cigwLCB2ZW5kb3JzW2ldLmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICBpKys7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59KSgpO1xuXG5mdW5jdGlvbiBfcHJlZml4U3R5bGUgKHN0eWxlKSB7XG4gIGlmICggX3ZlbmRvciA9PT0gZmFsc2UgKSByZXR1cm4gZmFsc2U7IC8vIG5vIHZlbmRvciBmb3VuZFxuICBpZiAoIF92ZW5kb3IgPT09ICcnICkgcmV0dXJuIHN0eWxlOyAvLyBubyBwcmVmaXggbmVlZGVkXG4gIHJldHVybiBfdmVuZG9yICsgc3R5bGUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHlsZS5zdWJzdHIoMSk7IC8vIG90aGVyd2lzZSBhZGQgcHJlZml4XG59XG5cbi8vIHN0eWxlIHRoYXQgaGFzIHZlbmRvciBwcmVmaXgsIGVnOiB3ZWJraXRUcmFuc2Zvcm1cbnZhciBzdHlsZSA9IHtcbiAgdHJhbnNmb3JtOiBfcHJlZml4U3R5bGUoJ3RyYW5zZm9ybScpLFxuICB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uJyksXG4gIHRyYW5zaXRpb25EdXJhdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uRHVyYXRpb24nKSxcbiAgdHJhbnNpdGlvbkRlbGF5OiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EZWxheScpLFxuICB0cmFuc2Zvcm1PcmlnaW46IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtT3JpZ2luJyksXG4gIHRvdWNoQWN0aW9uOiBfcHJlZml4U3R5bGUoJ3RvdWNoQWN0aW9uJylcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHN0eWxlOyIsInZhciBpc0JhZEFuZHJvaWQgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgYXBwVmVyc2lvbiA9IHdpbmRvdy5uYXZpZ2F0b3IuYXBwVmVyc2lvbjtcblxuICBpZiAoL0FuZHJvaWQvLnRlc3QoYXBwVmVyc2lvbikgJiYgISgvQ2hyb21lXFwvXFxkLy50ZXN0KGFwcFZlcnNpb24pKSkge1xuICAgIHZhciBzYWZhcmlWZXJzaW9uID0gYXBwVmVyc2lvbi5tYXRjaCgvU2FmYXJpXFwvKFxcZCsuXFxkKS8pO1xuICAgIGlmKHNhZmFyaVZlcnNpb24gJiYgdHlwZW9mIHNhZmFyaVZlcnNpb24gPT09IFwib2JqZWN0XCIgJiYgc2FmYXJpVmVyc2lvbi5sZW5ndGggPj0gMikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoc2FmYXJpVmVyc2lvblsxXSkgPCA1MzUuMTk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzQmFkQW5kcm9pZDsiLCIvKipcbiAqIDEuIERhdGUucHJvdG90eXBlLmdldFRpbWUgaGFzIEJFVFRFUiBjb21wYXRpYmlsaXR5IHRoYW4gRGF0ZS5ub3dcbiAqIHJlZmVyZW5jZTogXG4gKiAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9nZXRUaW1lI0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0RhdGUvbm93I0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogXG4gKiAyLiBEYXRlLnByb3RvdHlwZS5nZXRUaW1lIHNwZWVkIGlzIFNMT1dTRVIgdGhhbiBEYXRlLm5vd1xuICogcmVmZXJlbmNlOlxuICogIGh0dHBzOi8vanNwZXJmLmNvbS9kYXRlLW5vdy12cy1kYXRlLWdldHRpbWUvN1xuICovXG5cbnZhciBnZXRUaW1lID0gRGF0ZS5ub3cgfHxcbiAgZnVuY3Rpb24gZ2V0VGltZSgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbmV4cG9ydCBkZWZhdWx0IGdldFRpbWU7IiwidmFyIG9mZnNldCA9IGZ1bmN0aW9uIChlbCkge1xuICB2YXIgbGVmdCA9IC1lbC5vZmZzZXRMZWZ0LFxuICB0b3AgPSAtZWwub2Zmc2V0VG9wO1xuXG4gIC8qKlxuICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvSFRNTEVsZW1lbnQvb2Zmc2V0UGFyZW50XG4gICAqIFJldHVybnMgbnVsbCB3aGVuIHRoZSBlbGVtZW50IGhhcyBzdHlsZS5kaXNwbGF5IHNldCB0byBcIm5vbmVcIi4gVGhlIG9mZnNldFBhcmVudCBcbiAgICogaXMgdXNlZnVsIGJlY2F1c2Ugb2Zmc2V0VG9wIGFuZCBvZmZzZXRMZWZ0IGFyZSByZWxhdGl2ZSB0byBpdHMgcGFkZGluZyBlZGdlLlxuICAgKi9cbiAgd2hpbGUgKGVsID0gZWwub2Zmc2V0UGFyZW50KSB7XG4gICAgbGVmdCAtPSBlbC5vZmZzZXRMZWZ0O1xuICAgIHRvcCAtPSBlbC5vZmZzZXRUb3A7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGxlZnQ6IGxlZnQsXG4gICAgdG9wOiB0b3BcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgb2Zmc2V0OyIsImZ1bmN0aW9uIGdldFJlY3QoZWwpIHtcbiAgaWYgKGVsIGluc3RhbmNlb2YgU1ZHRWxlbWVudCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wIDogcmVjdC50b3AsXG4gICAgICBsZWZ0IDogcmVjdC5sZWZ0LFxuICAgICAgd2lkdGggOiByZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0IDogcmVjdC5oZWlnaHRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcCA6IGVsLm9mZnNldFRvcCxcbiAgICAgIGxlZnQgOiBlbC5vZmZzZXRMZWZ0LFxuICAgICAgd2lkdGggOiBlbC5vZmZzZXRXaWR0aCxcbiAgICAgIGhlaWdodCA6IGVsLm9mZnNldEhlaWdodFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZ2V0UmVjdDsiLCJ2YXIgaGFzUG9pbnRlciA9ICEhKHdpbmRvdy5Qb2ludGVyRXZlbnQgfHwgd2luZG93Lk1TUG9pbnRlckV2ZW50KTsgLy8gSUUxMCBpcyBwcmVmaXhlZFxudmFyIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93O1xuXG5leHBvcnQge1xuICBoYXNQb2ludGVyLFxuICBoYXNUb3VjaFxufSIsInZhciBnZXRUb3VjaEFjdGlvbiA9IGZ1bmN0aW9uIChldmVudFBhc3N0aHJvdWdoLCBhZGRQaW5jaCkge1xuICB2YXIgdG91Y2hBY3Rpb24gPSAnbm9uZSc7XG4gIGlmIChldmVudFBhc3N0aHJvdWdoID09PSAndmVydGljYWwnKSB7XG4gICAgdG91Y2hBY3Rpb24gPSAncGFuLXknO1xuICB9IGVsc2UgaWYgKGV2ZW50UGFzc3Rocm91Z2ggPT09ICdob3Jpem9udGFsJykge1xuICAgIHRvdWNoQWN0aW9uID0gJ3Bhbi14JztcbiAgfVxuXG4gIGlmIChhZGRQaW5jaCAmJiB0b3VjaEFjdGlvbiAhPSAnbm9uZScpIHtcbiAgICAvLyBhZGQgcGluY2gtem9vbSBzdXBwb3J0IGlmIHRoZSBicm93c2VyIHN1cHBvcnRzIGl0LCBidXQgaWYgbm90IChlZy4gQ2hyb21lIDw1NSkgZG8gbm90aGluZ1xuICAgIHRvdWNoQWN0aW9uICs9ICcgcGluY2gtem9vbSc7XG4gIH1cbiAgcmV0dXJuIHRvdWNoQWN0aW9uO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRUb3VjaEFjdGlvbjsiLCJmdW5jdGlvbiBhZGRFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59O1xuXG5mdW5jdGlvbiByZW1vdmVFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59XG5cbmV4cG9ydCB7XG4gIGFkZEV2ZW50LFxuICByZW1vdmVFdmVudFxufTsiLCJpbXBvcnQgZWFzaW5ncyBmcm9tICcuL3V0aWxzL2Vhc2luZ3MnO1xuaW1wb3J0IHN0eWxlVXRpbHMgZnJvbSAnLi91dGlscy9zdHlsZSc7XG5pbXBvcnQgaXNCYWRBbmRyb2lkIGZyb20gJy4vdXRpbHMvaXNCYWRBbmRyb2lkJztcbmltcG9ydCBnZXRUaW1lIGZyb20gJy4vdXRpbHMvZ2V0VGltZSc7XG5pbXBvcnQgb2Zmc2V0VXRpbHMgZnJvbSAnLi91dGlscy9vZmZzZXQnO1xuaW1wb3J0IGdldFJlY3QgZnJvbSAnLi91dGlscy9nZXRSZWN0JztcbmltcG9ydCB7IGhhc1BvaW50ZXIsIGhhc1RvdWNoIH0gZnJvbSAnLi91dGlscy9kZXRlY3Rvcic7XG5pbXBvcnQgZ2V0VG91Y2hBY3Rpb24gZnJvbSAnLi91dGlscy9nZXRUb3VjaEFjdGlvbic7XG5pbXBvcnQgeyBhZGRFdmVudCwgcmVtb3ZlRXZlbnQgfSBmcm9tICcuL3V0aWxzL2V2ZW50SGFuZGxlcic7XG5pbXBvcnQgcHJlZml4UG9pbnRlckV2ZW50IGZyb20gJy4vdXRpbHMvcHJlZml4UG9pbnRlckV2ZW50JztcblxuLy8gZGVhbCB3aXRoIHJlcXVlc3RBbmltYXRpb25GcmFtZSBjb21wYXRiaWxpdHlcbnZhciByQUYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7IHdpbmRvdy5zZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApOyB9O1xuXG5mdW5jdGlvbiBJc2Nyb2xsKGVsZW0sIG9wdGlvbnMpIHtcbiAgLyoqXG4gICAqIGdldCBzY3JvbGwgbm9kZSBlbGVtZW50XG4gICAqL1xuICB0aGlzLndyYXBwZXIgPSB0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pIDogZWxlbTtcbiAgdGhpcy5zY3JvbGxlciA9IHRoaXMud3JhcHBlci5jaGlsZHJlblswXTtcbiAgdGhpcy5zY3JvbGxlclN0eWxlID0gdGhpcy5zY3JvbGxlci5zdHlsZTtcblxuICAvKipcbiAgICogbWVyZ2UgZGVmYXVsdCBvcHRpb25zIGFuZCBjdXN0b21pemVkIG9wdGlvbnNcbiAgICovXG4gIHRoaXMub3B0aW9ucyA9IHtcbiAgICBkaXNhYmxlUG9pbnRlcjogIWhhc1BvaW50ZXIsXG4gICAgZGlzYWJsZVRvdWNoIDogaGFzUG9pbnRlciB8fCAhaGFzVG91Y2gsXG4gICAgZGlzYWJsZU1vdXNlOiBoYXNQb2ludGVyIHx8ICFoYXNUb3VjaCxcbiAgICB1c2VUcmFuc2l0aW9uOiB0cnVlLFxuICAgIHVzZVRyYW5zZm9ybTogdHJ1ZSxcbiAgICBzY3JvbGxZOiB0cnVlLFxuXHRcdHN0YXJ0WDogMCxcbiAgICBzdGFydFk6IDAsXG4gICAgYmluZFRvV3JhcHBlcjogdHlwZW9mIHdpbmRvdy5vbm1vdXNlZG93biA9PT0gXCJ1bmRlZmluZWRcIlxuICB9O1xuXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9uc1tpXSA9IG9wdGlvbnNbaV07XG4gIH1cblxuICB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSB0cnVlID8gJ3ZlcnRpY2FsJyA6IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoO1xuXG4gIC8vIElmIHlvdSB3YW50IGV2ZW50UGFzc3Rocm91Z2ggSSBoYXZlIHRvIGxvY2sgb25lIG9mIHRoZSBheGVzXG4gIHRoaXMub3B0aW9ucy5zY3JvbGxZID0gdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ3ZlcnRpY2FsJyA/IGZhbHNlIDogdGhpcy5vcHRpb25zLnNjcm9sbFk7XG4gIHRoaXMub3B0aW9ucy5zY3JvbGxYID0gdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ2hvcml6b250YWwnID8gZmFsc2UgOiB0aGlzLm9wdGlvbnMuc2Nyb2xsWDtcblxuICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nID0gdHlwZW9mIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcgPT0gJ3N0cmluZycgPyBcbiAgICBlYXNpbmdzW3RoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmddIHx8IGVhc2luZ3MuY2lyY3VsYXIgOiBcbiAgICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nO1xuXG4gIHRoaXMueCA9IDA7XG4gIHRoaXMueSA9IDA7XG5cbiAgdGhpcy5faW5pdCgpO1xuICB0aGlzLnJlZnJlc2goKTtcbiAgdGhpcy5zY3JvbGxUbyh0aGlzLm9wdGlvbnMuc3RhcnRYLCB0aGlzLm9wdGlvbnMuc3RhcnRZKTtcbn1cblxuSXNjcm9sbC5wcm90b3R5cGUgPSB7XG5cbiAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pbml0RXZlbnRzKCk7XG4gIH0sXG5cbiAgX2luaXRFdmVudHM6IGZ1bmN0aW9uIChyZW1vdmUpIHtcbiAgICB2YXIgZXZlbnRUeXBlID0gcmVtb3ZlID8gcmVtb3ZlRXZlbnQgOiBhZGRFdmVudCxcbiAgICAgIHRhcmdldCA9IHRoaXMub3B0aW9ucy5iaW5kVG9XcmFwcGVyID8gdGhpcy53cmFwcGVyIDogd2luZG93O1xuXG4gICAgZXZlbnRUeXBlKHdpbmRvdywgJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHdpbmRvdywgJ3Jlc2l6ZScsIHRoaXMpO1xuXG4gICAgaWYgKCB0aGlzLm9wdGlvbnMuY2xpY2sgKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCAnY2xpY2snLCB0aGlzLCB0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAoICF0aGlzLm9wdGlvbnMuZGlzYWJsZU1vdXNlICkge1xuXHRcdFx0ZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ21vdXNlZG93bicsIHRoaXMpO1xuXHRcdFx0ZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNlbW92ZScsIHRoaXMpO1xuXHRcdFx0ZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNlY2FuY2VsJywgdGhpcyk7XG5cdFx0XHRldmVudFR5cGUodGFyZ2V0LCAnbW91c2V1cCcsIHRoaXMpO1xuICAgIH1cblxuICAgIGlmICggaGFzUG9pbnRlciAmJiAhdGhpcy5vcHRpb25zLmRpc2FibGVQb2ludGVyICkge1xuXHRcdFx0ZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgdXRpbHMucHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVyZG93bicpLCB0aGlzKTtcblx0XHRcdGV2ZW50VHlwZSh0YXJnZXQsIHV0aWxzLnByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcm1vdmUnKSwgdGhpcyk7XG5cdFx0XHRldmVudFR5cGUodGFyZ2V0LCB1dGlscy5wcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJjYW5jZWwnKSwgdGhpcyk7XG5cdFx0XHRldmVudFR5cGUodGFyZ2V0LCB1dGlscy5wcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJ1cCcpLCB0aGlzKTtcbiAgICB9XG5cblx0XHRpZiAoIGhhc1RvdWNoICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVRvdWNoICkge1xuXHRcdFx0ZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ3RvdWNoc3RhcnQnLCB0aGlzKTtcblx0XHRcdGV2ZW50VHlwZSh0YXJnZXQsICd0b3VjaG1vdmUnLCB0aGlzKTtcblx0XHRcdGV2ZW50VHlwZSh0YXJnZXQsICd0b3VjaGNhbmNlbCcsIHRoaXMpO1xuXHRcdFx0ZXZlbnRUeXBlKHRhcmdldCwgJ3RvdWNoZW5kJywgdGhpcyk7XG5cdFx0fVxuXG5cdFx0ZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICd0cmFuc2l0aW9uZW5kJywgdGhpcyk7XG5cdFx0ZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICd3ZWJraXRUcmFuc2l0aW9uRW5kJywgdGhpcyk7XG5cdFx0ZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICdvVHJhbnNpdGlvbkVuZCcsIHRoaXMpO1xuXHRcdGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAnTVNUcmFuc2l0aW9uRW5kJywgdGhpcyk7XG4gIH0sXG5cbiAgc2Nyb2xsVG86IGZ1bmN0aW9uICh4LCB5LCB0aW1lLCBlYXNpbmcpIHtcbiAgICBlYXNpbmcgPSBlYXNpbmcgfHwgZWFzaW5ncy5jaXJjdWxhcjtcbiAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgdGltZSA+IDA7XG4gICAgdmFyIHRyYW5zaXRpb25UeXBlID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgZWFzaW5nLnN0eWxlO1xuXG4gICAgaWYgKCF0aW1lIHx8IHRyYW5zaXRpb25UeXBlKSB7XG4gICAgICBpZiAodHJhbnNpdGlvblR5cGUpIHtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uKGVhc2luZy5zdHlsZSk7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1lKHRpbWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5fdHJhbnNsYXRlKHgsIHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hbmltYXRlKHgsIHksIHRpbWUsIGVhc2luZy5mbik7XG4gICAgfVxuICB9LFxuXG4gIHNjcm9sbFRvRWxlbWVudDogZnVuY3Rpb24gKGVsLCB0aW1lLCBvZmZzZXRYLCBvZmZzZXRZLCBlYXNpbmcpIHtcbiAgICBlbCA9IGVsLm5vZGVUeXBlID8gZWwgOiB0aGlzLnNjcm9sbGVyLnF1ZXJ5U2VsZWN0b3IoZWwpO1xuXG4gICAgLy8gaWYgbm8gZWxlbWVudCBzZWxlY3RlZCwgdGhlbiByZXR1cm5cbiAgICBpZiAoIWVsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHBvcyA9IG9mZnNldFV0aWxzKGVsKTtcbiAgfSxcblxuICBfdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uOiBmdW5jdGlvbiAoZWFzaW5nU3R5bGUpIHtcbiAgICAvLyBhc3NpZ24gZWFzaW5nIGNzcyBzdHlsZSB0byBzY3JvbGwgY29udGFpbmVyIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiBwcm9wZXJ0eVxuICAgIC8vIGV4YW1wbGU6IGN1YmljLWJlemllcigwLjI1LCAwLjQ2LCAwLjQ1LCAwLjk0KVxuICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtzdHlsZVV0aWxzLnRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbl0gPSBlYXNpbmdTdHlsZTtcbiAgfSxcblxuICBfdHJhbnNpdGlvblRpbWU6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgLy8gaWYgZG8gbm90IHVzZSB0cmFuc2l0aW9uIHRvIHNjcm9sbCwgcmV0dXJuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRpbWUgPSB0aW1lIHx8IDA7XG4gICAgLy8gdHJhbnNpdGlvbkR1cmF0aW9uIHdoaWNoIGhhcyB2ZW5kb3IgcHJlZml4XG4gICAgdmFyIGR1cmF0aW9uUHJvcCA9IHN0eWxlVXRpbHMudHJhbnNpdGlvbkR1cmF0aW9uO1xuICAgIGlmICghZHVyYXRpb25Qcm9wKSB7IC8vIGlmIG5vIHZlbmRvciBmb3VuZCwgZHVyYXRpb25Qcm9wIHdpbGwgYmUgZmFsc2VcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9IHRpbWUgKyAnbXMnOyAvLyBhc3NpZ24gbXMgdG8gdHJhbnNpdGlvbkR1cmF0aW9uIHByb3BcblxuICAgIGlmICghdGltZSAmJiBpc0JhZEFuZHJvaWQpIHtcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gJzAuMDAwMW1zJztcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgckFGKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHNlbGYuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID09PSAnMC4wMDAxbXMnKSB7XG4gICAgICAgICAgc2VsZi5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSAnMHMnO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX3RyYW5zbGF0ZTogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zZm9ybSkge1xuXG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGVbc3R5bGVVdGlscy50cmFuc2Zvcm1dID1cbiAgICAgICAgJ3RyYW5zbGF0ZSgnICsgeCArICdweCwnICsgeSArICdweCknICsgJ3RyYW5zbGF0ZVooMCknO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHggPSBNYXRoLnJvdW5kKHgpO1xuICAgICAgeSA9IE1hdGgucm91bmQoeSk7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGUubGVmdCA9IHggKyAncHgnO1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlLnRvcCA9IHkgKyAncHgnO1xuICAgIH1cblxuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgfSxcblxuICBfYW5pbWF0ZTogZnVuY3Rpb24gKGRlc3RYLCBkZXN0WSwgZHVyYXRpb24sIGVhc2luZ0ZuKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzLFxuICAgICAgc3RhcnRYID0gdGhpcy54LFxuICAgICAgc3RhcnRZID0gdGhpcy55LFxuICAgICAgc3RhcnRUaW1lID0gZ2V0VGltZSgpLFxuICAgICAgZGVzdFRpbWUgPSBzdGFydFRpbWUgKyBkdXJhdGlvbjtcblxuICAgIGZ1bmN0aW9uIHN0ZXAoKSB7XG4gICAgICB2YXIgbm93ID0gZ2V0VGltZSgpLFxuICAgICAgICBuZXdYLCBuZXdZLFxuICAgICAgICBlYXNpbmc7XG5cbiAgICAgIGlmIChub3cgPj0gZGVzdFRpbWUpIHtcbiAgICAgICAgdGhhdC5pc0FuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICB0aGF0Ll90cmFuc2xhdGUoZGVzdFgsIGRlc3RZKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIG5vdyA9IChub3cgLSBzdGFydFRpbWUpIC8gZHVyYXRpb247XG4gICAgICBlYXNpbmcgPSBlYXNpbmdGbihub3cpO1xuICAgICAgbmV3WCA9IChkZXN0WCAtIHN0YXJ0WCkgKiBlYXNpbmcgKyBzdGFydFg7XG4gICAgICBuZXdZID0gKGRlc3RZIC0gc3RhcnRZKSAqIGVhc2luZyArIHN0YXJ0WTtcbiAgICAgIHRoYXQuX3RyYW5zbGF0ZShuZXdYLCBuZXdZKTtcblxuICAgICAgaWYgKHRoYXQuaXNBbmltYXRpbmcpIHtcbiAgICAgICAgckFGKHN0ZXApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNBbmltYXRpbmcgPSB0cnVlO1xuICAgIHN0ZXAoKTtcbiAgfSxcblxuICByZWZyZXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgZ2V0UmVjdCh0aGlzLndyYXBwZXIpOyAvLyBGb3JjZSByZWZsb3dcblxuICAgIHRoaXMud3JhcHBlcldpZHRoID0gdGhpcy53cmFwcGVyLmNsaWVudFdpZHRoO1xuICAgIHRoaXMud3JhcHBlckhlaWdodCA9IHRoaXMud3JhcHBlci5jbGllbnRIZWlnaHQ7XG5cbiAgICB2YXIgcmVjdCA9IGdldFJlY3QodGhpcy5zY3JvbGxlcik7XG5cbiAgICB0aGlzLnNjcm9sbGVyV2lkdGggPSByZWN0LndpZHRoO1xuICAgIHRoaXMuc2Nyb2xsZXJIZWlnaHQgPSByZWN0LmhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIHRoaXMubWF4U2Nyb2xsWCBvciB0aGlzLm1heFNjcm9sbFkgc21hbGxlciB0aGFuIDAsIG1lYW5pbmdcbiAgICAgKiBvdmVyZmxvdyBoYXBwZW5lZC5cbiAgICAgKi9cbiAgICB0aGlzLm1heFNjcm9sbFggPSB0aGlzLndyYXBwZXJXaWR0aCAtIHRoaXMuc2Nyb2xsZXJXaWR0aDtcbiAgICB0aGlzLm1heFNjcm9sbFkgPSB0aGlzLndyYXBwZXJIZWlnaHQgLSB0aGlzLnNjcm9sbGVySGVpZ2h0O1xuXG4gICAgLyoqXG4gICAgICogb3B0aW9uIGVuYWJsZXMgc2Nyb2xsIEFORCBvdmVyZmxvdyBleGlzdHNcbiAgICAgKi9cbiAgICB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPSB0aGlzLm9wdGlvbnMuc2Nyb2xsWCAmJiB0aGlzLm1heFNjcm9sbFggPCAwO1xuICAgIHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPSB0aGlzLm9wdGlvbnMuc2Nyb2xsWSAmJiB0aGlzLm1heFNjcm9sbFkgPCAwO1xuXG4gICAgaWYgKCF0aGlzLmhhc0hvcml6b250YWxTY3JvbGwpIHtcbiAgICAgIHRoaXMubWF4U2Nyb2xsWCA9IDA7XG4gICAgICB0aGlzLnNjcm9sbGVyV2lkdGggPSB0aGlzLndyYXBwZXJXaWR0aDtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaGFzVmVydGljYWxTY3JvbGwpIHtcbiAgICAgIHRoaXMubWF4U2Nyb2xsWSA9IDA7XG4gICAgICB0aGlzLnNjcm9sbGVySGVpZ2h0ID0gdGhpcy53cmFwcGVySGVpZ2h0O1xuICAgIH1cblxuICAgIHRoaXMuZW5kVGltZSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25YID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSAwO1xuXG4gICAgaWYgKGhhc1BvaW50ZXIgJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlUG9pbnRlcikge1xuICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dID1cbiAgICAgICAgZ2V0VG91Y2hBY3Rpb24odGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2gsIHRydWUpO1xuXG4gICAgICBpZiAoIXRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSkge1xuICAgICAgICB0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0gPVxuICAgICAgICAgIGdldFRvdWNoQWN0aW9uKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy53cmFwcGVyT2Zmc2V0ID0gb2Zmc2V0VXRpbHModGhpcy53cmFwcGVyKTtcblxuICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgncmVmcmVzaCcpO1xuXG4gICAgdGhpcy5yZXNldFBvc2l0aW9uKCk7XG4gIH0sXG5cbiAgcmVzZXRQb3NpdGlvbjogZnVuY3Rpb24gKHRpbWUpIHtcblx0XHR2YXIgeCA9IHRoaXMueCxcbiAgICB5ID0gdGhpcy55O1xuXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcblxuICAgIGlmICggIXRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCB8fCB0aGlzLnggPiAwICkge1xuICAgICAgeCA9IDA7XG4gICAgfSBlbHNlIGlmICggdGhpcy54IDwgdGhpcy5tYXhTY3JvbGxYICkge1xuICAgICAgeCA9IHRoaXMubWF4U2Nyb2xsWDtcbiAgICB9XG5cbiAgICBpZiAoICF0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsIHx8IHRoaXMueSA+IDAgKSB7XG4gICAgICB5ID0gMDtcbiAgICB9IGVsc2UgaWYgKCB0aGlzLnkgPCB0aGlzLm1heFNjcm9sbFkgKSB7XG4gICAgICB5ID0gdGhpcy5tYXhTY3JvbGxZO1xuICAgIH1cblxuXHRcdGlmICggeCA9PT0gdGhpcy54ICYmIHkgPT09IHRoaXMueSApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cbiAgICB0aGlzLnNjcm9sbFRvKHgsIHksIHRpbWUsIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcpO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBJc2Nyb2xsOyJdLCJuYW1lcyI6WyJlYXNpbmdzIiwiayIsIk1hdGgiLCJzcXJ0IiwiYiIsImYiLCJlIiwicG93Iiwic2luIiwiUEkiLCJfZWxlbWVudFN0eWxlIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwic3R5bGUiLCJfdmVuZG9yIiwidmVuZG9ycyIsInRyYW5zZm9ybSIsImkiLCJsIiwibGVuZ3RoIiwic3Vic3RyIiwiX3ByZWZpeFN0eWxlIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJpc0JhZEFuZHJvaWQiLCJhcHBWZXJzaW9uIiwid2luZG93IiwibmF2aWdhdG9yIiwidGVzdCIsInNhZmFyaVZlcnNpb24iLCJtYXRjaCIsInBhcnNlRmxvYXQiLCJnZXRUaW1lIiwiRGF0ZSIsIm5vdyIsIm9mZnNldCIsImVsIiwibGVmdCIsIm9mZnNldExlZnQiLCJ0b3AiLCJvZmZzZXRUb3AiLCJvZmZzZXRQYXJlbnQiLCJnZXRSZWN0IiwiU1ZHRWxlbWVudCIsInJlY3QiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJ3aWR0aCIsImhlaWdodCIsIm9mZnNldFdpZHRoIiwib2Zmc2V0SGVpZ2h0IiwiaGFzUG9pbnRlciIsIlBvaW50ZXJFdmVudCIsIk1TUG9pbnRlckV2ZW50IiwiaGFzVG91Y2giLCJnZXRUb3VjaEFjdGlvbiIsImV2ZW50UGFzc3Rocm91Z2giLCJhZGRQaW5jaCIsInRvdWNoQWN0aW9uIiwiYWRkRXZlbnQiLCJ0eXBlIiwiZm4iLCJjYXB0dXJlIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50IiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsInJBRiIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsIndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSIsIm1velJlcXVlc3RBbmltYXRpb25GcmFtZSIsIm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJtc1JlcXVlc3RBbmltYXRpb25GcmFtZSIsImNhbGxiYWNrIiwic2V0VGltZW91dCIsIklzY3JvbGwiLCJlbGVtIiwib3B0aW9ucyIsIndyYXBwZXIiLCJxdWVyeVNlbGVjdG9yIiwic2Nyb2xsZXIiLCJjaGlsZHJlbiIsInNjcm9sbGVyU3R5bGUiLCJvbm1vdXNlZG93biIsInNjcm9sbFkiLCJzY3JvbGxYIiwiYm91bmNlRWFzaW5nIiwiY2lyY3VsYXIiLCJ4IiwieSIsIl9pbml0IiwicmVmcmVzaCIsInNjcm9sbFRvIiwic3RhcnRYIiwic3RhcnRZIiwicHJvdG90eXBlIiwiX2luaXRFdmVudHMiLCJyZW1vdmUiLCJldmVudFR5cGUiLCJ0YXJnZXQiLCJiaW5kVG9XcmFwcGVyIiwiY2xpY2siLCJkaXNhYmxlTW91c2UiLCJkaXNhYmxlUG9pbnRlciIsInV0aWxzIiwicHJlZml4UG9pbnRlckV2ZW50IiwiZGlzYWJsZVRvdWNoIiwidGltZSIsImVhc2luZyIsImlzSW5UcmFuc2l0aW9uIiwidXNlVHJhbnNpdGlvbiIsInRyYW5zaXRpb25UeXBlIiwiX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiIsIl90cmFuc2l0aW9uVGltZSIsIl90cmFuc2xhdGUiLCJfYW5pbWF0ZSIsIm9mZnNldFgiLCJvZmZzZXRZIiwibm9kZVR5cGUiLCJwb3MiLCJvZmZzZXRVdGlscyIsImVhc2luZ1N0eWxlIiwic3R5bGVVdGlscyIsInRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiIsImR1cmF0aW9uUHJvcCIsInRyYW5zaXRpb25EdXJhdGlvbiIsInNlbGYiLCJ1c2VUcmFuc2Zvcm0iLCJyb3VuZCIsImRlc3RYIiwiZGVzdFkiLCJkdXJhdGlvbiIsImVhc2luZ0ZuIiwidGhhdCIsInN0YXJ0VGltZSIsImRlc3RUaW1lIiwic3RlcCIsIm5ld1giLCJuZXdZIiwiaXNBbmltYXRpbmciLCJ3cmFwcGVyV2lkdGgiLCJjbGllbnRXaWR0aCIsIndyYXBwZXJIZWlnaHQiLCJjbGllbnRIZWlnaHQiLCJzY3JvbGxlcldpZHRoIiwic2Nyb2xsZXJIZWlnaHQiLCJtYXhTY3JvbGxYIiwibWF4U2Nyb2xsWSIsImhhc0hvcml6b250YWxTY3JvbGwiLCJoYXNWZXJ0aWNhbFNjcm9sbCIsImVuZFRpbWUiLCJkaXJlY3Rpb25YIiwiZGlyZWN0aW9uWSIsIndyYXBwZXJPZmZzZXQiLCJyZXNldFBvc2l0aW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxJQUFJQSxVQUFVO2FBQ0Q7V0FDRixzQ0FERTtRQUVMLFVBQVVDLENBQVYsRUFBYTthQUNSQSxLQUFLLElBQUlBLENBQVQsQ0FBUDs7R0FKUTtZQU9GO1dBQ0QsaUNBREM7UUFFSixVQUFVQSxDQUFWLEVBQWE7YUFDUkMsS0FBS0MsSUFBTCxDQUFVLElBQUssRUFBRUYsQ0FBRixHQUFNQSxDQUFyQixDQUFQOztHQVZRO1FBYU47V0FDRyx5Q0FESDtRQUVBLFVBQVVBLENBQVYsRUFBYTtVQUNYRyxJQUFJLENBQVI7YUFDTyxDQUFDSCxJQUFJQSxJQUFJLENBQVQsSUFBY0EsQ0FBZCxJQUFtQixDQUFDRyxJQUFJLENBQUwsSUFBVUgsQ0FBVixHQUFjRyxDQUFqQyxJQUFzQyxDQUE3Qzs7R0FqQlE7VUFvQko7V0FDQyxFQUREO1FBRUYsVUFBVUgsQ0FBVixFQUFhO1VBQ1gsQ0FBQ0EsS0FBSyxDQUFOLElBQVksSUFBSSxJQUFwQixFQUEyQjtlQUNsQixTQUFTQSxDQUFULEdBQWFBLENBQXBCO09BREYsTUFFTyxJQUFJQSxJQUFLLElBQUksSUFBYixFQUFvQjtlQUNsQixVQUFVQSxLQUFNLE1BQU0sSUFBdEIsSUFBK0JBLENBQS9CLEdBQW1DLElBQTFDO09BREssTUFFQSxJQUFJQSxJQUFLLE1BQU0sSUFBZixFQUFzQjtlQUNwQixVQUFVQSxLQUFNLE9BQU8sSUFBdkIsSUFBZ0NBLENBQWhDLEdBQW9DLE1BQTNDO09BREssTUFFQTtlQUNFLFVBQVVBLEtBQU0sUUFBUSxJQUF4QixJQUFpQ0EsQ0FBakMsR0FBcUMsUUFBNUM7OztHQTlCTTtXQWtDSDtXQUNBLEVBREE7UUFFSCxVQUFVQSxDQUFWLEVBQWE7VUFDWEksSUFBSSxJQUFSO1VBQ0VD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

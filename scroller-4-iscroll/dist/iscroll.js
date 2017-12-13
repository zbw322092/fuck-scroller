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

// deal with requestAnimationFrame compatbility
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
    useTransition: true,
    useTransform: true,
    scrollY: true
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
}

Iscroll.prototype = {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL3V0aWxzL2Vhc2luZ3MuanMiLCIuLi9zcmMvdXRpbHMvc3R5bGUuanMiLCIuLi9zcmMvdXRpbHMvaXNCYWRBbmRyb2lkLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRpbWUuanMiLCIuLi9zcmMvdXRpbHMvb2Zmc2V0LmpzIiwiLi4vc3JjL3V0aWxzL2dldFJlY3QuanMiLCIuLi9zcmMvdXRpbHMvaGFzUG9pbnRlci5qcyIsIi4uL3NyYy91dGlscy9nZXRUb3VjaEFjdGlvbi5qcyIsIi4uL3NyYy9teS1pc2Nyb2xsLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBlYXNpbmdzID0ge1xuICBxdWFkcmF0aWM6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjI1LCAwLjQ2LCAwLjQ1LCAwLjk0KScsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICByZXR1cm4gayAqICgyIC0gayk7XG4gICAgfVxuICB9LFxuICBjaXJjdWxhcjoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMSwgMC41NywgMC4xLCAxKScsXHQvLyBOb3QgcHJvcGVybHkgXCJjaXJjdWxhclwiIGJ1dCB0aGlzIGxvb2tzIGJldHRlciwgaXQgc2hvdWxkIGJlICgwLjA3NSwgMC44MiwgMC4xNjUsIDEpXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KDEgLSAoLS1rICogaykpO1xuICAgIH1cbiAgfSxcbiAgYmFjazoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMTc1LCAwLjg4NSwgMC4zMiwgMS4yNzUpJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciBiID0gNDtcbiAgICAgIHJldHVybiAoayA9IGsgLSAxKSAqIGsgKiAoKGIgKyAxKSAqIGsgKyBiKSArIDE7XG4gICAgfVxuICB9LFxuICBib3VuY2U6IHtcbiAgICBzdHlsZTogJycsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICBpZiAoKGsgLz0gMSkgPCAoMSAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiBrICogaztcbiAgICAgIH0gZWxzZSBpZiAoayA8ICgyIC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIChrIC09ICgxLjUgLyAyLjc1KSkgKiBrICsgMC43NTtcbiAgICAgIH0gZWxzZSBpZiAoayA8ICgyLjUgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuMjUgLyAyLjc1KSkgKiBrICsgMC45Mzc1O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjYyNSAvIDIuNzUpKSAqIGsgKyAwLjk4NDM3NTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGVsYXN0aWM6IHtcbiAgICBzdHlsZTogJycsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICB2YXIgZiA9IDAuMjIsXG4gICAgICAgIGUgPSAwLjQ7XG5cbiAgICAgIGlmIChrID09PSAwKSB7IHJldHVybiAwOyB9XG4gICAgICBpZiAoayA9PSAxKSB7IHJldHVybiAxOyB9XG5cbiAgICAgIHJldHVybiAoZSAqIE1hdGgucG93KDIsIC0gMTAgKiBrKSAqIE1hdGguc2luKChrIC0gZiAvIDQpICogKDIgKiBNYXRoLlBJKSAvIGYpICsgMSk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBlYXNpbmdzOyIsInZhciBfZWxlbWVudFN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jykuc3R5bGU7XG5cbnZhciBfdmVuZG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgdmFyIHZlbmRvcnMgPSBbJ3QnLCAnd2Via2l0VCcsICdNb3pUJywgJ21zVCcsICdPVCddLFxuICAgIHRyYW5zZm9ybSxcbiAgICBpID0gMCxcbiAgICBsID0gdmVuZG9ycy5sZW5ndGg7XG5cbiAgd2hpbGUgKGkgPCBsKSB7XG4gICAgdHJhbnNmb3JtID0gdmVuZG9yc1tpXSArICdyYW5zZm9ybSc7XG4gICAgaWYgKHRyYW5zZm9ybSBpbiBfZWxlbWVudFN0eWxlKSB7XG4gICAgICByZXR1cm4gdmVuZG9yc1tpXS5zdWJzdHIoMCwgdmVuZG9yc1tpXS5sZW5ndGggLSAxKTtcbiAgICB9XG4gICAgaSsrO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufSkoKTtcblxuZnVuY3Rpb24gX3ByZWZpeFN0eWxlIChzdHlsZSkge1xuICBpZiAoIF92ZW5kb3IgPT09IGZhbHNlICkgcmV0dXJuIGZhbHNlOyAvLyBubyB2ZW5kb3IgZm91bmRcbiAgaWYgKCBfdmVuZG9yID09PSAnJyApIHJldHVybiBzdHlsZTsgLy8gbm8gcHJlZml4IG5lZWRlZFxuICByZXR1cm4gX3ZlbmRvciArIHN0eWxlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3R5bGUuc3Vic3RyKDEpOyAvLyBvdGhlcndpc2UgYWRkIHByZWZpeFxufVxuXG4vLyBzdHlsZSB0aGF0IGhhcyB2ZW5kb3IgcHJlZml4LCBlZzogd2Via2l0VHJhbnNmb3JtXG52YXIgc3R5bGUgPSB7XG4gIHRyYW5zZm9ybTogX3ByZWZpeFN0eWxlKCd0cmFuc2Zvcm0nKSxcbiAgdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uOiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbicpLFxuICB0cmFuc2l0aW9uRHVyYXRpb246IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvbkR1cmF0aW9uJyksXG4gIHRyYW5zaXRpb25EZWxheTogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uRGVsYXknKSxcbiAgdHJhbnNmb3JtT3JpZ2luOiBfcHJlZml4U3R5bGUoJ3RyYW5zZm9ybU9yaWdpbicpLFxuICB0b3VjaEFjdGlvbjogX3ByZWZpeFN0eWxlKCd0b3VjaEFjdGlvbicpXG59O1xuXG5leHBvcnQgZGVmYXVsdCBzdHlsZTsiLCJ2YXIgaXNCYWRBbmRyb2lkID0gKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGFwcFZlcnNpb24gPSB3aW5kb3cubmF2aWdhdG9yLmFwcFZlcnNpb247XG5cbiAgaWYgKC9BbmRyb2lkLy50ZXN0KGFwcFZlcnNpb24pICYmICEoL0Nocm9tZVxcL1xcZC8udGVzdChhcHBWZXJzaW9uKSkpIHtcbiAgICB2YXIgc2FmYXJpVmVyc2lvbiA9IGFwcFZlcnNpb24ubWF0Y2goL1NhZmFyaVxcLyhcXGQrLlxcZCkvKTtcbiAgICBpZihzYWZhcmlWZXJzaW9uICYmIHR5cGVvZiBzYWZhcmlWZXJzaW9uID09PSBcIm9iamVjdFwiICYmIHNhZmFyaVZlcnNpb24ubGVuZ3RoID49IDIpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KHNhZmFyaVZlcnNpb25bMV0pIDwgNTM1LjE5O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59KSgpO1xuXG5leHBvcnQgZGVmYXVsdCBpc0JhZEFuZHJvaWQ7IiwiLyoqXG4gKiAxLiBEYXRlLnByb3RvdHlwZS5nZXRUaW1lIGhhcyBCRVRURVIgY29tcGF0aWJpbGl0eSB0aGFuIERhdGUubm93XG4gKiByZWZlcmVuY2U6IFxuICogIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0RhdGUvZ2V0VGltZSNCcm93c2VyX2NvbXBhdGliaWxpdHlcbiAqICBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9EYXRlL25vdyNCcm93c2VyX2NvbXBhdGliaWxpdHlcbiAqIFxuICogMi4gRGF0ZS5wcm90b3R5cGUuZ2V0VGltZSBzcGVlZCBpcyBTTE9XU0VSIHRoYW4gRGF0ZS5ub3dcbiAqIHJlZmVyZW5jZTpcbiAqICBodHRwczovL2pzcGVyZi5jb20vZGF0ZS1ub3ctdnMtZGF0ZS1nZXR0aW1lLzdcbiAqL1xuXG52YXIgZ2V0VGltZSA9IERhdGUubm93IHx8XG4gIGZ1bmN0aW9uIGdldFRpbWUoKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9O1xuXG5leHBvcnQgZGVmYXVsdCBnZXRUaW1lOyIsInZhciBvZmZzZXQgPSBmdW5jdGlvbiAoZWwpIHtcbiAgdmFyIGxlZnQgPSAtZWwub2Zmc2V0TGVmdCxcbiAgdG9wID0gLWVsLm9mZnNldFRvcDtcblxuICAvKipcbiAgICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0hUTUxFbGVtZW50L29mZnNldFBhcmVudFxuICAgKiBSZXR1cm5zIG51bGwgd2hlbiB0aGUgZWxlbWVudCBoYXMgc3R5bGUuZGlzcGxheSBzZXQgdG8gXCJub25lXCIuIFRoZSBvZmZzZXRQYXJlbnQgXG4gICAqIGlzIHVzZWZ1bCBiZWNhdXNlIG9mZnNldFRvcCBhbmQgb2Zmc2V0TGVmdCBhcmUgcmVsYXRpdmUgdG8gaXRzIHBhZGRpbmcgZWRnZS5cbiAgICovXG4gIHdoaWxlIChlbCA9IGVsLm9mZnNldFBhcmVudCkge1xuICAgIGxlZnQgLT0gZWwub2Zmc2V0TGVmdDtcbiAgICB0b3AgLT0gZWwub2Zmc2V0VG9wO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBsZWZ0LFxuICAgIHRvcDogdG9wXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IG9mZnNldDsiLCJmdW5jdGlvbiBnZXRSZWN0KGVsKSB7XG4gIGlmIChlbCBpbnN0YW5jZW9mIFNWR0VsZW1lbnQpIHtcbiAgICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcCA6IHJlY3QudG9wLFxuICAgICAgbGVmdCA6IHJlY3QubGVmdCxcbiAgICAgIHdpZHRoIDogcmVjdC53aWR0aCxcbiAgICAgIGhlaWdodCA6IHJlY3QuaGVpZ2h0XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB7XG4gICAgICB0b3AgOiBlbC5vZmZzZXRUb3AsXG4gICAgICBsZWZ0IDogZWwub2Zmc2V0TGVmdCxcbiAgICAgIHdpZHRoIDogZWwub2Zmc2V0V2lkdGgsXG4gICAgICBoZWlnaHQgOiBlbC5vZmZzZXRIZWlnaHRcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdldFJlY3Q7IiwidmFyIGhhc1BvaW50ZXIgPSAhISh3aW5kb3cuUG9pbnRlckV2ZW50IHx8IHdpbmRvdy5NU1BvaW50ZXJFdmVudCk7IC8vIElFMTAgaXMgcHJlZml4ZWRcblxuZXhwb3J0IGRlZmF1bHQgaGFzUG9pbnRlcjsiLCJ2YXIgZ2V0VG91Y2hBY3Rpb24gPSBmdW5jdGlvbiAoZXZlbnRQYXNzdGhyb3VnaCwgYWRkUGluY2gpIHtcbiAgdmFyIHRvdWNoQWN0aW9uID0gJ25vbmUnO1xuICBpZiAoZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ3ZlcnRpY2FsJykge1xuICAgIHRvdWNoQWN0aW9uID0gJ3Bhbi15JztcbiAgfSBlbHNlIGlmIChldmVudFBhc3N0aHJvdWdoID09PSAnaG9yaXpvbnRhbCcpIHtcbiAgICB0b3VjaEFjdGlvbiA9ICdwYW4teCc7XG4gIH1cblxuICBpZiAoYWRkUGluY2ggJiYgdG91Y2hBY3Rpb24gIT0gJ25vbmUnKSB7XG4gICAgLy8gYWRkIHBpbmNoLXpvb20gc3VwcG9ydCBpZiB0aGUgYnJvd3NlciBzdXBwb3J0cyBpdCwgYnV0IGlmIG5vdCAoZWcuIENocm9tZSA8NTUpIGRvIG5vdGhpbmdcbiAgICB0b3VjaEFjdGlvbiArPSAnIHBpbmNoLXpvb20nO1xuICB9XG4gIHJldHVybiB0b3VjaEFjdGlvbjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZ2V0VG91Y2hBY3Rpb247IiwiaW1wb3J0IGVhc2luZ3MgZnJvbSAnLi91dGlscy9lYXNpbmdzJztcbmltcG9ydCBzdHlsZVV0aWxzIGZyb20gJy4vdXRpbHMvc3R5bGUnO1xuaW1wb3J0IGlzQmFkQW5kcm9pZCBmcm9tICcuL3V0aWxzL2lzQmFkQW5kcm9pZCc7XG5pbXBvcnQgZ2V0VGltZSBmcm9tICcuL3V0aWxzL2dldFRpbWUnO1xuaW1wb3J0IG9mZnNldFV0aWxzIGZyb20gJy4vdXRpbHMvb2Zmc2V0JztcbmltcG9ydCBnZXRSZWN0IGZyb20gJy4vdXRpbHMvZ2V0UmVjdCc7XG5pbXBvcnQgaGFzUG9pbnRlciBmcm9tICcuL3V0aWxzL2hhc1BvaW50ZXInO1xuaW1wb3J0IGdldFRvdWNoQWN0aW9uIGZyb20gJy4vdXRpbHMvZ2V0VG91Y2hBY3Rpb24nO1xuXG4vLyBkZWFsIHdpdGggcmVxdWVzdEFuaW1hdGlvbkZyYW1lIGNvbXBhdGJpbGl0eVxudmFyIHJBRiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICBmdW5jdGlvbiAoY2FsbGJhY2spIHsgd2luZG93LnNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MCk7IH07XG5cbmZ1bmN0aW9uIElzY3JvbGwoZWxlbSwgb3B0aW9ucykge1xuICAvKipcbiAgICogZ2V0IHNjcm9sbCBub2RlIGVsZW1lbnRcbiAgICovXG4gIHRoaXMud3JhcHBlciA9IHR5cGVvZiBlbGVtID09PSAnc3RyaW5nJyA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbSkgOiBlbGVtO1xuICB0aGlzLnNjcm9sbGVyID0gdGhpcy53cmFwcGVyLmNoaWxkcmVuWzBdO1xuICB0aGlzLnNjcm9sbGVyU3R5bGUgPSB0aGlzLnNjcm9sbGVyLnN0eWxlO1xuXG4gIC8qKlxuICAgKiBtZXJnZSBkZWZhdWx0IG9wdGlvbnMgYW5kIGN1c3RvbWl6ZWQgb3B0aW9uc1xuICAgKi9cbiAgdGhpcy5vcHRpb25zID0ge1xuICAgIGRpc2FibGVQb2ludGVyOiAhaGFzUG9pbnRlcixcbiAgICB1c2VUcmFuc2l0aW9uOiB0cnVlLFxuICAgIHVzZVRyYW5zZm9ybTogdHJ1ZSxcbiAgICBzY3JvbGxZOiB0cnVlLFxuICB9O1xuXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9uc1tpXSA9IG9wdGlvbnNbaV07XG4gIH1cblxuICB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSB0cnVlID8gJ3ZlcnRpY2FsJyA6IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoO1xuXG4gIC8vIElmIHlvdSB3YW50IGV2ZW50UGFzc3Rocm91Z2ggSSBoYXZlIHRvIGxvY2sgb25lIG9mIHRoZSBheGVzXG4gIHRoaXMub3B0aW9ucy5zY3JvbGxZID0gdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ3ZlcnRpY2FsJyA/IGZhbHNlIDogdGhpcy5vcHRpb25zLnNjcm9sbFk7XG4gIHRoaXMub3B0aW9ucy5zY3JvbGxYID0gdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ2hvcml6b250YWwnID8gZmFsc2UgOiB0aGlzLm9wdGlvbnMuc2Nyb2xsWDtcblxuICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nID0gdHlwZW9mIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcgPT0gJ3N0cmluZycgPyBcbiAgICBlYXNpbmdzW3RoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmddIHx8IGVhc2luZ3MuY2lyY3VsYXIgOiBcbiAgICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nO1xuXG4gIHRoaXMueCA9IDA7XG4gIHRoaXMueSA9IDA7XG59XG5cbklzY3JvbGwucHJvdG90eXBlID0ge1xuICBzY3JvbGxUbzogZnVuY3Rpb24gKHgsIHksIHRpbWUsIGVhc2luZykge1xuICAgIGVhc2luZyA9IGVhc2luZyB8fCBlYXNpbmdzLmNpcmN1bGFyO1xuICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSB0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiB0aW1lID4gMDtcbiAgICB2YXIgdHJhbnNpdGlvblR5cGUgPSB0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiBlYXNpbmcuc3R5bGU7XG5cbiAgICBpZiAoIXRpbWUgfHwgdHJhbnNpdGlvblR5cGUpIHtcbiAgICAgIGlmICh0cmFuc2l0aW9uVHlwZSkge1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24oZWFzaW5nLnN0eWxlKTtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWUodGltZSk7XG4gICAgICB9XG4gICAgICB0aGlzLl90cmFuc2xhdGUoeCwgeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FuaW1hdGUoeCwgeSwgdGltZSwgZWFzaW5nLmZuKTtcbiAgICB9XG4gIH0sXG5cbiAgc2Nyb2xsVG9FbGVtZW50OiBmdW5jdGlvbiAoZWwsIHRpbWUsIG9mZnNldFgsIG9mZnNldFksIGVhc2luZykge1xuICAgIGVsID0gZWwubm9kZVR5cGUgPyBlbCA6IHRoaXMuc2Nyb2xsZXIucXVlcnlTZWxlY3RvcihlbCk7XG5cbiAgICAvLyBpZiBubyBlbGVtZW50IHNlbGVjdGVkLCB0aGVuIHJldHVyblxuICAgIGlmICghZWwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcG9zID0gb2Zmc2V0VXRpbHMoZWwpO1xuICB9LFxuXG4gIF90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IGZ1bmN0aW9uIChlYXNpbmdTdHlsZSkge1xuICAgIC8vIGFzc2lnbiBlYXNpbmcgY3NzIHN0eWxlIHRvIHNjcm9sbCBjb250YWluZXIgdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIHByb3BlcnR5XG4gICAgLy8gZXhhbXBsZTogY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpXG4gICAgdGhpcy5zY3JvbGxlclN0eWxlW3N0eWxlVXRpbHMudHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uXSA9IGVhc2luZ1N0eWxlO1xuICB9LFxuXG4gIF90cmFuc2l0aW9uVGltZTogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICAvLyBpZiBkbyBub3QgdXNlIHRyYW5zaXRpb24gdG8gc2Nyb2xsLCByZXR1cm5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcbiAgICAvLyB0cmFuc2l0aW9uRHVyYXRpb24gd2hpY2ggaGFzIHZlbmRvciBwcmVmaXhcbiAgICB2YXIgZHVyYXRpb25Qcm9wID0gc3R5bGVVdGlscy50cmFuc2l0aW9uRHVyYXRpb247XG4gICAgaWYgKCFkdXJhdGlvblByb3ApIHsgLy8gaWYgbm8gdmVuZG9yIGZvdW5kLCBkdXJhdGlvblByb3Agd2lsbCBiZSBmYWxzZVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gdGltZSArICdtcyc7IC8vIGFzc2lnbiBtcyB0byB0cmFuc2l0aW9uRHVyYXRpb24gcHJvcFxuXG4gICAgaWYgKCF0aW1lICYmIGlzQmFkQW5kcm9pZCkge1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSAnMC4wMDAxbXMnO1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICByQUYoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoc2VsZi5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPT09ICcwLjAwMDFtcycpIHtcbiAgICAgICAgICBzZWxmLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9ICcwcyc7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfdHJhbnNsYXRlOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMudXNlVHJhbnNmb3JtKSB7XG5cbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtzdHlsZVV0aWxzLnRyYW5zZm9ybV0gPVxuICAgICAgICAndHJhbnNsYXRlKCcgKyB4ICsgJ3B4LCcgKyB5ICsgJ3B4KScgKyAndHJhbnNsYXRlWigwKSc7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgeCA9IE1hdGgucm91bmQoeCk7XG4gICAgICB5ID0gTWF0aC5yb3VuZCh5KTtcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZS5sZWZ0ID0geCArICdweCc7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGUudG9wID0geSArICdweCc7XG4gICAgfVxuXG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICB9LFxuXG4gIF9hbmltYXRlOiBmdW5jdGlvbiAoZGVzdFgsIGRlc3RZLCBkdXJhdGlvbiwgZWFzaW5nRm4pIHtcbiAgICB2YXIgdGhhdCA9IHRoaXMsXG4gICAgICBzdGFydFggPSB0aGlzLngsXG4gICAgICBzdGFydFkgPSB0aGlzLnksXG4gICAgICBzdGFydFRpbWUgPSBnZXRUaW1lKCksXG4gICAgICBkZXN0VGltZSA9IHN0YXJ0VGltZSArIGR1cmF0aW9uO1xuXG4gICAgZnVuY3Rpb24gc3RlcCgpIHtcbiAgICAgIHZhciBub3cgPSBnZXRUaW1lKCksXG4gICAgICAgIG5ld1gsIG5ld1ksXG4gICAgICAgIGVhc2luZztcblxuICAgICAgaWYgKG5vdyA+PSBkZXN0VGltZSkge1xuICAgICAgICB0aGF0LmlzQW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoYXQuX3RyYW5zbGF0ZShkZXN0WCwgZGVzdFkpO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbm93ID0gKG5vdyAtIHN0YXJ0VGltZSkgLyBkdXJhdGlvbjtcbiAgICAgIGVhc2luZyA9IGVhc2luZ0ZuKG5vdyk7XG4gICAgICBuZXdYID0gKGRlc3RYIC0gc3RhcnRYKSAqIGVhc2luZyArIHN0YXJ0WDtcbiAgICAgIG5ld1kgPSAoZGVzdFkgLSBzdGFydFkpICogZWFzaW5nICsgc3RhcnRZO1xuICAgICAgdGhhdC5fdHJhbnNsYXRlKG5ld1gsIG5ld1kpO1xuXG4gICAgICBpZiAodGhhdC5pc0FuaW1hdGluZykge1xuICAgICAgICByQUYoc3RlcCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5pc0FuaW1hdGluZyA9IHRydWU7XG4gICAgc3RlcCgpO1xuICB9LFxuXG4gIHJlZnJlc2g6IGZ1bmN0aW9uICgpIHtcbiAgICBnZXRSZWN0KHRoaXMud3JhcHBlcik7IC8vIEZvcmNlIHJlZmxvd1xuXG4gICAgdGhpcy53cmFwcGVyV2lkdGggPSB0aGlzLndyYXBwZXIuY2xpZW50V2lkdGg7XG4gICAgdGhpcy53cmFwcGVySGVpZ2h0ID0gdGhpcy53cmFwcGVyLmNsaWVudEhlaWdodDtcblxuICAgIHZhciByZWN0ID0gZ2V0UmVjdCh0aGlzLnNjcm9sbGVyKTtcblxuICAgIHRoaXMuc2Nyb2xsZXJXaWR0aCA9IHJlY3Qud2lkdGg7XG4gICAgdGhpcy5zY3JvbGxlckhlaWdodCA9IHJlY3QuaGVpZ2h0O1xuXG4gICAgLyoqXG4gICAgICogdGhpcy5tYXhTY3JvbGxYIG9yIHRoaXMubWF4U2Nyb2xsWSBzbWFsbGVyIHRoYW4gMCwgbWVhbmluZ1xuICAgICAqIG92ZXJmbG93IGhhcHBlbmVkLlxuICAgICAqL1xuICAgIHRoaXMubWF4U2Nyb2xsWCA9IHRoaXMud3JhcHBlcldpZHRoIC0gdGhpcy5zY3JvbGxlcldpZHRoO1xuICAgIHRoaXMubWF4U2Nyb2xsWSA9IHRoaXMud3JhcHBlckhlaWdodCAtIHRoaXMuc2Nyb2xsZXJIZWlnaHQ7XG5cbiAgICAvKipcbiAgICAgKiBvcHRpb24gZW5hYmxlcyBzY3JvbGwgQU5EIG92ZXJmbG93IGV4aXN0c1xuICAgICAqL1xuICAgIHRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCA9IHRoaXMub3B0aW9ucy5zY3JvbGxYICYmIHRoaXMubWF4U2Nyb2xsWCA8IDA7XG4gICAgdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCA9IHRoaXMub3B0aW9ucy5zY3JvbGxZICYmIHRoaXMubWF4U2Nyb2xsWSA8IDA7XG5cbiAgICBpZiAoIXRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCkge1xuICAgICAgdGhpcy5tYXhTY3JvbGxYID0gMDtcbiAgICAgIHRoaXMuc2Nyb2xsZXJXaWR0aCA9IHRoaXMud3JhcHBlcldpZHRoO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCkge1xuICAgICAgdGhpcy5tYXhTY3JvbGxZID0gMDtcbiAgICAgIHRoaXMuc2Nyb2xsZXJIZWlnaHQgPSB0aGlzLndyYXBwZXJIZWlnaHQ7XG4gICAgfVxuXG4gICAgdGhpcy5lbmRUaW1lID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblggPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWSA9IDA7XG5cbiAgICBpZiAoaGFzUG9pbnRlciAmJiAhdGhpcy5vcHRpb25zLmRpc2FibGVQb2ludGVyKSB7XG4gICAgICB0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0gPVxuICAgICAgICBnZXRUb3VjaEFjdGlvbih0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCwgdHJ1ZSk7XG5cbiAgICAgIGlmICghdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dKSB7XG4gICAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSA9XG4gICAgICAgICAgZ2V0VG91Y2hBY3Rpb24odGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2gsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLndyYXBwZXJPZmZzZXQgPSBvZmZzZXRVdGlscyh0aGlzLndyYXBwZXIpO1xuXG4gICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdyZWZyZXNoJyk7XG5cbiAgICB0aGlzLnJlc2V0UG9zaXRpb24oKTtcbiAgfSxcblxuICByZXNldFBvc2l0aW9uOiBmdW5jdGlvbiAodGltZSkge1xuXHRcdHZhciB4ID0gdGhpcy54LFxuICAgIHkgPSB0aGlzLnk7XG5cbiAgICB0aW1lID0gdGltZSB8fCAwO1xuXG4gICAgaWYgKCAhdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsIHx8IHRoaXMueCA+IDAgKSB7XG4gICAgICB4ID0gMDtcbiAgICB9IGVsc2UgaWYgKCB0aGlzLnggPCB0aGlzLm1heFNjcm9sbFggKSB7XG4gICAgICB4ID0gdGhpcy5tYXhTY3JvbGxYO1xuICAgIH1cblxuICAgIGlmICggIXRoaXMuaGFzVmVydGljYWxTY3JvbGwgfHwgdGhpcy55ID4gMCApIHtcbiAgICAgIHkgPSAwO1xuICAgIH0gZWxzZSBpZiAoIHRoaXMueSA8IHRoaXMubWF4U2Nyb2xsWSApIHtcbiAgICAgIHkgPSB0aGlzLm1heFNjcm9sbFk7XG4gICAgfVxuXG5cdFx0aWYgKCB4ID09PSB0aGlzLnggJiYgeSA9PT0gdGhpcy55ICkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuICAgIHRoaXMuc2Nyb2xsVG8oeCwgeSwgdGltZSwgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IElzY3JvbGw7Il0sIm5hbWVzIjpbImVhc2luZ3MiLCJrIiwiTWF0aCIsInNxcnQiLCJiIiwiZiIsImUiLCJwb3ciLCJzaW4iLCJQSSIsIl9lbGVtZW50U3R5bGUiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzdHlsZSIsIl92ZW5kb3IiLCJ2ZW5kb3JzIiwidHJhbnNmb3JtIiwiaSIsImwiLCJsZW5ndGgiLCJzdWJzdHIiLCJfcHJlZml4U3R5bGUiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsImlzQmFkQW5kcm9pZCIsImFwcFZlcnNpb24iLCJ3aW5kb3ciLCJuYXZpZ2F0b3IiLCJ0ZXN0Iiwic2FmYXJpVmVyc2lvbiIsIm1hdGNoIiwicGFyc2VGbG9hdCIsImdldFRpbWUiLCJEYXRlIiwibm93Iiwib2Zmc2V0IiwiZWwiLCJsZWZ0Iiwib2Zmc2V0TGVmdCIsInRvcCIsIm9mZnNldFRvcCIsIm9mZnNldFBhcmVudCIsImdldFJlY3QiLCJTVkdFbGVtZW50IiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsIndpZHRoIiwiaGVpZ2h0Iiwib2Zmc2V0V2lkdGgiLCJvZmZzZXRIZWlnaHQiLCJoYXNQb2ludGVyIiwiUG9pbnRlckV2ZW50IiwiTVNQb2ludGVyRXZlbnQiLCJnZXRUb3VjaEFjdGlvbiIsImV2ZW50UGFzc3Rocm91Z2giLCJhZGRQaW5jaCIsInRvdWNoQWN0aW9uIiwickFGIiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwid2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwibW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwib1JlcXVlc3RBbmltYXRpb25GcmFtZSIsIm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiY2FsbGJhY2siLCJzZXRUaW1lb3V0IiwiSXNjcm9sbCIsImVsZW0iLCJvcHRpb25zIiwid3JhcHBlciIsInF1ZXJ5U2VsZWN0b3IiLCJzY3JvbGxlciIsImNoaWxkcmVuIiwic2Nyb2xsZXJTdHlsZSIsInNjcm9sbFkiLCJzY3JvbGxYIiwiYm91bmNlRWFzaW5nIiwiY2lyY3VsYXIiLCJ4IiwieSIsInByb3RvdHlwZSIsInRpbWUiLCJlYXNpbmciLCJpc0luVHJhbnNpdGlvbiIsInVzZVRyYW5zaXRpb24iLCJ0cmFuc2l0aW9uVHlwZSIsIl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJfdHJhbnNpdGlvblRpbWUiLCJfdHJhbnNsYXRlIiwiX2FuaW1hdGUiLCJmbiIsIm9mZnNldFgiLCJvZmZzZXRZIiwibm9kZVR5cGUiLCJwb3MiLCJvZmZzZXRVdGlscyIsImVhc2luZ1N0eWxlIiwic3R5bGVVdGlscyIsInRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiIsImR1cmF0aW9uUHJvcCIsInRyYW5zaXRpb25EdXJhdGlvbiIsInNlbGYiLCJ1c2VUcmFuc2Zvcm0iLCJyb3VuZCIsImRlc3RYIiwiZGVzdFkiLCJkdXJhdGlvbiIsImVhc2luZ0ZuIiwidGhhdCIsInN0YXJ0WCIsInN0YXJ0WSIsInN0YXJ0VGltZSIsImRlc3RUaW1lIiwic3RlcCIsIm5ld1giLCJuZXdZIiwiaXNBbmltYXRpbmciLCJ3cmFwcGVyV2lkdGgiLCJjbGllbnRXaWR0aCIsIndyYXBwZXJIZWlnaHQiLCJjbGllbnRIZWlnaHQiLCJzY3JvbGxlcldpZHRoIiwic2Nyb2xsZXJIZWlnaHQiLCJtYXhTY3JvbGxYIiwibWF4U2Nyb2xsWSIsImhhc0hvcml6b250YWxTY3JvbGwiLCJoYXNWZXJ0aWNhbFNjcm9sbCIsImVuZFRpbWUiLCJkaXJlY3Rpb25YIiwiZGlyZWN0aW9uWSIsImRpc2FibGVQb2ludGVyIiwid3JhcHBlck9mZnNldCIsInJlc2V0UG9zaXRpb24iLCJzY3JvbGxUbyJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSUEsVUFBVTthQUNEO1dBQ0Ysc0NBREU7UUFFTCxVQUFVQyxDQUFWLEVBQWE7YUFDUkEsS0FBSyxJQUFJQSxDQUFULENBQVA7O0dBSlE7WUFPRjtXQUNELGlDQURDO1FBRUosVUFBVUEsQ0FBVixFQUFhO2FBQ1JDLEtBQUtDLElBQUwsQ0FBVSxJQUFLLEVBQUVGLENBQUYsR0FBTUEsQ0FBckIsQ0FBUDs7R0FWUTtRQWFOO1dBQ0cseUNBREg7UUFFQSxVQUFVQSxDQUFWLEVBQWE7VUFDWEcsSUFBSSxDQUFSO2FBQ08sQ0FBQ0gsSUFBSUEsSUFBSSxDQUFULElBQWNBLENBQWQsSUFBbUIsQ0FBQ0csSUFBSSxDQUFMLElBQVVILENBQVYsR0FBY0csQ0FBakMsSUFBc0MsQ0FBN0M7O0dBakJRO1VBb0JKO1dBQ0MsRUFERDtRQUVGLFVBQVVILENBQVYsRUFBYTtVQUNYLENBQUNBLEtBQUssQ0FBTixJQUFZLElBQUksSUFBcEIsRUFBMkI7ZUFDbEIsU0FBU0EsQ0FBVCxHQUFhQSxDQUFwQjtPQURGLE1BRU8sSUFBSUEsSUFBSyxJQUFJLElBQWIsRUFBb0I7ZUFDbEIsVUFBVUEsS0FBTSxNQUFNLElBQXRCLElBQStCQSxDQUEvQixHQUFtQyxJQUExQztPQURL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

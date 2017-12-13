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

export default Iscroll;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5tb2R1bGUuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9lYXNpbmdzLmpzIiwiLi4vc3JjL3V0aWxzL3N0eWxlLmpzIiwiLi4vc3JjL3V0aWxzL2lzQmFkQW5kcm9pZC5qcyIsIi4uL3NyYy91dGlscy9nZXRUaW1lLmpzIiwiLi4vc3JjL3V0aWxzL29mZnNldC5qcyIsIi4uL3NyYy91dGlscy9nZXRSZWN0LmpzIiwiLi4vc3JjL3V0aWxzL2hhc1BvaW50ZXIuanMiLCIuLi9zcmMvdXRpbHMvZ2V0VG91Y2hBY3Rpb24uanMiLCIuLi9zcmMvbXktaXNjcm9sbC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZWFzaW5ncyA9IHtcbiAgcXVhZHJhdGljOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4yNSwgMC40NiwgMC40NSwgMC45NCknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIGsgKiAoMiAtIGspO1xuICAgIH1cbiAgfSxcbiAgY2lyY3VsYXI6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjEsIDAuNTcsIDAuMSwgMSknLFx0Ly8gTm90IHByb3Blcmx5IFwiY2lyY3VsYXJcIiBidXQgdGhpcyBsb29rcyBiZXR0ZXIsIGl0IHNob3VsZCBiZSAoMC4wNzUsIDAuODIsIDAuMTY1LCAxKVxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIE1hdGguc3FydCgxIC0gKC0tayAqIGspKTtcbiAgICB9XG4gIH0sXG4gIGJhY2s6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjE3NSwgMC44ODUsIDAuMzIsIDEuMjc1KScsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICB2YXIgYiA9IDQ7XG4gICAgICByZXR1cm4gKGsgPSBrIC0gMSkgKiBrICogKChiICsgMSkgKiBrICsgYikgKyAxO1xuICAgIH1cbiAgfSxcbiAgYm91bmNlOiB7XG4gICAgc3R5bGU6ICcnLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgaWYgKChrIC89IDEpIDwgKDEgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogayAqIGs7XG4gICAgICB9IGVsc2UgaWYgKGsgPCAoMiAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMS41IC8gMi43NSkpICogayArIDAuNzU7XG4gICAgICB9IGVsc2UgaWYgKGsgPCAoMi41IC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjI1IC8gMi43NSkpICogayArIDAuOTM3NTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi42MjUgLyAyLjc1KSkgKiBrICsgMC45ODQzNzU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBlbGFzdGljOiB7XG4gICAgc3R5bGU6ICcnLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGYgPSAwLjIyLFxuICAgICAgICBlID0gMC40O1xuXG4gICAgICBpZiAoayA9PT0gMCkgeyByZXR1cm4gMDsgfVxuICAgICAgaWYgKGsgPT0gMSkgeyByZXR1cm4gMTsgfVxuXG4gICAgICByZXR1cm4gKGUgKiBNYXRoLnBvdygyLCAtIDEwICogaykgKiBNYXRoLnNpbigoayAtIGYgLyA0KSAqICgyICogTWF0aC5QSSkgLyBmKSArIDEpO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgZWFzaW5nczsiLCJ2YXIgX2VsZW1lbnRTdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlO1xuXG52YXIgX3ZlbmRvciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciB2ZW5kb3JzID0gWyd0JywgJ3dlYmtpdFQnLCAnTW96VCcsICdtc1QnLCAnT1QnXSxcbiAgICB0cmFuc2Zvcm0sXG4gICAgaSA9IDAsXG4gICAgbCA9IHZlbmRvcnMubGVuZ3RoO1xuXG4gIHdoaWxlIChpIDwgbCkge1xuICAgIHRyYW5zZm9ybSA9IHZlbmRvcnNbaV0gKyAncmFuc2Zvcm0nO1xuICAgIGlmICh0cmFuc2Zvcm0gaW4gX2VsZW1lbnRTdHlsZSkge1xuICAgICAgcmV0dXJuIHZlbmRvcnNbaV0uc3Vic3RyKDAsIHZlbmRvcnNbaV0ubGVuZ3RoIC0gMSk7XG4gICAgfVxuICAgIGkrKztcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn0pKCk7XG5cbmZ1bmN0aW9uIF9wcmVmaXhTdHlsZSAoc3R5bGUpIHtcbiAgaWYgKCBfdmVuZG9yID09PSBmYWxzZSApIHJldHVybiBmYWxzZTsgLy8gbm8gdmVuZG9yIGZvdW5kXG4gIGlmICggX3ZlbmRvciA9PT0gJycgKSByZXR1cm4gc3R5bGU7IC8vIG5vIHByZWZpeCBuZWVkZWRcbiAgcmV0dXJuIF92ZW5kb3IgKyBzdHlsZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0eWxlLnN1YnN0cigxKTsgLy8gb3RoZXJ3aXNlIGFkZCBwcmVmaXhcbn1cblxuLy8gc3R5bGUgdGhhdCBoYXMgdmVuZG9yIHByZWZpeCwgZWc6IHdlYmtpdFRyYW5zZm9ybVxudmFyIHN0eWxlID0ge1xuICB0cmFuc2Zvcm06IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtJyksXG4gIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24nKSxcbiAgdHJhbnNpdGlvbkR1cmF0aW9uOiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EdXJhdGlvbicpLFxuICB0cmFuc2l0aW9uRGVsYXk6IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvbkRlbGF5JyksXG4gIHRyYW5zZm9ybU9yaWdpbjogX3ByZWZpeFN0eWxlKCd0cmFuc2Zvcm1PcmlnaW4nKSxcbiAgdG91Y2hBY3Rpb246IF9wcmVmaXhTdHlsZSgndG91Y2hBY3Rpb24nKVxufTtcblxuZXhwb3J0IGRlZmF1bHQgc3R5bGU7IiwidmFyIGlzQmFkQW5kcm9pZCA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBhcHBWZXJzaW9uID0gd2luZG93Lm5hdmlnYXRvci5hcHBWZXJzaW9uO1xuXG4gIGlmICgvQW5kcm9pZC8udGVzdChhcHBWZXJzaW9uKSAmJiAhKC9DaHJvbWVcXC9cXGQvLnRlc3QoYXBwVmVyc2lvbikpKSB7XG4gICAgdmFyIHNhZmFyaVZlcnNpb24gPSBhcHBWZXJzaW9uLm1hdGNoKC9TYWZhcmlcXC8oXFxkKy5cXGQpLyk7XG4gICAgaWYoc2FmYXJpVmVyc2lvbiAmJiB0eXBlb2Ygc2FmYXJpVmVyc2lvbiA9PT0gXCJvYmplY3RcIiAmJiBzYWZhcmlWZXJzaW9uLmxlbmd0aCA+PSAyKSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdChzYWZhcmlWZXJzaW9uWzFdKSA8IDUzNS4xOTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSkoKTtcblxuZXhwb3J0IGRlZmF1bHQgaXNCYWRBbmRyb2lkOyIsIi8qKlxuICogMS4gRGF0ZS5wcm90b3R5cGUuZ2V0VGltZSBoYXMgQkVUVEVSIGNvbXBhdGliaWxpdHkgdGhhbiBEYXRlLm5vd1xuICogcmVmZXJlbmNlOiBcbiAqICBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9EYXRlL2dldFRpbWUjQnJvd3Nlcl9jb21wYXRpYmlsaXR5XG4gKiAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9ub3cjQnJvd3Nlcl9jb21wYXRpYmlsaXR5XG4gKiBcbiAqIDIuIERhdGUucHJvdG90eXBlLmdldFRpbWUgc3BlZWQgaXMgU0xPV1NFUiB0aGFuIERhdGUubm93XG4gKiByZWZlcmVuY2U6XG4gKiAgaHR0cHM6Ly9qc3BlcmYuY29tL2RhdGUtbm93LXZzLWRhdGUtZ2V0dGltZS83XG4gKi9cblxudmFyIGdldFRpbWUgPSBEYXRlLm5vdyB8fFxuICBmdW5jdGlvbiBnZXRUaW1lKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfTtcblxuZXhwb3J0IGRlZmF1bHQgZ2V0VGltZTsiLCJ2YXIgb2Zmc2V0ID0gZnVuY3Rpb24gKGVsKSB7XG4gIHZhciBsZWZ0ID0gLWVsLm9mZnNldExlZnQsXG4gIHRvcCA9IC1lbC5vZmZzZXRUb3A7XG5cbiAgLyoqXG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9IVE1MRWxlbWVudC9vZmZzZXRQYXJlbnRcbiAgICogUmV0dXJucyBudWxsIHdoZW4gdGhlIGVsZW1lbnQgaGFzIHN0eWxlLmRpc3BsYXkgc2V0IHRvIFwibm9uZVwiLiBUaGUgb2Zmc2V0UGFyZW50IFxuICAgKiBpcyB1c2VmdWwgYmVjYXVzZSBvZmZzZXRUb3AgYW5kIG9mZnNldExlZnQgYXJlIHJlbGF0aXZlIHRvIGl0cyBwYWRkaW5nIGVkZ2UuXG4gICAqL1xuICB3aGlsZSAoZWwgPSBlbC5vZmZzZXRQYXJlbnQpIHtcbiAgICBsZWZ0IC09IGVsLm9mZnNldExlZnQ7XG4gICAgdG9wIC09IGVsLm9mZnNldFRvcDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbGVmdDogbGVmdCxcbiAgICB0b3A6IHRvcFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBvZmZzZXQ7IiwiZnVuY3Rpb24gZ2V0UmVjdChlbCkge1xuICBpZiAoZWwgaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB7XG4gICAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIHJldHVybiB7XG4gICAgICB0b3AgOiByZWN0LnRvcCxcbiAgICAgIGxlZnQgOiByZWN0LmxlZnQsXG4gICAgICB3aWR0aCA6IHJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQgOiByZWN0LmhlaWdodFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgdG9wIDogZWwub2Zmc2V0VG9wLFxuICAgICAgbGVmdCA6IGVsLm9mZnNldExlZnQsXG4gICAgICB3aWR0aCA6IGVsLm9mZnNldFdpZHRoLFxuICAgICAgaGVpZ2h0IDogZWwub2Zmc2V0SGVpZ2h0XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRSZWN0OyIsInZhciBoYXNQb2ludGVyID0gISEod2luZG93LlBvaW50ZXJFdmVudCB8fCB3aW5kb3cuTVNQb2ludGVyRXZlbnQpOyAvLyBJRTEwIGlzIHByZWZpeGVkXG5cbmV4cG9ydCBkZWZhdWx0IGhhc1BvaW50ZXI7IiwidmFyIGdldFRvdWNoQWN0aW9uID0gZnVuY3Rpb24gKGV2ZW50UGFzc3Rocm91Z2gsIGFkZFBpbmNoKSB7XG4gIHZhciB0b3VjaEFjdGlvbiA9ICdub25lJztcbiAgaWYgKGV2ZW50UGFzc3Rocm91Z2ggPT09ICd2ZXJ0aWNhbCcpIHtcbiAgICB0b3VjaEFjdGlvbiA9ICdwYW4teSc7XG4gIH0gZWxzZSBpZiAoZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ2hvcml6b250YWwnKSB7XG4gICAgdG91Y2hBY3Rpb24gPSAncGFuLXgnO1xuICB9XG5cbiAgaWYgKGFkZFBpbmNoICYmIHRvdWNoQWN0aW9uICE9ICdub25lJykge1xuICAgIC8vIGFkZCBwaW5jaC16b29tIHN1cHBvcnQgaWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgaXQsIGJ1dCBpZiBub3QgKGVnLiBDaHJvbWUgPDU1KSBkbyBub3RoaW5nXG4gICAgdG91Y2hBY3Rpb24gKz0gJyBwaW5jaC16b29tJztcbiAgfVxuICByZXR1cm4gdG91Y2hBY3Rpb247XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdldFRvdWNoQWN0aW9uOyIsImltcG9ydCBlYXNpbmdzIGZyb20gJy4vdXRpbHMvZWFzaW5ncyc7XG5pbXBvcnQgc3R5bGVVdGlscyBmcm9tICcuL3V0aWxzL3N0eWxlJztcbmltcG9ydCBpc0JhZEFuZHJvaWQgZnJvbSAnLi91dGlscy9pc0JhZEFuZHJvaWQnO1xuaW1wb3J0IGdldFRpbWUgZnJvbSAnLi91dGlscy9nZXRUaW1lJztcbmltcG9ydCBvZmZzZXRVdGlscyBmcm9tICcuL3V0aWxzL29mZnNldCc7XG5pbXBvcnQgZ2V0UmVjdCBmcm9tICcuL3V0aWxzL2dldFJlY3QnO1xuaW1wb3J0IGhhc1BvaW50ZXIgZnJvbSAnLi91dGlscy9oYXNQb2ludGVyJztcbmltcG9ydCBnZXRUb3VjaEFjdGlvbiBmcm9tICcuL3V0aWxzL2dldFRvdWNoQWN0aW9uJztcblxuLy8gZGVhbCB3aXRoIHJlcXVlc3RBbmltYXRpb25GcmFtZSBjb21wYXRiaWxpdHlcbnZhciByQUYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7IHdpbmRvdy5zZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApOyB9O1xuXG5mdW5jdGlvbiBJc2Nyb2xsKGVsZW0sIG9wdGlvbnMpIHtcbiAgLyoqXG4gICAqIGdldCBzY3JvbGwgbm9kZSBlbGVtZW50XG4gICAqL1xuICB0aGlzLndyYXBwZXIgPSB0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pIDogZWxlbTtcbiAgdGhpcy5zY3JvbGxlciA9IHRoaXMud3JhcHBlci5jaGlsZHJlblswXTtcbiAgdGhpcy5zY3JvbGxlclN0eWxlID0gdGhpcy5zY3JvbGxlci5zdHlsZTtcblxuICAvKipcbiAgICogbWVyZ2UgZGVmYXVsdCBvcHRpb25zIGFuZCBjdXN0b21pemVkIG9wdGlvbnNcbiAgICovXG4gIHRoaXMub3B0aW9ucyA9IHtcbiAgICBkaXNhYmxlUG9pbnRlcjogIWhhc1BvaW50ZXIsXG4gICAgdXNlVHJhbnNpdGlvbjogdHJ1ZSxcbiAgICB1c2VUcmFuc2Zvcm06IHRydWUsXG4gICAgc2Nyb2xsWTogdHJ1ZSxcbiAgfTtcblxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnNbaV0gPSBvcHRpb25zW2ldO1xuICB9XG5cbiAgdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PT0gdHJ1ZSA/ICd2ZXJ0aWNhbCcgOiB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaDtcblxuICAvLyBJZiB5b3Ugd2FudCBldmVudFBhc3N0aHJvdWdoIEkgaGF2ZSB0byBsb2NrIG9uZSBvZiB0aGUgYXhlc1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWSA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICd2ZXJ0aWNhbCcgPyBmYWxzZSA6IHRoaXMub3B0aW9ucy5zY3JvbGxZO1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICdob3Jpem9udGFsJyA/IGZhbHNlIDogdGhpcy5vcHRpb25zLnNjcm9sbFg7XG5cbiAgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyA9IHR5cGVvZiB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nID09ICdzdHJpbmcnID8gXG4gICAgZWFzaW5nc1t0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nXSB8fCBlYXNpbmdzLmNpcmN1bGFyIDogXG4gICAgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZztcblxuICB0aGlzLnggPSAwO1xuICB0aGlzLnkgPSAwO1xufVxuXG5Jc2Nyb2xsLnByb3RvdHlwZSA9IHtcbiAgc2Nyb2xsVG86IGZ1bmN0aW9uICh4LCB5LCB0aW1lLCBlYXNpbmcpIHtcbiAgICBlYXNpbmcgPSBlYXNpbmcgfHwgZWFzaW5ncy5jaXJjdWxhcjtcbiAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgdGltZSA+IDA7XG4gICAgdmFyIHRyYW5zaXRpb25UeXBlID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgZWFzaW5nLnN0eWxlO1xuXG4gICAgaWYgKCF0aW1lIHx8IHRyYW5zaXRpb25UeXBlKSB7XG4gICAgICBpZiAodHJhbnNpdGlvblR5cGUpIHtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uKGVhc2luZy5zdHlsZSk7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1lKHRpbWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5fdHJhbnNsYXRlKHgsIHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hbmltYXRlKHgsIHksIHRpbWUsIGVhc2luZy5mbik7XG4gICAgfVxuICB9LFxuXG4gIHNjcm9sbFRvRWxlbWVudDogZnVuY3Rpb24gKGVsLCB0aW1lLCBvZmZzZXRYLCBvZmZzZXRZLCBlYXNpbmcpIHtcbiAgICBlbCA9IGVsLm5vZGVUeXBlID8gZWwgOiB0aGlzLnNjcm9sbGVyLnF1ZXJ5U2VsZWN0b3IoZWwpO1xuXG4gICAgLy8gaWYgbm8gZWxlbWVudCBzZWxlY3RlZCwgdGhlbiByZXR1cm5cbiAgICBpZiAoIWVsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHBvcyA9IG9mZnNldFV0aWxzKGVsKTtcbiAgfSxcblxuICBfdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uOiBmdW5jdGlvbiAoZWFzaW5nU3R5bGUpIHtcbiAgICAvLyBhc3NpZ24gZWFzaW5nIGNzcyBzdHlsZSB0byBzY3JvbGwgY29udGFpbmVyIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiBwcm9wZXJ0eVxuICAgIC8vIGV4YW1wbGU6IGN1YmljLWJlemllcigwLjI1LCAwLjQ2LCAwLjQ1LCAwLjk0KVxuICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtzdHlsZVV0aWxzLnRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbl0gPSBlYXNpbmdTdHlsZTtcbiAgfSxcblxuICBfdHJhbnNpdGlvblRpbWU6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgLy8gaWYgZG8gbm90IHVzZSB0cmFuc2l0aW9uIHRvIHNjcm9sbCwgcmV0dXJuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRpbWUgPSB0aW1lIHx8IDA7XG4gICAgLy8gdHJhbnNpdGlvbkR1cmF0aW9uIHdoaWNoIGhhcyB2ZW5kb3IgcHJlZml4XG4gICAgdmFyIGR1cmF0aW9uUHJvcCA9IHN0eWxlVXRpbHMudHJhbnNpdGlvbkR1cmF0aW9uO1xuICAgIGlmICghZHVyYXRpb25Qcm9wKSB7IC8vIGlmIG5vIHZlbmRvciBmb3VuZCwgZHVyYXRpb25Qcm9wIHdpbGwgYmUgZmFsc2VcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9IHRpbWUgKyAnbXMnOyAvLyBhc3NpZ24gbXMgdG8gdHJhbnNpdGlvbkR1cmF0aW9uIHByb3BcblxuICAgIGlmICghdGltZSAmJiBpc0JhZEFuZHJvaWQpIHtcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gJzAuMDAwMW1zJztcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgckFGKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHNlbGYuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID09PSAnMC4wMDAxbXMnKSB7XG4gICAgICAgICAgc2VsZi5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSAnMHMnO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX3RyYW5zbGF0ZTogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zZm9ybSkge1xuXG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGVbc3R5bGVVdGlscy50cmFuc2Zvcm1dID1cbiAgICAgICAgJ3RyYW5zbGF0ZSgnICsgeCArICdweCwnICsgeSArICdweCknICsgJ3RyYW5zbGF0ZVooMCknO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHggPSBNYXRoLnJvdW5kKHgpO1xuICAgICAgeSA9IE1hdGgucm91bmQoeSk7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGUubGVmdCA9IHggKyAncHgnO1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlLnRvcCA9IHkgKyAncHgnO1xuICAgIH1cblxuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgfSxcblxuICBfYW5pbWF0ZTogZnVuY3Rpb24gKGRlc3RYLCBkZXN0WSwgZHVyYXRpb24sIGVhc2luZ0ZuKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzLFxuICAgICAgc3RhcnRYID0gdGhpcy54LFxuICAgICAgc3RhcnRZID0gdGhpcy55LFxuICAgICAgc3RhcnRUaW1lID0gZ2V0VGltZSgpLFxuICAgICAgZGVzdFRpbWUgPSBzdGFydFRpbWUgKyBkdXJhdGlvbjtcblxuICAgIGZ1bmN0aW9uIHN0ZXAoKSB7XG4gICAgICB2YXIgbm93ID0gZ2V0VGltZSgpLFxuICAgICAgICBuZXdYLCBuZXdZLFxuICAgICAgICBlYXNpbmc7XG5cbiAgICAgIGlmIChub3cgPj0gZGVzdFRpbWUpIHtcbiAgICAgICAgdGhhdC5pc0FuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICB0aGF0Ll90cmFuc2xhdGUoZGVzdFgsIGRlc3RZKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIG5vdyA9IChub3cgLSBzdGFydFRpbWUpIC8gZHVyYXRpb247XG4gICAgICBlYXNpbmcgPSBlYXNpbmdGbihub3cpO1xuICAgICAgbmV3WCA9IChkZXN0WCAtIHN0YXJ0WCkgKiBlYXNpbmcgKyBzdGFydFg7XG4gICAgICBuZXdZID0gKGRlc3RZIC0gc3RhcnRZKSAqIGVhc2luZyArIHN0YXJ0WTtcbiAgICAgIHRoYXQuX3RyYW5zbGF0ZShuZXdYLCBuZXdZKTtcblxuICAgICAgaWYgKHRoYXQuaXNBbmltYXRpbmcpIHtcbiAgICAgICAgckFGKHN0ZXApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNBbmltYXRpbmcgPSB0cnVlO1xuICAgIHN0ZXAoKTtcbiAgfSxcblxuICByZWZyZXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgZ2V0UmVjdCh0aGlzLndyYXBwZXIpOyAvLyBGb3JjZSByZWZsb3dcblxuICAgIHRoaXMud3JhcHBlcldpZHRoID0gdGhpcy53cmFwcGVyLmNsaWVudFdpZHRoO1xuICAgIHRoaXMud3JhcHBlckhlaWdodCA9IHRoaXMud3JhcHBlci5jbGllbnRIZWlnaHQ7XG5cbiAgICB2YXIgcmVjdCA9IGdldFJlY3QodGhpcy5zY3JvbGxlcik7XG5cbiAgICB0aGlzLnNjcm9sbGVyV2lkdGggPSByZWN0LndpZHRoO1xuICAgIHRoaXMuc2Nyb2xsZXJIZWlnaHQgPSByZWN0LmhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIHRoaXMubWF4U2Nyb2xsWCBvciB0aGlzLm1heFNjcm9sbFkgc21hbGxlciB0aGFuIDAsIG1lYW5pbmdcbiAgICAgKiBvdmVyZmxvdyBoYXBwZW5lZC5cbiAgICAgKi9cbiAgICB0aGlzLm1heFNjcm9sbFggPSB0aGlzLndyYXBwZXJXaWR0aCAtIHRoaXMuc2Nyb2xsZXJXaWR0aDtcbiAgICB0aGlzLm1heFNjcm9sbFkgPSB0aGlzLndyYXBwZXJIZWlnaHQgLSB0aGlzLnNjcm9sbGVySGVpZ2h0O1xuXG4gICAgLyoqXG4gICAgICogb3B0aW9uIGVuYWJsZXMgc2Nyb2xsIEFORCBvdmVyZmxvdyBleGlzdHNcbiAgICAgKi9cbiAgICB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPSB0aGlzLm9wdGlvbnMuc2Nyb2xsWCAmJiB0aGlzLm1heFNjcm9sbFggPCAwO1xuICAgIHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPSB0aGlzLm9wdGlvbnMuc2Nyb2xsWSAmJiB0aGlzLm1heFNjcm9sbFkgPCAwO1xuXG4gICAgaWYgKCF0aGlzLmhhc0hvcml6b250YWxTY3JvbGwpIHtcbiAgICAgIHRoaXMubWF4U2Nyb2xsWCA9IDA7XG4gICAgICB0aGlzLnNjcm9sbGVyV2lkdGggPSB0aGlzLndyYXBwZXJXaWR0aDtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaGFzVmVydGljYWxTY3JvbGwpIHtcbiAgICAgIHRoaXMubWF4U2Nyb2xsWSA9IDA7XG4gICAgICB0aGlzLnNjcm9sbGVySGVpZ2h0ID0gdGhpcy53cmFwcGVySGVpZ2h0O1xuICAgIH1cblxuICAgIHRoaXMuZW5kVGltZSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25YID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSAwO1xuXG4gICAgaWYgKGhhc1BvaW50ZXIgJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlUG9pbnRlcikge1xuICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dID1cbiAgICAgICAgZ2V0VG91Y2hBY3Rpb24odGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2gsIHRydWUpO1xuXG4gICAgICBpZiAoIXRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSkge1xuICAgICAgICB0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0gPVxuICAgICAgICAgIGdldFRvdWNoQWN0aW9uKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy53cmFwcGVyT2Zmc2V0ID0gb2Zmc2V0VXRpbHModGhpcy53cmFwcGVyKTtcblxuICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgncmVmcmVzaCcpO1xuXG4gICAgdGhpcy5yZXNldFBvc2l0aW9uKCk7XG4gIH0sXG5cbiAgcmVzZXRQb3NpdGlvbjogZnVuY3Rpb24gKHRpbWUpIHtcblx0XHR2YXIgeCA9IHRoaXMueCxcbiAgICB5ID0gdGhpcy55O1xuXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcblxuICAgIGlmICggIXRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCB8fCB0aGlzLnggPiAwICkge1xuICAgICAgeCA9IDA7XG4gICAgfSBlbHNlIGlmICggdGhpcy54IDwgdGhpcy5tYXhTY3JvbGxYICkge1xuICAgICAgeCA9IHRoaXMubWF4U2Nyb2xsWDtcbiAgICB9XG5cbiAgICBpZiAoICF0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsIHx8IHRoaXMueSA+IDAgKSB7XG4gICAgICB5ID0gMDtcbiAgICB9IGVsc2UgaWYgKCB0aGlzLnkgPCB0aGlzLm1heFNjcm9sbFkgKSB7XG4gICAgICB5ID0gdGhpcy5tYXhTY3JvbGxZO1xuICAgIH1cblxuXHRcdGlmICggeCA9PT0gdGhpcy54ICYmIHkgPT09IHRoaXMueSApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cbiAgICB0aGlzLnNjcm9sbFRvKHgsIHksIHRpbWUsIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcpO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBJc2Nyb2xsOyJdLCJuYW1lcyI6WyJlYXNpbmdzIiwiayIsIk1hdGgiLCJzcXJ0IiwiYiIsImYiLCJlIiwicG93Iiwic2luIiwiUEkiLCJfZWxlbWVudFN0eWxlIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwic3R5bGUiLCJfdmVuZG9yIiwidmVuZG9ycyIsInRyYW5zZm9ybSIsImkiLCJsIiwibGVuZ3RoIiwic3Vic3RyIiwiX3ByZWZpeFN0eWxlIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJpc0JhZEFuZHJvaWQiLCJhcHBWZXJzaW9uIiwid2luZG93IiwibmF2aWdhdG9yIiwidGVzdCIsInNhZmFyaVZlcnNpb24iLCJtYXRjaCIsInBhcnNlRmxvYXQiLCJnZXRUaW1lIiwiRGF0ZSIsIm5vdyIsIm9mZnNldCIsImVsIiwibGVmdCIsIm9mZnNldExlZnQiLCJ0b3AiLCJvZmZzZXRUb3AiLCJvZmZzZXRQYXJlbnQiLCJnZXRSZWN0IiwiU1ZHRWxlbWVudCIsInJlY3QiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJ3aWR0aCIsImhlaWdodCIsIm9mZnNldFdpZHRoIiwib2Zmc2V0SGVpZ2h0IiwiaGFzUG9pbnRlciIsIlBvaW50ZXJFdmVudCIsIk1TUG9pbnRlckV2ZW50IiwiZ2V0VG91Y2hBY3Rpb24iLCJldmVudFBhc3N0aHJvdWdoIiwiYWRkUGluY2giLCJ0b3VjaEFjdGlvbiIsInJBRiIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsIndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSIsIm1velJlcXVlc3RBbmltYXRpb25GcmFtZSIsIm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJtc1JlcXVlc3RBbmltYXRpb25GcmFtZSIsImNhbGxiYWNrIiwic2V0VGltZW91dCIsIklzY3JvbGwiLCJlbGVtIiwib3B0aW9ucyIsIndyYXBwZXIiLCJxdWVyeVNlbGVjdG9yIiwic2Nyb2xsZXIiLCJjaGlsZHJlbiIsInNjcm9sbGVyU3R5bGUiLCJzY3JvbGxZIiwic2Nyb2xsWCIsImJvdW5jZUVhc2luZyIsImNpcmN1bGFyIiwieCIsInkiLCJwcm90b3R5cGUiLCJ0aW1lIiwiZWFzaW5nIiwiaXNJblRyYW5zaXRpb24iLCJ1c2VUcmFuc2l0aW9uIiwidHJhbnNpdGlvblR5cGUiLCJfdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIiwiX3RyYW5zaXRpb25UaW1lIiwiX3RyYW5zbGF0ZSIsIl9hbmltYXRlIiwiZm4iLCJvZmZzZXRYIiwib2Zmc2V0WSIsIm5vZGVUeXBlIiwicG9zIiwib2Zmc2V0VXRpbHMiLCJlYXNpbmdTdHlsZSIsInN0eWxlVXRpbHMiLCJ0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJkdXJhdGlvblByb3AiLCJ0cmFuc2l0aW9uRHVyYXRpb24iLCJzZWxmIiwidXNlVHJhbnNmb3JtIiwicm91bmQiLCJkZXN0WCIsImRlc3RZIiwiZHVyYXRpb24iLCJlYXNpbmdGbiIsInRoYXQiLCJzdGFydFgiLCJzdGFydFkiLCJzdGFydFRpbWUiLCJkZXN0VGltZSIsInN0ZXAiLCJuZXdYIiwibmV3WSIsImlzQW5pbWF0aW5nIiwid3JhcHBlcldpZHRoIiwiY2xpZW50V2lkdGgiLCJ3cmFwcGVySGVpZ2h0IiwiY2xpZW50SGVpZ2h0Iiwic2Nyb2xsZXJXaWR0aCIsInNjcm9sbGVySGVpZ2h0IiwibWF4U2Nyb2xsWCIsIm1heFNjcm9sbFkiLCJoYXNIb3Jpem9udGFsU2Nyb2xsIiwiaGFzVmVydGljYWxTY3JvbGwiLCJlbmRUaW1lIiwiZGlyZWN0aW9uWCIsImRpcmVjdGlvblkiLCJkaXNhYmxlUG9pbnRlciIsIndyYXBwZXJPZmZzZXQiLCJyZXNldFBvc2l0aW9uIiwic2Nyb2xsVG8iXSwibWFwcGluZ3MiOiJBQUFBLElBQUlBLFVBQVU7YUFDRDtXQUNGLHNDQURFO1FBRUwsVUFBVUMsQ0FBVixFQUFhO2FBQ1JBLEtBQUssSUFBSUEsQ0FBVCxDQUFQOztHQUpRO1lBT0Y7V0FDRCxpQ0FEQztRQUVKLFVBQVVBLENBQVYsRUFBYTthQUNSQyxLQUFLQyxJQUFMLENBQVUsSUFBSyxFQUFFRixDQUFGLEdBQU1BLENBQXJCLENBQVA7O0dBVlE7UUFhTjtXQUNHLHlDQURIO1FBRUEsVUFBVUEsQ0FBVixFQUFhO1VBQ1hHLElBQUksQ0FBUjthQUNPLENBQUNILElBQUlBLElBQUksQ0FBVCxJQUFjQSxDQUFkLElBQW1CLENBQUNHLElBQUksQ0FBTCxJQUFVSCxDQUFWLEdBQWNHLENBQWpDLElBQXNDLENBQTdDOztHQWpCUTtVQW9CSjtXQUNDLEVBREQ7UUFFRixVQUFVSCxDQUFWLEVBQWE7VUFDWCxDQUFDQSxLQUFLLENBQU4sSUFBWSxJQUFJLElBQXBCLEVBQTJCO2VBQ2xCLFNBQVNBLENBQVQsR0FBYUEsQ0FBcEI7T0FERixNQUVPLElBQUlBLElBQUssSUFBSSxJQUFiLEVBQW9CO2VBQ2xCLFVBQVVBLEtBQU0sTUFBTSxJQUF0QixJQUErQkEsQ0FBL0IsR0FBbUMsSUFBMUM7T0FE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

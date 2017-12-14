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

function prefixPointerEvent(pointerEvent) {
  return window.MSPointerEvent ? 'MSPointer' + pointerEvent.charAt(7).toUpperCase() + pointerEvent.substr(8) : pointerEvent;
}

var eventType = {
  touchstart: 1,
  touchmove: 1,
  touchend: 1,

  mousedown: 2,
  mousemove: 2,
  mouseup: 2,

  pointerdown: 3,
  pointermove: 3,
  pointerup: 3,

  MSPointerDown: 3,
  MSPointerMove: 3,
  MSPointerUp: 3
};

var preventDefaultException = function (el, exceptions) {
  for (var i in exceptions) {
    if (exceptions[i].test(el[i])) {
      return true;
    }
  }

  return false;
};

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
    bindToWrapper: typeof window.onmousedown === "undefined",
    preventDefault: true,
    preventDefaultException: { tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/ },
    directionLockThreshold: 5,
    bounce: true,
    bounceTime: 600,
    bounceEasing: ''
  };

  for (var i in options) {
    this.options[i] = options[i];
  }

  this.options.eventPassthrough = this.options.eventPassthrough === true ? 'vertical' : this.options.eventPassthrough;

  // If you want eventPassthrough I have to lock one of the axes
  this.options.scrollY = this.options.eventPassthrough === 'vertical' ? false : this.options.scrollY;
  this.options.scrollX = this.options.eventPassthrough === 'horizontal' ? false : this.options.scrollX;

  this.options.freeScroll = this.options.freeScroll && !this.options.eventPassthrough;
  this.options.directionLockThreshold = this.options.eventPassthrough ? 0 : this.options.directionLockThreshold;

  this.options.bounceEasing = typeof this.options.bounceEasing == 'string' ? easings[this.options.bounceEasing] || easings.circular : this.options.bounceEasing;

  this.x = 0;
  this.y = 0;

  this._init();
  this.refresh();
  this.scrollTo(this.options.startX, this.options.startY);
  this.enable();
}

Iscroll.prototype = {

  _init: function () {
    this._initEvents();
  },

  _initEvents: function (remove) {
    var eventType$$1 = remove ? removeEvent : addEvent,
        target = this.options.bindToWrapper ? this.wrapper : window;

    eventType$$1(window, 'orientationchange', this);
    eventType$$1(window, 'resize', this);

    if (this.options.click) {
      eventType$$1(this.wrapper, 'click', this, true);
    }

    if (!this.options.disableMouse) {
      eventType$$1(this.wrapper, 'mousedown', this);
      eventType$$1(target, 'mousemove', this);
      eventType$$1(target, 'mousecancel', this);
      eventType$$1(target, 'mouseup', this);
    }

    if (hasPointer && !this.options.disablePointer) {
      eventType$$1(this.wrapper, prefixPointerEvent('pointerdown'), this);
      eventType$$1(target, prefixPointerEvent('pointermove'), this);
      eventType$$1(target, prefixPointerEvent('pointercancel'), this);
      eventType$$1(target, prefixPointerEvent('pointerup'), this);
    }

    if (hasTouch && !this.options.disableTouch) {
      eventType$$1(this.wrapper, 'touchstart', this);
      eventType$$1(target, 'touchmove', this);
      eventType$$1(target, 'touchcancel', this);
      eventType$$1(target, 'touchend', this);
    }

    eventType$$1(this.scroller, 'transitionend', this);
    eventType$$1(this.scroller, 'webkitTransitionEnd', this);
    eventType$$1(this.scroller, 'oTransitionEnd', this);
    eventType$$1(this.scroller, 'MSTransitionEnd', this);
  },

  handleEvent: function (e) {
    switch (e.type) {
      case 'touchstart':
      case 'pointerdown':
      case 'MSPointerDown':
      case 'mousedown':
        this._start(e);
        break;

      case 'touchmove':
      case 'pointermove':
      case 'MSPointerMove':
      case 'mousemove':
        this._move(e);
        break;
    }
  },

  _start: function (e) {
    console.log(e.type);
    // React to left mouse button only
    if (eventType[e.type] !== 1) {
      // not touch event
      var button;
      if (!e.which) {
        /* IE case */
        button = e.button < 2 ? 0 : e.button == 4 ? 1 : 2;
      } else {
        /* All others */
        button = e.button;
      }

      // not left mouse button
      if (button !== 0) {
        return;
      }
    }

    if (!this.enabled || this.initiated && eventType[e.type] !== this.initiated) {
      return;
    }

    if (this.options.preventDefault && !isBadAndroid && !preventDefaultException(e.target, this.options.preventDefaultException)) {
      e.preventDefault();
    }

    var point = e.touches ? e.touches[0] : e,
        pos;

    this.initiated = eventType[e.type];
    this.moved = false;
    this.distX = 0;
    this.distY = 0;
    this.directionX = 0;
    this.directionY = 0;
    this.directionLocked = 0;

    this.startTime = getTime();

    if (this.options.useTransition && this.isInTransition) {
      this._transitionTime();
      this.isInTransition = false;
      pos = this.getComputedPosition();
      this._translate(Math.round(pos.x), Math.round(pos.y));
      // this._execEvent('scrollEnd');
    } else if (!this.options.useTransition && this.isAnimating) {
      this.isAnimating = false;
      // this._execEvent('scrollEnd');
    }

    this.startX = this.x;
    this.startY = this.y;
    this.absStartX = this.x;
    this.absStartY = this.y;
    this.pointX = point.pageX;
    this.pointY = point.pageY;

    // this._execEvent('beforeScrollStart');
  },

  _move: function (e) {
    if (!this.enabled || eventType[e.type] !== this.initiated) {
      console.log(111);
      return;
    }

    if (this.options.preventDefault) {
      // increases performance on Android? TODO: check!
      e.preventDefault();
    }

    var point = e.touches ? e.touches[0] : e,
        deltaX = point.pageX - this.pointX,
        // the moved distance
    deltaY = point.pageY - this.pointY,
        timestamp = getTime(),
        newX,
        newY,
        absDistX,
        absDistY;

    this.pointX = point.pageX;
    this.pointY = point.pageY;

    this.distX += deltaX;
    this.distY += deltaY;
    absDistX = Math.abs(this.distX); // absolute moved distance
    absDistY = Math.abs(this.distY);

    /**
     *  We need to move at least 10 pixels for the scrolling to initiate
     *  this.endTime is initiated in this.prototype.refresh method
     */
    if (timestamp - this.endTime > 300 && absDistX < 10 && absDistY < 10) {
      console.log(222);
      return;
    }

    // If you are scrolling in one direction lock the other
    if (!this.directionLocked && !this.options.freeScroll) {

      if (absDistX > absDistY + this.options.directionLockThreshold) {
        this.directionLocked = 'h'; // lock horizontally
      } else if (absDistY >= absDistX + this.options.directionLockThreshold) {
        this.directionLocked = 'v'; // lock vertically
      } else {
        this.directionLocked = 'n'; // no lock
      }
    }

    if (this.directionLocked == 'h') {
      if (this.options.eventPassthrough == 'vertical') {
        e.preventDefault();
      } else if (this.options.eventPassthrough == 'horizontal') {
        this.initiated = false;
        return;
      }

      deltaY = 0;
    } else if (this.directionLocked == 'v') {
      if (this.options.eventPassthrough == 'horizontal') {
        e.preventDefault();
      } else if (this.options.eventPassthrough == 'vertical') {
        this.initiated = false;
        return;
      }

      deltaX = 0;
    }
    console.log(this.hasVerticalScroll, deltaY);
    deltaX = this.hasHorizontalScroll ? deltaX : 0;
    deltaY = this.hasVerticalScroll ? deltaY : 0;

    newX = this.x + deltaX;
    newY = this.y + deltaY;

    // Slow down if outside of the boundaries
    if (newX > 0 || newX < this.maxScrollX) {
      newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX;
    }
    if (newY > 0 || newY < this.maxScrollY) {
      newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY;
    }

    this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
    this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

    if (!this.moved) {
      // this._execEvent('scrollStart');
    }

    this.moved = true;

    this._translate(newX, newY);

    if (timestamp - this.startTime > 300) {
      this.startTime = timestamp;
      this.startX = this.x;
      this.startY = this.y;
    }
  },

  getComputedPosition: function () {
    var matrix = window.getComputedStyle(this.scroller, null),
        x,
        y;

    if (this.options.useTransform) {
      matrix = matrix[style.transform].split(')')[0].split(', ');
      x = +(matrix[12] || matrix[4]);
      y = +(matrix[13] || matrix[5]);
    } else {
      // eg. transform '0px' to 0
      x = +matrix.left.replace(/[^-\d.]/g, '');
      y = +matrix.top.replace(/[^-\d.]/g, '');
    }

    return { x: x, y: y };
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
    console.log('translate now!!: ', x, ' ', y);
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
  },

  disable: function () {
    this.enabled = false;
  },

  enable: function () {
    this.enabled = true;
  }

};

return Iscroll;

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL3V0aWxzL2Vhc2luZ3MuanMiLCIuLi9zcmMvdXRpbHMvc3R5bGUuanMiLCIuLi9zcmMvdXRpbHMvaXNCYWRBbmRyb2lkLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRpbWUuanMiLCIuLi9zcmMvdXRpbHMvb2Zmc2V0LmpzIiwiLi4vc3JjL3V0aWxzL2dldFJlY3QuanMiLCIuLi9zcmMvdXRpbHMvZGV0ZWN0b3IuanMiLCIuLi9zcmMvdXRpbHMvZ2V0VG91Y2hBY3Rpb24uanMiLCIuLi9zcmMvdXRpbHMvZXZlbnRIYW5kbGVyLmpzIiwiLi4vc3JjL3V0aWxzL3ByZWZpeFBvaW50ZXJFdmVudC5qcyIsIi4uL3NyYy91dGlscy9ldmVudFR5cGUuanMiLCIuLi9zcmMvdXRpbHMvcHJldmVudERlZmF1bHRFeGNlcHRpb24uanMiLCIuLi9zcmMvbXktaXNjcm9sbC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZWFzaW5ncyA9IHtcbiAgcXVhZHJhdGljOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4yNSwgMC40NiwgMC40NSwgMC45NCknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIGsgKiAoMiAtIGspO1xuICAgIH1cbiAgfSxcbiAgY2lyY3VsYXI6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjEsIDAuNTcsIDAuMSwgMSknLFx0Ly8gTm90IHByb3Blcmx5IFwiY2lyY3VsYXJcIiBidXQgdGhpcyBsb29rcyBiZXR0ZXIsIGl0IHNob3VsZCBiZSAoMC4wNzUsIDAuODIsIDAuMTY1LCAxKVxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIE1hdGguc3FydCgxIC0gKC0tayAqIGspKTtcbiAgICB9XG4gIH0sXG4gIGJhY2s6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjE3NSwgMC44ODUsIDAuMzIsIDEuMjc1KScsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICB2YXIgYiA9IDQ7XG4gICAgICByZXR1cm4gKGsgPSBrIC0gMSkgKiBrICogKChiICsgMSkgKiBrICsgYikgKyAxO1xuICAgIH1cbiAgfSxcbiAgYm91bmNlOiB7XG4gICAgc3R5bGU6ICcnLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgaWYgKChrIC89IDEpIDwgKDEgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogayAqIGs7XG4gICAgICB9IGVsc2UgaWYgKGsgPCAoMiAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMS41IC8gMi43NSkpICogayArIDAuNzU7XG4gICAgICB9IGVsc2UgaWYgKGsgPCAoMi41IC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjI1IC8gMi43NSkpICogayArIDAuOTM3NTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi42MjUgLyAyLjc1KSkgKiBrICsgMC45ODQzNzU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBlbGFzdGljOiB7XG4gICAgc3R5bGU6ICcnLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGYgPSAwLjIyLFxuICAgICAgICBlID0gMC40O1xuXG4gICAgICBpZiAoayA9PT0gMCkgeyByZXR1cm4gMDsgfVxuICAgICAgaWYgKGsgPT0gMSkgeyByZXR1cm4gMTsgfVxuXG4gICAgICByZXR1cm4gKGUgKiBNYXRoLnBvdygyLCAtIDEwICogaykgKiBNYXRoLnNpbigoayAtIGYgLyA0KSAqICgyICogTWF0aC5QSSkgLyBmKSArIDEpO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgZWFzaW5nczsiLCJ2YXIgX2VsZW1lbnRTdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlO1xuXG52YXIgX3ZlbmRvciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciB2ZW5kb3JzID0gWyd0JywgJ3dlYmtpdFQnLCAnTW96VCcsICdtc1QnLCAnT1QnXSxcbiAgICB0cmFuc2Zvcm0sXG4gICAgaSA9IDAsXG4gICAgbCA9IHZlbmRvcnMubGVuZ3RoO1xuXG4gIHdoaWxlIChpIDwgbCkge1xuICAgIHRyYW5zZm9ybSA9IHZlbmRvcnNbaV0gKyAncmFuc2Zvcm0nO1xuICAgIGlmICh0cmFuc2Zvcm0gaW4gX2VsZW1lbnRTdHlsZSkge1xuICAgICAgcmV0dXJuIHZlbmRvcnNbaV0uc3Vic3RyKDAsIHZlbmRvcnNbaV0ubGVuZ3RoIC0gMSk7XG4gICAgfVxuICAgIGkrKztcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn0pKCk7XG5cbmZ1bmN0aW9uIF9wcmVmaXhTdHlsZSAoc3R5bGUpIHtcbiAgaWYgKCBfdmVuZG9yID09PSBmYWxzZSApIHJldHVybiBmYWxzZTsgLy8gbm8gdmVuZG9yIGZvdW5kXG4gIGlmICggX3ZlbmRvciA9PT0gJycgKSByZXR1cm4gc3R5bGU7IC8vIG5vIHByZWZpeCBuZWVkZWRcbiAgcmV0dXJuIF92ZW5kb3IgKyBzdHlsZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0eWxlLnN1YnN0cigxKTsgLy8gb3RoZXJ3aXNlIGFkZCBwcmVmaXhcbn1cblxuLy8gc3R5bGUgdGhhdCBoYXMgdmVuZG9yIHByZWZpeCwgZWc6IHdlYmtpdFRyYW5zZm9ybVxudmFyIHN0eWxlID0ge1xuICB0cmFuc2Zvcm06IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtJyksXG4gIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24nKSxcbiAgdHJhbnNpdGlvbkR1cmF0aW9uOiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EdXJhdGlvbicpLFxuICB0cmFuc2l0aW9uRGVsYXk6IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvbkRlbGF5JyksXG4gIHRyYW5zZm9ybU9yaWdpbjogX3ByZWZpeFN0eWxlKCd0cmFuc2Zvcm1PcmlnaW4nKSxcbiAgdG91Y2hBY3Rpb246IF9wcmVmaXhTdHlsZSgndG91Y2hBY3Rpb24nKVxufTtcblxuZXhwb3J0IGRlZmF1bHQgc3R5bGU7IiwidmFyIGlzQmFkQW5kcm9pZCA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBhcHBWZXJzaW9uID0gd2luZG93Lm5hdmlnYXRvci5hcHBWZXJzaW9uO1xuXG4gIGlmICgvQW5kcm9pZC8udGVzdChhcHBWZXJzaW9uKSAmJiAhKC9DaHJvbWVcXC9cXGQvLnRlc3QoYXBwVmVyc2lvbikpKSB7XG4gICAgdmFyIHNhZmFyaVZlcnNpb24gPSBhcHBWZXJzaW9uLm1hdGNoKC9TYWZhcmlcXC8oXFxkKy5cXGQpLyk7XG4gICAgaWYoc2FmYXJpVmVyc2lvbiAmJiB0eXBlb2Ygc2FmYXJpVmVyc2lvbiA9PT0gXCJvYmplY3RcIiAmJiBzYWZhcmlWZXJzaW9uLmxlbmd0aCA+PSAyKSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdChzYWZhcmlWZXJzaW9uWzFdKSA8IDUzNS4xOTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSkoKTtcblxuZXhwb3J0IGRlZmF1bHQgaXNCYWRBbmRyb2lkOyIsIi8qKlxuICogMS4gRGF0ZS5wcm90b3R5cGUuZ2V0VGltZSBoYXMgQkVUVEVSIGNvbXBhdGliaWxpdHkgdGhhbiBEYXRlLm5vd1xuICogcmVmZXJlbmNlOiBcbiAqICBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9EYXRlL2dldFRpbWUjQnJvd3Nlcl9jb21wYXRpYmlsaXR5XG4gKiAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9ub3cjQnJvd3Nlcl9jb21wYXRpYmlsaXR5XG4gKiBcbiAqIDIuIERhdGUucHJvdG90eXBlLmdldFRpbWUgc3BlZWQgaXMgU0xPV1NFUiB0aGFuIERhdGUubm93XG4gKiByZWZlcmVuY2U6XG4gKiAgaHR0cHM6Ly9qc3BlcmYuY29tL2RhdGUtbm93LXZzLWRhdGUtZ2V0dGltZS83XG4gKi9cblxudmFyIGdldFRpbWUgPSBEYXRlLm5vdyB8fFxuICBmdW5jdGlvbiBnZXRUaW1lKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfTtcblxuZXhwb3J0IGRlZmF1bHQgZ2V0VGltZTsiLCJ2YXIgb2Zmc2V0ID0gZnVuY3Rpb24gKGVsKSB7XG4gIHZhciBsZWZ0ID0gLWVsLm9mZnNldExlZnQsXG4gIHRvcCA9IC1lbC5vZmZzZXRUb3A7XG5cbiAgLyoqXG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9IVE1MRWxlbWVudC9vZmZzZXRQYXJlbnRcbiAgICogUmV0dXJucyBudWxsIHdoZW4gdGhlIGVsZW1lbnQgaGFzIHN0eWxlLmRpc3BsYXkgc2V0IHRvIFwibm9uZVwiLiBUaGUgb2Zmc2V0UGFyZW50IFxuICAgKiBpcyB1c2VmdWwgYmVjYXVzZSBvZmZzZXRUb3AgYW5kIG9mZnNldExlZnQgYXJlIHJlbGF0aXZlIHRvIGl0cyBwYWRkaW5nIGVkZ2UuXG4gICAqL1xuICB3aGlsZSAoZWwgPSBlbC5vZmZzZXRQYXJlbnQpIHtcbiAgICBsZWZ0IC09IGVsLm9mZnNldExlZnQ7XG4gICAgdG9wIC09IGVsLm9mZnNldFRvcDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbGVmdDogbGVmdCxcbiAgICB0b3A6IHRvcFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBvZmZzZXQ7IiwiZnVuY3Rpb24gZ2V0UmVjdChlbCkge1xuICBpZiAoZWwgaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB7XG4gICAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIHJldHVybiB7XG4gICAgICB0b3AgOiByZWN0LnRvcCxcbiAgICAgIGxlZnQgOiByZWN0LmxlZnQsXG4gICAgICB3aWR0aCA6IHJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQgOiByZWN0LmhlaWdodFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgdG9wIDogZWwub2Zmc2V0VG9wLFxuICAgICAgbGVmdCA6IGVsLm9mZnNldExlZnQsXG4gICAgICB3aWR0aCA6IGVsLm9mZnNldFdpZHRoLFxuICAgICAgaGVpZ2h0IDogZWwub2Zmc2V0SGVpZ2h0XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRSZWN0OyIsInZhciBoYXNQb2ludGVyID0gISEod2luZG93LlBvaW50ZXJFdmVudCB8fCB3aW5kb3cuTVNQb2ludGVyRXZlbnQpOyAvLyBJRTEwIGlzIHByZWZpeGVkXG52YXIgaGFzVG91Y2ggPSAnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3c7XG5cbmV4cG9ydCB7XG4gIGhhc1BvaW50ZXIsXG4gIGhhc1RvdWNoXG59IiwidmFyIGdldFRvdWNoQWN0aW9uID0gZnVuY3Rpb24gKGV2ZW50UGFzc3Rocm91Z2gsIGFkZFBpbmNoKSB7XG4gIHZhciB0b3VjaEFjdGlvbiA9ICdub25lJztcbiAgaWYgKGV2ZW50UGFzc3Rocm91Z2ggPT09ICd2ZXJ0aWNhbCcpIHtcbiAgICB0b3VjaEFjdGlvbiA9ICdwYW4teSc7XG4gIH0gZWxzZSBpZiAoZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ2hvcml6b250YWwnKSB7XG4gICAgdG91Y2hBY3Rpb24gPSAncGFuLXgnO1xuICB9XG5cbiAgaWYgKGFkZFBpbmNoICYmIHRvdWNoQWN0aW9uICE9ICdub25lJykge1xuICAgIC8vIGFkZCBwaW5jaC16b29tIHN1cHBvcnQgaWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgaXQsIGJ1dCBpZiBub3QgKGVnLiBDaHJvbWUgPDU1KSBkbyBub3RoaW5nXG4gICAgdG91Y2hBY3Rpb24gKz0gJyBwaW5jaC16b29tJztcbiAgfVxuICByZXR1cm4gdG91Y2hBY3Rpb247XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdldFRvdWNoQWN0aW9uOyIsImZ1bmN0aW9uIGFkZEV2ZW50IChlbCwgdHlwZSwgZm4sIGNhcHR1cmUpIHtcbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgISFjYXB0dXJlKTtcbn07XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50IChlbCwgdHlwZSwgZm4sIGNhcHR1cmUpIHtcbiAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgISFjYXB0dXJlKTtcbn1cblxuZXhwb3J0IHtcbiAgYWRkRXZlbnQsXG4gIHJlbW92ZUV2ZW50XG59OyIsImZ1bmN0aW9uIHByZWZpeFBvaW50ZXJFdmVudCAocG9pbnRlckV2ZW50KSB7XG4gIHJldHVybiB3aW5kb3cuTVNQb2ludGVyRXZlbnQgPyBcbiAgICAnTVNQb2ludGVyJyArIHBvaW50ZXJFdmVudC5jaGFyQXQoNykudG9VcHBlckNhc2UoKSArIHBvaW50ZXJFdmVudC5zdWJzdHIoOCkgOlxuICAgIHBvaW50ZXJFdmVudDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgcHJlZml4UG9pbnRlckV2ZW50OyIsInZhciBldmVudFR5cGUgPSB7XG4gIHRvdWNoc3RhcnQ6IDEsXG4gIHRvdWNobW92ZTogMSxcbiAgdG91Y2hlbmQ6IDEsXG5cbiAgbW91c2Vkb3duOiAyLFxuICBtb3VzZW1vdmU6IDIsXG4gIG1vdXNldXA6IDIsXG5cbiAgcG9pbnRlcmRvd246IDMsXG4gIHBvaW50ZXJtb3ZlOiAzLFxuICBwb2ludGVydXA6IDMsXG5cbiAgTVNQb2ludGVyRG93bjogMyxcbiAgTVNQb2ludGVyTW92ZTogMyxcbiAgTVNQb2ludGVyVXA6IDNcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGV2ZW50VHlwZTsiLCJ2YXIgcHJldmVudERlZmF1bHRFeGNlcHRpb24gPSBmdW5jdGlvbiAoZWwsIGV4Y2VwdGlvbnMpIHtcbiAgZm9yICh2YXIgaSBpbiBleGNlcHRpb25zKSB7XG4gICAgaWYgKCBleGNlcHRpb25zW2ldLnRlc3QoZWxbaV0pICkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgcHJldmVudERlZmF1bHRFeGNlcHRpb247IiwiaW1wb3J0IGVhc2luZ3MgZnJvbSAnLi91dGlscy9lYXNpbmdzJztcbmltcG9ydCBzdHlsZVV0aWxzIGZyb20gJy4vdXRpbHMvc3R5bGUnO1xuaW1wb3J0IGlzQmFkQW5kcm9pZCBmcm9tICcuL3V0aWxzL2lzQmFkQW5kcm9pZCc7XG5pbXBvcnQgZ2V0VGltZSBmcm9tICcuL3V0aWxzL2dldFRpbWUnO1xuaW1wb3J0IG9mZnNldFV0aWxzIGZyb20gJy4vdXRpbHMvb2Zmc2V0JztcbmltcG9ydCBnZXRSZWN0IGZyb20gJy4vdXRpbHMvZ2V0UmVjdCc7XG5pbXBvcnQgeyBoYXNQb2ludGVyLCBoYXNUb3VjaCB9IGZyb20gJy4vdXRpbHMvZGV0ZWN0b3InO1xuaW1wb3J0IGdldFRvdWNoQWN0aW9uIGZyb20gJy4vdXRpbHMvZ2V0VG91Y2hBY3Rpb24nO1xuaW1wb3J0IHsgYWRkRXZlbnQsIHJlbW92ZUV2ZW50IH0gZnJvbSAnLi91dGlscy9ldmVudEhhbmRsZXInO1xuaW1wb3J0IHByZWZpeFBvaW50ZXJFdmVudCBmcm9tICcuL3V0aWxzL3ByZWZpeFBvaW50ZXJFdmVudCc7XG5pbXBvcnQgZXZlbnRUeXBlIGZyb20gJy4vdXRpbHMvZXZlbnRUeXBlJztcbmltcG9ydCBwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbiBmcm9tICcuL3V0aWxzL3ByZXZlbnREZWZhdWx0RXhjZXB0aW9uJ1xuXG4vLyBkZWFsIHdpdGggcmVxdWVzdEFuaW1hdGlvbkZyYW1lIGNvbXBhdGJpbGl0eVxudmFyIHJBRiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICBmdW5jdGlvbiAoY2FsbGJhY2spIHsgd2luZG93LnNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MCk7IH07XG5cbmZ1bmN0aW9uIElzY3JvbGwoZWxlbSwgb3B0aW9ucykge1xuICAvKipcbiAgICogZ2V0IHNjcm9sbCBub2RlIGVsZW1lbnRcbiAgICovXG4gIHRoaXMud3JhcHBlciA9IHR5cGVvZiBlbGVtID09PSAnc3RyaW5nJyA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbSkgOiBlbGVtO1xuICB0aGlzLnNjcm9sbGVyID0gdGhpcy53cmFwcGVyLmNoaWxkcmVuWzBdO1xuICB0aGlzLnNjcm9sbGVyU3R5bGUgPSB0aGlzLnNjcm9sbGVyLnN0eWxlO1xuXG4gIC8qKlxuICAgKiBtZXJnZSBkZWZhdWx0IG9wdGlvbnMgYW5kIGN1c3RvbWl6ZWQgb3B0aW9uc1xuICAgKi9cbiAgdGhpcy5vcHRpb25zID0ge1xuICAgIGRpc2FibGVQb2ludGVyOiAhaGFzUG9pbnRlcixcbiAgICBkaXNhYmxlVG91Y2g6IGhhc1BvaW50ZXIgfHwgIWhhc1RvdWNoLFxuICAgIGRpc2FibGVNb3VzZTogaGFzUG9pbnRlciB8fCAhaGFzVG91Y2gsXG4gICAgdXNlVHJhbnNpdGlvbjogdHJ1ZSxcbiAgICB1c2VUcmFuc2Zvcm06IHRydWUsXG4gICAgc2Nyb2xsWTogdHJ1ZSxcbiAgICBzdGFydFg6IDAsXG4gICAgc3RhcnRZOiAwLFxuICAgIGJpbmRUb1dyYXBwZXI6IHR5cGVvZiB3aW5kb3cub25tb3VzZWRvd24gPT09IFwidW5kZWZpbmVkXCIsXG4gICAgcHJldmVudERlZmF1bHQ6IHRydWUsXG4gICAgcHJldmVudERlZmF1bHRFeGNlcHRpb246IHsgdGFnTmFtZTogL14oSU5QVVR8VEVYVEFSRUF8QlVUVE9OfFNFTEVDVCkkLyB9LFxuICAgIGRpcmVjdGlvbkxvY2tUaHJlc2hvbGQ6IDUsXG5cdFx0Ym91bmNlOiB0cnVlLFxuXHRcdGJvdW5jZVRpbWU6IDYwMCxcblx0XHRib3VuY2VFYXNpbmc6ICcnXG4gIH07XG5cbiAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zW2ldID0gb3B0aW9uc1tpXTtcbiAgfVxuXG4gIHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID0gdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT09IHRydWUgPyAndmVydGljYWwnIDogdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2g7XG5cbiAgLy8gSWYgeW91IHdhbnQgZXZlbnRQYXNzdGhyb3VnaCBJIGhhdmUgdG8gbG9jayBvbmUgb2YgdGhlIGF4ZXNcbiAgdGhpcy5vcHRpb25zLnNjcm9sbFkgPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ3ZlcnRpY2FsJyA/IGZhbHNlIDogdGhpcy5vcHRpb25zLnNjcm9sbFk7XG4gIHRoaXMub3B0aW9ucy5zY3JvbGxYID0gdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT09ICdob3Jpem9udGFsJyA/IGZhbHNlIDogdGhpcy5vcHRpb25zLnNjcm9sbFg7XG5cbiAgdGhpcy5vcHRpb25zLmZyZWVTY3JvbGwgPSB0aGlzLm9wdGlvbnMuZnJlZVNjcm9sbCAmJiAhdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2g7XG4gIHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkID0gdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPyAwIDogdGhpcy5vcHRpb25zLmRpcmVjdGlvbkxvY2tUaHJlc2hvbGQ7XG5cbiAgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyA9IHR5cGVvZiB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nID09ICdzdHJpbmcnID9cbiAgICBlYXNpbmdzW3RoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmddIHx8IGVhc2luZ3MuY2lyY3VsYXIgOlxuICAgIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmc7XG5cbiAgdGhpcy54ID0gMDtcbiAgdGhpcy55ID0gMDtcblxuICB0aGlzLl9pbml0KCk7XG4gIHRoaXMucmVmcmVzaCgpO1xuICB0aGlzLnNjcm9sbFRvKHRoaXMub3B0aW9ucy5zdGFydFgsIHRoaXMub3B0aW9ucy5zdGFydFkpO1xuICB0aGlzLmVuYWJsZSgpO1xufVxuXG5Jc2Nyb2xsLnByb3RvdHlwZSA9IHtcblxuICBfaW5pdDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2luaXRFdmVudHMoKTtcbiAgfSxcblxuICBfaW5pdEV2ZW50czogZnVuY3Rpb24gKHJlbW92ZSkge1xuICAgIHZhciBldmVudFR5cGUgPSByZW1vdmUgPyByZW1vdmVFdmVudCA6IGFkZEV2ZW50LFxuICAgICAgdGFyZ2V0ID0gdGhpcy5vcHRpb25zLmJpbmRUb1dyYXBwZXIgPyB0aGlzLndyYXBwZXIgOiB3aW5kb3c7XG5cbiAgICBldmVudFR5cGUod2luZG93LCAnb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzKTtcbiAgICBldmVudFR5cGUod2luZG93LCAncmVzaXplJywgdGhpcyk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCAnY2xpY2snLCB0aGlzLCB0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlTW91c2UpIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsICdtb3VzZWRvd24nLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICdtb3VzZW1vdmUnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICdtb3VzZWNhbmNlbCcsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNldXAnLCB0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAoaGFzUG9pbnRlciAmJiAhdGhpcy5vcHRpb25zLmRpc2FibGVQb2ludGVyKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJkb3duJyksIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVybW92ZScpLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsIHByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcmNhbmNlbCcpLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsIHByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcnVwJyksIHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChoYXNUb3VjaCAmJiAhdGhpcy5vcHRpb25zLmRpc2FibGVUb3VjaCkge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ3RvdWNoc3RhcnQnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICd0b3VjaG1vdmUnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICd0b3VjaGNhbmNlbCcsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ3RvdWNoZW5kJywgdGhpcyk7XG4gICAgfVxuXG4gICAgZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICd0cmFuc2l0aW9uZW5kJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICd3ZWJraXRUcmFuc2l0aW9uRW5kJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICdvVHJhbnNpdGlvbkVuZCcsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAnTVNUcmFuc2l0aW9uRW5kJywgdGhpcyk7XG4gIH0sXG5cbiAgaGFuZGxlRXZlbnQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ3RvdWNoc3RhcnQnOlxuICAgICAgY2FzZSAncG9pbnRlcmRvd24nOlxuICAgICAgY2FzZSAnTVNQb2ludGVyRG93bic6XG4gICAgICBjYXNlICdtb3VzZWRvd24nOlxuICAgICAgICB0aGlzLl9zdGFydChlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3RvdWNobW92ZSc6XG4gICAgICBjYXNlICdwb2ludGVybW92ZSc6XG4gICAgICBjYXNlICdNU1BvaW50ZXJNb3ZlJzpcbiAgICAgIGNhc2UgJ21vdXNlbW92ZSc6XG4gICAgICAgIHRoaXMuX21vdmUoZSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSxcblxuICBfc3RhcnQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgY29uc29sZS5sb2coZS50eXBlKTtcbiAgICAvLyBSZWFjdCB0byBsZWZ0IG1vdXNlIGJ1dHRvbiBvbmx5XG4gICAgaWYgKGV2ZW50VHlwZVtlLnR5cGVdICE9PSAxKSB7IC8vIG5vdCB0b3VjaCBldmVudFxuICAgICAgdmFyIGJ1dHRvbjtcbiAgICAgIGlmICghZS53aGljaCkge1xuICAgICAgICAvKiBJRSBjYXNlICovXG4gICAgICAgIGJ1dHRvbiA9IChlLmJ1dHRvbiA8IDIpID8gMCA6XG4gICAgICAgICAgKChlLmJ1dHRvbiA9PSA0KSA/IDEgOiAyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8qIEFsbCBvdGhlcnMgKi9cbiAgICAgICAgYnV0dG9uID0gZS5idXR0b247XG4gICAgICB9XG5cbiAgICAgIC8vIG5vdCBsZWZ0IG1vdXNlIGJ1dHRvblxuICAgICAgaWYgKGJ1dHRvbiAhPT0gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmVuYWJsZWQgfHwgKHRoaXMuaW5pdGlhdGVkICYmIGV2ZW50VHlwZVtlLnR5cGVdICE9PSB0aGlzLmluaXRpYXRlZCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0ICYmICFpc0JhZEFuZHJvaWQgJiYgIXByZXZlbnREZWZhdWx0RXhjZXB0aW9uKGUudGFyZ2V0LCB0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHRFeGNlcHRpb24pKSB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgdmFyIHBvaW50ID0gZS50b3VjaGVzID8gZS50b3VjaGVzWzBdIDogZSxcbiAgICAgIHBvcztcblxuICAgIHRoaXMuaW5pdGlhdGVkID0gZXZlbnRUeXBlW2UudHlwZV07XG4gICAgdGhpcy5tb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMuZGlzdFggPSAwO1xuICAgIHRoaXMuZGlzdFkgPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWCA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25ZID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvbkxvY2tlZCA9IDA7XG5cbiAgICB0aGlzLnN0YXJ0VGltZSA9IGdldFRpbWUoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiB0aGlzLmlzSW5UcmFuc2l0aW9uKSB7XG4gICAgICB0aGlzLl90cmFuc2l0aW9uVGltZSgpO1xuICAgICAgdGhpcy5pc0luVHJhbnNpdGlvbiA9IGZhbHNlO1xuICAgICAgcG9zID0gdGhpcy5nZXRDb21wdXRlZFBvc2l0aW9uKCk7XG4gICAgICB0aGlzLl90cmFuc2xhdGUoTWF0aC5yb3VuZChwb3MueCksIE1hdGgucm91bmQocG9zLnkpKTtcbiAgICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsRW5kJyk7XG4gICAgfSBlbHNlIGlmICghdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgdGhpcy5pc0FuaW1hdGluZykge1xuICAgICAgdGhpcy5pc0FuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxFbmQnKTtcbiAgICB9XG5cbiAgICB0aGlzLnN0YXJ0WCA9IHRoaXMueDtcbiAgICB0aGlzLnN0YXJ0WSA9IHRoaXMueTtcbiAgICB0aGlzLmFic1N0YXJ0WCA9IHRoaXMueDtcbiAgICB0aGlzLmFic1N0YXJ0WSA9IHRoaXMueTtcbiAgICB0aGlzLnBvaW50WCA9IHBvaW50LnBhZ2VYO1xuICAgIHRoaXMucG9pbnRZID0gcG9pbnQucGFnZVk7XG5cbiAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ2JlZm9yZVNjcm9sbFN0YXJ0Jyk7XG4gIH0sXG5cbiAgX21vdmU6IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQgfHwgZXZlbnRUeXBlW2UudHlwZV0gIT09IHRoaXMuaW5pdGlhdGVkKSB7XG4gICAgICBjb25zb2xlLmxvZygxMTEpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHQpIHtcdC8vIGluY3JlYXNlcyBwZXJmb3JtYW5jZSBvbiBBbmRyb2lkPyBUT0RPOiBjaGVjayFcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnQgPSBlLnRvdWNoZXMgPyBlLnRvdWNoZXNbMF0gOiBlLFxuICAgICAgZGVsdGFYID0gcG9pbnQucGFnZVggLSB0aGlzLnBvaW50WCwgLy8gdGhlIG1vdmVkIGRpc3RhbmNlXG4gICAgICBkZWx0YVkgPSBwb2ludC5wYWdlWSAtIHRoaXMucG9pbnRZLFxuICAgICAgdGltZXN0YW1wID0gZ2V0VGltZSgpLFxuICAgICAgbmV3WCwgbmV3WSxcbiAgICAgIGFic0Rpc3RYLCBhYnNEaXN0WTtcblxuICAgIHRoaXMucG9pbnRYID0gcG9pbnQucGFnZVg7XG4gICAgdGhpcy5wb2ludFkgPSBwb2ludC5wYWdlWTtcblxuICAgIHRoaXMuZGlzdFggKz0gZGVsdGFYO1xuICAgIHRoaXMuZGlzdFkgKz0gZGVsdGFZO1xuICAgIGFic0Rpc3RYID0gTWF0aC5hYnModGhpcy5kaXN0WCk7IC8vIGFic29sdXRlIG1vdmVkIGRpc3RhbmNlXG4gICAgYWJzRGlzdFkgPSBNYXRoLmFicyh0aGlzLmRpc3RZKTtcblxuICAgIC8qKlxuICAgICAqICBXZSBuZWVkIHRvIG1vdmUgYXQgbGVhc3QgMTAgcGl4ZWxzIGZvciB0aGUgc2Nyb2xsaW5nIHRvIGluaXRpYXRlXG4gICAgICogIHRoaXMuZW5kVGltZSBpcyBpbml0aWF0ZWQgaW4gdGhpcy5wcm90b3R5cGUucmVmcmVzaCBtZXRob2RcbiAgICAgKi9cbiAgICBpZiAodGltZXN0YW1wIC0gdGhpcy5lbmRUaW1lID4gMzAwICYmIChhYnNEaXN0WCA8IDEwICYmIGFic0Rpc3RZIDwgMTApKSB7XG4gICAgICBjb25zb2xlLmxvZygyMjIpXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgeW91IGFyZSBzY3JvbGxpbmcgaW4gb25lIGRpcmVjdGlvbiBsb2NrIHRoZSBvdGhlclxuICAgIGlmICghdGhpcy5kaXJlY3Rpb25Mb2NrZWQgJiYgIXRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsKSB7XG5cbiAgICAgIGlmIChhYnNEaXN0WCA+IGFic0Rpc3RZICsgdGhpcy5vcHRpb25zLmRpcmVjdGlvbkxvY2tUaHJlc2hvbGQpIHtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAnaCc7XHRcdC8vIGxvY2sgaG9yaXpvbnRhbGx5XG4gICAgICB9IGVsc2UgaWYgKGFic0Rpc3RZID49IGFic0Rpc3RYICsgdGhpcy5vcHRpb25zLmRpcmVjdGlvbkxvY2tUaHJlc2hvbGQpIHtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAndic7XHRcdC8vIGxvY2sgdmVydGljYWxseVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAnbic7XHRcdC8vIG5vIGxvY2tcbiAgICAgIH1cblxuICAgIH1cblxuICAgIGlmICh0aGlzLmRpcmVjdGlvbkxvY2tlZCA9PSAnaCcpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAndmVydGljYWwnKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ2hvcml6b250YWwnKSB7XG4gICAgICAgIHRoaXMuaW5pdGlhdGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZGVsdGFZID0gMDtcbiAgICB9IGVsc2UgaWYgKHRoaXMuZGlyZWN0aW9uTG9ja2VkID09ICd2Jykge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICdob3Jpem9udGFsJykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICd2ZXJ0aWNhbCcpIHtcbiAgICAgICAgdGhpcy5pbml0aWF0ZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBkZWx0YVggPSAwO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsLCBkZWx0YVkpO1xuXHRcdGRlbHRhWCA9IHRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCA/IGRlbHRhWCA6IDA7XG4gICAgZGVsdGFZID0gdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCA/IGRlbHRhWSA6IDA7XG4gICAgXG5cdFx0bmV3WCA9IHRoaXMueCArIGRlbHRhWDtcbiAgICBuZXdZID0gdGhpcy55ICsgZGVsdGFZO1xuICAgIFxuICAgIC8vIFNsb3cgZG93biBpZiBvdXRzaWRlIG9mIHRoZSBib3VuZGFyaWVzXG4gICAgaWYgKCBuZXdYID4gMCB8fCBuZXdYIDwgdGhpcy5tYXhTY3JvbGxYICkge1xuICAgICAgbmV3WCA9IHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLnggKyBkZWx0YVggLyAzIDogbmV3WCA+IDAgPyAwIDogdGhpcy5tYXhTY3JvbGxYO1xuICAgIH1cblx0XHRpZiAoIG5ld1kgPiAwIHx8IG5ld1kgPCB0aGlzLm1heFNjcm9sbFkgKSB7XG5cdFx0XHRuZXdZID0gdGhpcy5vcHRpb25zLmJvdW5jZSA/IHRoaXMueSArIGRlbHRhWSAvIDMgOiBuZXdZID4gMCA/IDAgOiB0aGlzLm1heFNjcm9sbFk7XG4gICAgfVxuICAgIFxuICAgIHRoaXMuZGlyZWN0aW9uWCA9IGRlbHRhWCA+IDAgPyAtMSA6IGRlbHRhWCA8IDAgPyAxIDogMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSBkZWx0YVkgPiAwID8gLTEgOiBkZWx0YVkgPCAwID8gMSA6IDA7XG5cblx0XHRpZiAoICF0aGlzLm1vdmVkICkge1xuXHRcdFx0Ly8gdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxTdGFydCcpO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLm1vdmVkID0gdHJ1ZTtcblxuICAgIHRoaXMuX3RyYW5zbGF0ZShuZXdYLCBuZXdZKTtcblxuICAgIGlmICggdGltZXN0YW1wIC0gdGhpcy5zdGFydFRpbWUgPiAzMDAgKSB7XG4gICAgICB0aGlzLnN0YXJ0VGltZSA9IHRpbWVzdGFtcDtcblx0XHRcdHRoaXMuc3RhcnRYID0gdGhpcy54O1xuXHRcdFx0dGhpcy5zdGFydFkgPSB0aGlzLnk7XG4gICAgfVxuICB9LFxuXG4gIGdldENvbXB1dGVkUG9zaXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbWF0cml4ID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy5zY3JvbGxlciwgbnVsbCksXG4gICAgICB4LCB5O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2Zvcm0pIHtcbiAgICAgIG1hdHJpeCA9IG1hdHJpeFtzdHlsZVV0aWxzLnRyYW5zZm9ybV0uc3BsaXQoJyknKVswXS5zcGxpdCgnLCAnKTtcbiAgICAgIHggPSArKG1hdHJpeFsxMl0gfHwgbWF0cml4WzRdKTtcbiAgICAgIHkgPSArKG1hdHJpeFsxM10gfHwgbWF0cml4WzVdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZWcuIHRyYW5zZm9ybSAnMHB4JyB0byAwXG4gICAgICB4ID0gK21hdHJpeC5sZWZ0LnJlcGxhY2UoL1teLVxcZC5dL2csICcnKTtcbiAgICAgIHkgPSArbWF0cml4LnRvcC5yZXBsYWNlKC9bXi1cXGQuXS9nLCAnJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgeDogeCwgeTogeSB9O1xuICB9LFxuXG4gIHNjcm9sbFRvOiBmdW5jdGlvbiAoeCwgeSwgdGltZSwgZWFzaW5nKSB7XG4gICAgZWFzaW5nID0gZWFzaW5nIHx8IGVhc2luZ3MuY2lyY3VsYXI7XG4gICAgdGhpcy5pc0luVHJhbnNpdGlvbiA9IHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRpbWUgPiAwO1xuICAgIHZhciB0cmFuc2l0aW9uVHlwZSA9IHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIGVhc2luZy5zdHlsZTtcblxuICAgIGlmICghdGltZSB8fCB0cmFuc2l0aW9uVHlwZSkge1xuICAgICAgaWYgKHRyYW5zaXRpb25UeXBlKSB7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbihlYXNpbmcuc3R5bGUpO1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uVGltZSh0aW1lKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3RyYW5zbGF0ZSh4LCB5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fYW5pbWF0ZSh4LCB5LCB0aW1lLCBlYXNpbmcuZm4pO1xuICAgIH1cbiAgfSxcblxuICBzY3JvbGxUb0VsZW1lbnQ6IGZ1bmN0aW9uIChlbCwgdGltZSwgb2Zmc2V0WCwgb2Zmc2V0WSwgZWFzaW5nKSB7XG4gICAgZWwgPSBlbC5ub2RlVHlwZSA/IGVsIDogdGhpcy5zY3JvbGxlci5xdWVyeVNlbGVjdG9yKGVsKTtcblxuICAgIC8vIGlmIG5vIGVsZW1lbnQgc2VsZWN0ZWQsIHRoZW4gcmV0dXJuXG4gICAgaWYgKCFlbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBwb3MgPSBvZmZzZXRVdGlscyhlbCk7XG4gIH0sXG5cbiAgX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogZnVuY3Rpb24gKGVhc2luZ1N0eWxlKSB7XG4gICAgLy8gYXNzaWduIGVhc2luZyBjc3Mgc3R5bGUgdG8gc2Nyb2xsIGNvbnRhaW5lciB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24gcHJvcGVydHlcbiAgICAvLyBleGFtcGxlOiBjdWJpYy1iZXppZXIoMC4yNSwgMC40NiwgMC40NSwgMC45NClcbiAgICB0aGlzLnNjcm9sbGVyU3R5bGVbc3R5bGVVdGlscy50cmFuc2l0aW9uVGltaW5nRnVuY3Rpb25dID0gZWFzaW5nU3R5bGU7XG4gIH0sXG5cbiAgX3RyYW5zaXRpb25UaW1lOiBmdW5jdGlvbiAodGltZSkge1xuICAgIC8vIGlmIGRvIG5vdCB1c2UgdHJhbnNpdGlvbiB0byBzY3JvbGwsIHJldHVyblxuICAgIGlmICghdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aW1lID0gdGltZSB8fCAwO1xuICAgIC8vIHRyYW5zaXRpb25EdXJhdGlvbiB3aGljaCBoYXMgdmVuZG9yIHByZWZpeFxuICAgIHZhciBkdXJhdGlvblByb3AgPSBzdHlsZVV0aWxzLnRyYW5zaXRpb25EdXJhdGlvbjtcbiAgICBpZiAoIWR1cmF0aW9uUHJvcCkgeyAvLyBpZiBubyB2ZW5kb3IgZm91bmQsIGR1cmF0aW9uUHJvcCB3aWxsIGJlIGZhbHNlXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSB0aW1lICsgJ21zJzsgLy8gYXNzaWduIG1zIHRvIHRyYW5zaXRpb25EdXJhdGlvbiBwcm9wXG5cbiAgICBpZiAoIXRpbWUgJiYgaXNCYWRBbmRyb2lkKSB7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9ICcwLjAwMDFtcyc7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHJBRihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzZWxmLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9PT0gJzAuMDAwMW1zJykge1xuICAgICAgICAgIHNlbGYuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gJzBzJztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIF90cmFuc2xhdGU6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgY29uc29sZS5sb2coJ3RyYW5zbGF0ZSBub3chITogJywgeCwnICcgLCB5KTtcbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zZm9ybSkge1xuXG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGVbc3R5bGVVdGlscy50cmFuc2Zvcm1dID1cbiAgICAgICAgJ3RyYW5zbGF0ZSgnICsgeCArICdweCwnICsgeSArICdweCknICsgJ3RyYW5zbGF0ZVooMCknO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHggPSBNYXRoLnJvdW5kKHgpO1xuICAgICAgeSA9IE1hdGgucm91bmQoeSk7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGUubGVmdCA9IHggKyAncHgnO1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlLnRvcCA9IHkgKyAncHgnO1xuICAgIH1cblxuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgfSxcblxuICBfYW5pbWF0ZTogZnVuY3Rpb24gKGRlc3RYLCBkZXN0WSwgZHVyYXRpb24sIGVhc2luZ0ZuKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzLFxuICAgICAgc3RhcnRYID0gdGhpcy54LFxuICAgICAgc3RhcnRZID0gdGhpcy55LFxuICAgICAgc3RhcnRUaW1lID0gZ2V0VGltZSgpLFxuICAgICAgZGVzdFRpbWUgPSBzdGFydFRpbWUgKyBkdXJhdGlvbjtcblxuICAgIGZ1bmN0aW9uIHN0ZXAoKSB7XG4gICAgICB2YXIgbm93ID0gZ2V0VGltZSgpLFxuICAgICAgICBuZXdYLCBuZXdZLFxuICAgICAgICBlYXNpbmc7XG5cbiAgICAgIGlmIChub3cgPj0gZGVzdFRpbWUpIHtcbiAgICAgICAgdGhhdC5pc0FuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICB0aGF0Ll90cmFuc2xhdGUoZGVzdFgsIGRlc3RZKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIG5vdyA9IChub3cgLSBzdGFydFRpbWUpIC8gZHVyYXRpb247XG4gICAgICBlYXNpbmcgPSBlYXNpbmdGbihub3cpO1xuICAgICAgbmV3WCA9IChkZXN0WCAtIHN0YXJ0WCkgKiBlYXNpbmcgKyBzdGFydFg7XG4gICAgICBuZXdZID0gKGRlc3RZIC0gc3RhcnRZKSAqIGVhc2luZyArIHN0YXJ0WTtcbiAgICAgIHRoYXQuX3RyYW5zbGF0ZShuZXdYLCBuZXdZKTtcblxuICAgICAgaWYgKHRoYXQuaXNBbmltYXRpbmcpIHtcbiAgICAgICAgckFGKHN0ZXApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNBbmltYXRpbmcgPSB0cnVlO1xuICAgIHN0ZXAoKTtcbiAgfSxcblxuICByZWZyZXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgZ2V0UmVjdCh0aGlzLndyYXBwZXIpOyAvLyBGb3JjZSByZWZsb3dcblxuICAgIHRoaXMud3JhcHBlcldpZHRoID0gdGhpcy53cmFwcGVyLmNsaWVudFdpZHRoO1xuICAgIHRoaXMud3JhcHBlckhlaWdodCA9IHRoaXMud3JhcHBlci5jbGllbnRIZWlnaHQ7XG5cbiAgICB2YXIgcmVjdCA9IGdldFJlY3QodGhpcy5zY3JvbGxlcik7XG5cbiAgICB0aGlzLnNjcm9sbGVyV2lkdGggPSByZWN0LndpZHRoO1xuICAgIHRoaXMuc2Nyb2xsZXJIZWlnaHQgPSByZWN0LmhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIHRoaXMubWF4U2Nyb2xsWCBvciB0aGlzLm1heFNjcm9sbFkgc21hbGxlciB0aGFuIDAsIG1lYW5pbmdcbiAgICAgKiBvdmVyZmxvdyBoYXBwZW5lZC5cbiAgICAgKi9cbiAgICB0aGlzLm1heFNjcm9sbFggPSB0aGlzLndyYXBwZXJXaWR0aCAtIHRoaXMuc2Nyb2xsZXJXaWR0aDtcbiAgICB0aGlzLm1heFNjcm9sbFkgPSB0aGlzLndyYXBwZXJIZWlnaHQgLSB0aGlzLnNjcm9sbGVySGVpZ2h0O1xuXG4gICAgLyoqXG4gICAgICogb3B0aW9uIGVuYWJsZXMgc2Nyb2xsIEFORCBvdmVyZmxvdyBleGlzdHNcbiAgICAgKi9cbiAgICB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPSB0aGlzLm9wdGlvbnMuc2Nyb2xsWCAmJiB0aGlzLm1heFNjcm9sbFggPCAwO1xuICAgIHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPSB0aGlzLm9wdGlvbnMuc2Nyb2xsWSAmJiB0aGlzLm1heFNjcm9sbFkgPCAwO1xuXG4gICAgaWYgKCF0aGlzLmhhc0hvcml6b250YWxTY3JvbGwpIHtcbiAgICAgIHRoaXMubWF4U2Nyb2xsWCA9IDA7XG4gICAgICB0aGlzLnNjcm9sbGVyV2lkdGggPSB0aGlzLndyYXBwZXJXaWR0aDtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaGFzVmVydGljYWxTY3JvbGwpIHtcbiAgICAgIHRoaXMubWF4U2Nyb2xsWSA9IDA7XG4gICAgICB0aGlzLnNjcm9sbGVySGVpZ2h0ID0gdGhpcy53cmFwcGVySGVpZ2h0O1xuICAgIH1cblxuICAgIHRoaXMuZW5kVGltZSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25YID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSAwO1xuXG4gICAgaWYgKGhhc1BvaW50ZXIgJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlUG9pbnRlcikge1xuICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dID1cbiAgICAgICAgZ2V0VG91Y2hBY3Rpb24odGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2gsIHRydWUpO1xuXG4gICAgICBpZiAoIXRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSkge1xuICAgICAgICB0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0gPVxuICAgICAgICAgIGdldFRvdWNoQWN0aW9uKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy53cmFwcGVyT2Zmc2V0ID0gb2Zmc2V0VXRpbHModGhpcy53cmFwcGVyKTtcblxuICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgncmVmcmVzaCcpO1xuXG4gICAgdGhpcy5yZXNldFBvc2l0aW9uKCk7XG4gIH0sXG5cbiAgcmVzZXRQb3NpdGlvbjogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgIHkgPSB0aGlzLnk7XG5cbiAgICB0aW1lID0gdGltZSB8fCAwO1xuXG4gICAgaWYgKCF0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgfHwgdGhpcy54ID4gMCkge1xuICAgICAgeCA9IDA7XG4gICAgfSBlbHNlIGlmICh0aGlzLnggPCB0aGlzLm1heFNjcm9sbFgpIHtcbiAgICAgIHggPSB0aGlzLm1heFNjcm9sbFg7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsIHx8IHRoaXMueSA+IDApIHtcbiAgICAgIHkgPSAwO1xuICAgIH0gZWxzZSBpZiAodGhpcy55IDwgdGhpcy5tYXhTY3JvbGxZKSB7XG4gICAgICB5ID0gdGhpcy5tYXhTY3JvbGxZO1xuICAgIH1cblxuICAgIGlmICh4ID09PSB0aGlzLnggJiYgeSA9PT0gdGhpcy55KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy5zY3JvbGxUbyh4LCB5LCB0aW1lLCB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGRpc2FibGU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVuYWJsZWQgPSBmYWxzZTtcbiAgfSxcblxuICBlbmFibGU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVuYWJsZWQgPSB0cnVlO1xuICB9XG5cblxufTtcblxuZXhwb3J0IGRlZmF1bHQgSXNjcm9sbDsiXSwibmFtZXMiOlsiZWFzaW5ncyIsImsiLCJNYXRoIiwic3FydCIsImIiLCJmIiwiZSIsInBvdyIsInNpbiIsIlBJIiwiX2VsZW1lbnRTdHlsZSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInN0eWxlIiwiX3ZlbmRvciIsInZlbmRvcnMiLCJ0cmFuc2Zvcm0iLCJpIiwibCIsImxlbmd0aCIsInN1YnN0ciIsIl9wcmVmaXhTdHlsZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwiaXNCYWRBbmRyb2lkIiwiYXBwVmVyc2lvbiIsIndpbmRvdyIsIm5hdmlnYXRvciIsInRlc3QiLCJzYWZhcmlWZXJzaW9uIiwibWF0Y2giLCJwYXJzZUZsb2F0IiwiZ2V0VGltZSIsIkRhdGUiLCJub3ciLCJvZmZzZXQiLCJlbCIsImxlZnQiLCJvZmZzZXRMZWZ0IiwidG9wIiwib2Zmc2V0VG9wIiwib2Zmc2V0UGFyZW50IiwiZ2V0UmVjdCIsIlNWR0VsZW1lbnQiLCJyZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0Iiwid2lkdGgiLCJoZWlnaHQiLCJvZmZzZXRXaWR0aCIsIm9mZnNldEhlaWdodCIsImhhc1BvaW50ZXIiLCJQb2ludGVyRXZlbnQiLCJNU1BvaW50ZXJFdmVudCIsImhhc1RvdWNoIiwiZ2V0VG91Y2hBY3Rpb24iLCJldmVudFBhc3N0aHJvdWdoIiwiYWRkUGluY2giLCJ0b3VjaEFjdGlvbiIsImFkZEV2ZW50IiwidHlwZSIsImZuIiwiY2FwdHVyZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZW1vdmVFdmVudCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJwcmVmaXhQb2ludGVyRXZlbnQiLCJwb2ludGVyRXZlbnQiLCJldmVudFR5cGUiLCJwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbiIsImV4Y2VwdGlvbnMiLCJyQUYiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ3ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJtb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJvUmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwibXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJjYWxsYmFjayIsInNldFRpbWVvdXQiLCJJc2Nyb2xsIiwiZWxlbSIsIm9wdGlvbnMiLCJ3cmFwcGVyIiwicXVlcnlTZWxlY3RvciIsInNjcm9sbGVyIiwiY2hpbGRyZW4iLCJzY3JvbGxlclN0eWxlIiwib25tb3VzZWRvd24iLCJ0YWdOYW1lIiwic2Nyb2xsWSIsInNjcm9sbFgiLCJmcmVlU2Nyb2xsIiwiZGlyZWN0aW9uTG9ja1RocmVzaG9sZCIsImJvdW5jZUVhc2luZyIsImNpcmN1bGFyIiwieCIsInkiLCJfaW5pdCIsInJlZnJlc2giLCJzY3JvbGxUbyIsInN0YXJ0WCIsInN0YXJ0WSIsImVuYWJsZSIsInByb3RvdHlwZSIsIl9pbml0RXZlbnRzIiwicmVtb3ZlIiwidGFyZ2V0IiwiYmluZFRvV3JhcHBlciIsImNsaWNrIiwiZGlzYWJsZU1vdXNlIiwiZGlzYWJsZVBvaW50ZXIiLCJkaXNhYmxlVG91Y2giLCJfc3RhcnQiLCJfbW92ZSIsImxvZyIsImJ1dHRvbiIsIndoaWNoIiwiZW5hYmxlZCIsImluaXRpYXRlZCIsInByZXZlbnREZWZhdWx0IiwicG9pbnQiLCJ0b3VjaGVzIiwicG9zIiwibW92ZWQiLCJkaXN0WCIsImRpc3RZIiwiZGlyZWN0aW9uWCIsImRpcmVjdGlvblkiLCJkaXJlY3Rpb25Mb2NrZWQiLCJzdGFydFRpbWUiLCJ1c2VUcmFuc2l0aW9uIiwiaXNJblRyYW5zaXRpb24iLCJfdHJhbnNpdGlvblRpbWUiLCJnZXRDb21wdXRlZFBvc2l0aW9uIiwiX3RyYW5zbGF0ZSIsInJvdW5kIiwiaXNBbmltYXRpbmciLCJhYnNTdGFydFgiLCJhYnNTdGFydFkiLCJwb2ludFgiLCJwYWdlWCIsInBvaW50WSIsInBhZ2VZIiwiZGVsdGFYIiwidGltZXN0YW1wIiwibmV3WCIsIm5ld1kiLCJhYnNEaXN0WCIsImFic0Rpc3RZIiwiZGVsdGFZIiwiYWJzIiwiZW5kVGltZSIsImhhc1ZlcnRpY2FsU2Nyb2xsIiwiaGFzSG9yaXpvbnRhbFNjcm9sbCIsIm1heFNjcm9sbFgiLCJib3VuY2UiLCJtYXhTY3JvbGxZIiwibWF0cml4IiwiZ2V0Q29tcHV0ZWRTdHlsZSIsInVzZVRyYW5zZm9ybSIsInN0eWxlVXRpbHMiLCJzcGxpdCIsInJlcGxhY2UiLCJ0aW1lIiwiZWFzaW5nIiwidHJhbnNpdGlvblR5cGUiLCJfdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIiwiX2FuaW1hdGUiLCJvZmZzZXRYIiwib2Zmc2V0WSIsIm5vZGVUeXBlIiwib2Zmc2V0VXRpbHMiLCJlYXNpbmdTdHlsZSIsInRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiIsImR1cmF0aW9uUHJvcCIsInRyYW5zaXRpb25EdXJhdGlvbiIsInNlbGYiLCJkZXN0WCIsImRlc3RZIiwiZHVyYXRpb24iLCJlYXNpbmdGbiIsInRoYXQiLCJkZXN0VGltZSIsInN0ZXAiLCJ3cmFwcGVyV2lkdGgiLCJjbGllbnRXaWR0aCIsIndyYXBwZXJIZWlnaHQiLCJjbGllbnRIZWlnaHQiLCJzY3JvbGxlcldpZHRoIiwic2Nyb2xsZXJIZWlnaHQiLCJ3cmFwcGVyT2Zmc2V0IiwicmVzZXRQb3NpdGlvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSUEsVUFBVTthQUNEO1dBQ0Ysc0NBREU7UUFFTCxVQUFVQyxDQUFWLEVBQWE7YUFDUkEsS0FBSyxJQUFJQSxDQUFULENBQVA7O0dBSlE7WUFPRjtXQUNELGlDQURDO1FBRUosVUFBVUEsQ0FBVixFQUFhO2FBQ1JDLEtBQUtDLElBQUwsQ0FBVSxJQUFLLEVBQUVGLENBQUYsR0FBTUEsQ0FBckIsQ0FBUDs7R0FWUTtRQWFOO1dBQ0cseUNBREg7UUFFQSxVQUFVQSxDQUFWLEVBQWE7VUFDWEcsSUFBSSxDQUFSO2FBQ08sQ0FBQ0gsSUFBSUEsSUFBSSxDQUFULElBQWNBLENBQWQsSUFBbUIsQ0FBQ0csSUFBSSxDQUFMLElBQVVILENBQVYsR0FBY0csQ0FBakMsSUFBc0MsQ0FBN0M7O0dBakJRO1VBb0JKO1dBQ0MsRUFERDtRQUVGLFVBQVVILENBQVYsRUFBYTtVQUNYLENBQUNBLEtBQUssQ0FBTixJQUFZLElBQUksSUFBcEIsRUFBMkI7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

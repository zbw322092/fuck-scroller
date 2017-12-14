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

export default Iscroll;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5tb2R1bGUuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9lYXNpbmdzLmpzIiwiLi4vc3JjL3V0aWxzL3N0eWxlLmpzIiwiLi4vc3JjL3V0aWxzL2lzQmFkQW5kcm9pZC5qcyIsIi4uL3NyYy91dGlscy9nZXRUaW1lLmpzIiwiLi4vc3JjL3V0aWxzL29mZnNldC5qcyIsIi4uL3NyYy91dGlscy9nZXRSZWN0LmpzIiwiLi4vc3JjL3V0aWxzL2RldGVjdG9yLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRvdWNoQWN0aW9uLmpzIiwiLi4vc3JjL3V0aWxzL2V2ZW50SGFuZGxlci5qcyIsIi4uL3NyYy91dGlscy9wcmVmaXhQb2ludGVyRXZlbnQuanMiLCIuLi9zcmMvdXRpbHMvZXZlbnRUeXBlLmpzIiwiLi4vc3JjL3V0aWxzL3ByZXZlbnREZWZhdWx0RXhjZXB0aW9uLmpzIiwiLi4vc3JjL215LWlzY3JvbGwuanMiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIGVhc2luZ3MgPSB7XG4gIHF1YWRyYXRpYzoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBrICogKDIgLSBrKTtcbiAgICB9XG4gIH0sXG4gIGNpcmN1bGFyOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xLCAwLjU3LCAwLjEsIDEpJyxcdC8vIE5vdCBwcm9wZXJseSBcImNpcmN1bGFyXCIgYnV0IHRoaXMgbG9va3MgYmV0dGVyLCBpdCBzaG91bGQgYmUgKDAuMDc1LCAwLjgyLCAwLjE2NSwgMSlcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoMSAtICgtLWsgKiBrKSk7XG4gICAgfVxuICB9LFxuICBiYWNrOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xNzUsIDAuODg1LCAwLjMyLCAxLjI3NSknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGIgPSA0O1xuICAgICAgcmV0dXJuIChrID0gayAtIDEpICogayAqICgoYiArIDEpICogayArIGIpICsgMTtcbiAgICB9XG4gIH0sXG4gIGJvdW5jZToge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIGlmICgoayAvPSAxKSA8ICgxIC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIGsgKiBrO1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDEuNSAvIDIuNzUpKSAqIGsgKyAwLjc1O1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIuNSAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi4yNSAvIDIuNzUpKSAqIGsgKyAwLjkzNzU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuNjI1IC8gMi43NSkpICogayArIDAuOTg0Mzc1O1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZWxhc3RpYzoge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciBmID0gMC4yMixcbiAgICAgICAgZSA9IDAuNDtcblxuICAgICAgaWYgKGsgPT09IDApIHsgcmV0dXJuIDA7IH1cbiAgICAgIGlmIChrID09IDEpIHsgcmV0dXJuIDE7IH1cblxuICAgICAgcmV0dXJuIChlICogTWF0aC5wb3coMiwgLSAxMCAqIGspICogTWF0aC5zaW4oKGsgLSBmIC8gNCkgKiAoMiAqIE1hdGguUEkpIC8gZikgKyAxKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGVhc2luZ3M7IiwidmFyIF9lbGVtZW50U3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKS5zdHlsZTtcblxudmFyIF92ZW5kb3IgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgdmVuZG9ycyA9IFsndCcsICd3ZWJraXRUJywgJ01velQnLCAnbXNUJywgJ09UJ10sXG4gICAgdHJhbnNmb3JtLFxuICAgIGkgPSAwLFxuICAgIGwgPSB2ZW5kb3JzLmxlbmd0aDtcblxuICB3aGlsZSAoaSA8IGwpIHtcbiAgICB0cmFuc2Zvcm0gPSB2ZW5kb3JzW2ldICsgJ3JhbnNmb3JtJztcbiAgICBpZiAodHJhbnNmb3JtIGluIF9lbGVtZW50U3R5bGUpIHtcbiAgICAgIHJldHVybiB2ZW5kb3JzW2ldLnN1YnN0cigwLCB2ZW5kb3JzW2ldLmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICBpKys7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59KSgpO1xuXG5mdW5jdGlvbiBfcHJlZml4U3R5bGUgKHN0eWxlKSB7XG4gIGlmICggX3ZlbmRvciA9PT0gZmFsc2UgKSByZXR1cm4gZmFsc2U7IC8vIG5vIHZlbmRvciBmb3VuZFxuICBpZiAoIF92ZW5kb3IgPT09ICcnICkgcmV0dXJuIHN0eWxlOyAvLyBubyBwcmVmaXggbmVlZGVkXG4gIHJldHVybiBfdmVuZG9yICsgc3R5bGUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHlsZS5zdWJzdHIoMSk7IC8vIG90aGVyd2lzZSBhZGQgcHJlZml4XG59XG5cbi8vIHN0eWxlIHRoYXQgaGFzIHZlbmRvciBwcmVmaXgsIGVnOiB3ZWJraXRUcmFuc2Zvcm1cbnZhciBzdHlsZSA9IHtcbiAgdHJhbnNmb3JtOiBfcHJlZml4U3R5bGUoJ3RyYW5zZm9ybScpLFxuICB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uJyksXG4gIHRyYW5zaXRpb25EdXJhdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uRHVyYXRpb24nKSxcbiAgdHJhbnNpdGlvbkRlbGF5OiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EZWxheScpLFxuICB0cmFuc2Zvcm1PcmlnaW46IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtT3JpZ2luJyksXG4gIHRvdWNoQWN0aW9uOiBfcHJlZml4U3R5bGUoJ3RvdWNoQWN0aW9uJylcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHN0eWxlOyIsInZhciBpc0JhZEFuZHJvaWQgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgYXBwVmVyc2lvbiA9IHdpbmRvdy5uYXZpZ2F0b3IuYXBwVmVyc2lvbjtcblxuICBpZiAoL0FuZHJvaWQvLnRlc3QoYXBwVmVyc2lvbikgJiYgISgvQ2hyb21lXFwvXFxkLy50ZXN0KGFwcFZlcnNpb24pKSkge1xuICAgIHZhciBzYWZhcmlWZXJzaW9uID0gYXBwVmVyc2lvbi5tYXRjaCgvU2FmYXJpXFwvKFxcZCsuXFxkKS8pO1xuICAgIGlmKHNhZmFyaVZlcnNpb24gJiYgdHlwZW9mIHNhZmFyaVZlcnNpb24gPT09IFwib2JqZWN0XCIgJiYgc2FmYXJpVmVyc2lvbi5sZW5ndGggPj0gMikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoc2FmYXJpVmVyc2lvblsxXSkgPCA1MzUuMTk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzQmFkQW5kcm9pZDsiLCIvKipcbiAqIDEuIERhdGUucHJvdG90eXBlLmdldFRpbWUgaGFzIEJFVFRFUiBjb21wYXRpYmlsaXR5IHRoYW4gRGF0ZS5ub3dcbiAqIHJlZmVyZW5jZTogXG4gKiAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9nZXRUaW1lI0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0RhdGUvbm93I0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogXG4gKiAyLiBEYXRlLnByb3RvdHlwZS5nZXRUaW1lIHNwZWVkIGlzIFNMT1dTRVIgdGhhbiBEYXRlLm5vd1xuICogcmVmZXJlbmNlOlxuICogIGh0dHBzOi8vanNwZXJmLmNvbS9kYXRlLW5vdy12cy1kYXRlLWdldHRpbWUvN1xuICovXG5cbnZhciBnZXRUaW1lID0gRGF0ZS5ub3cgfHxcbiAgZnVuY3Rpb24gZ2V0VGltZSgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbmV4cG9ydCBkZWZhdWx0IGdldFRpbWU7IiwidmFyIG9mZnNldCA9IGZ1bmN0aW9uIChlbCkge1xuICB2YXIgbGVmdCA9IC1lbC5vZmZzZXRMZWZ0LFxuICB0b3AgPSAtZWwub2Zmc2V0VG9wO1xuXG4gIC8qKlxuICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvSFRNTEVsZW1lbnQvb2Zmc2V0UGFyZW50XG4gICAqIFJldHVybnMgbnVsbCB3aGVuIHRoZSBlbGVtZW50IGhhcyBzdHlsZS5kaXNwbGF5IHNldCB0byBcIm5vbmVcIi4gVGhlIG9mZnNldFBhcmVudCBcbiAgICogaXMgdXNlZnVsIGJlY2F1c2Ugb2Zmc2V0VG9wIGFuZCBvZmZzZXRMZWZ0IGFyZSByZWxhdGl2ZSB0byBpdHMgcGFkZGluZyBlZGdlLlxuICAgKi9cbiAgd2hpbGUgKGVsID0gZWwub2Zmc2V0UGFyZW50KSB7XG4gICAgbGVmdCAtPSBlbC5vZmZzZXRMZWZ0O1xuICAgIHRvcCAtPSBlbC5vZmZzZXRUb3A7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGxlZnQ6IGxlZnQsXG4gICAgdG9wOiB0b3BcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgb2Zmc2V0OyIsImZ1bmN0aW9uIGdldFJlY3QoZWwpIHtcbiAgaWYgKGVsIGluc3RhbmNlb2YgU1ZHRWxlbWVudCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wIDogcmVjdC50b3AsXG4gICAgICBsZWZ0IDogcmVjdC5sZWZ0LFxuICAgICAgd2lkdGggOiByZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0IDogcmVjdC5oZWlnaHRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcCA6IGVsLm9mZnNldFRvcCxcbiAgICAgIGxlZnQgOiBlbC5vZmZzZXRMZWZ0LFxuICAgICAgd2lkdGggOiBlbC5vZmZzZXRXaWR0aCxcbiAgICAgIGhlaWdodCA6IGVsLm9mZnNldEhlaWdodFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZ2V0UmVjdDsiLCJ2YXIgaGFzUG9pbnRlciA9ICEhKHdpbmRvdy5Qb2ludGVyRXZlbnQgfHwgd2luZG93Lk1TUG9pbnRlckV2ZW50KTsgLy8gSUUxMCBpcyBwcmVmaXhlZFxudmFyIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93O1xuXG5leHBvcnQge1xuICBoYXNQb2ludGVyLFxuICBoYXNUb3VjaFxufSIsInZhciBnZXRUb3VjaEFjdGlvbiA9IGZ1bmN0aW9uIChldmVudFBhc3N0aHJvdWdoLCBhZGRQaW5jaCkge1xuICB2YXIgdG91Y2hBY3Rpb24gPSAnbm9uZSc7XG4gIGlmIChldmVudFBhc3N0aHJvdWdoID09PSAndmVydGljYWwnKSB7XG4gICAgdG91Y2hBY3Rpb24gPSAncGFuLXknO1xuICB9IGVsc2UgaWYgKGV2ZW50UGFzc3Rocm91Z2ggPT09ICdob3Jpem9udGFsJykge1xuICAgIHRvdWNoQWN0aW9uID0gJ3Bhbi14JztcbiAgfVxuXG4gIGlmIChhZGRQaW5jaCAmJiB0b3VjaEFjdGlvbiAhPSAnbm9uZScpIHtcbiAgICAvLyBhZGQgcGluY2gtem9vbSBzdXBwb3J0IGlmIHRoZSBicm93c2VyIHN1cHBvcnRzIGl0LCBidXQgaWYgbm90IChlZy4gQ2hyb21lIDw1NSkgZG8gbm90aGluZ1xuICAgIHRvdWNoQWN0aW9uICs9ICcgcGluY2gtem9vbSc7XG4gIH1cbiAgcmV0dXJuIHRvdWNoQWN0aW9uO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRUb3VjaEFjdGlvbjsiLCJmdW5jdGlvbiBhZGRFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59O1xuXG5mdW5jdGlvbiByZW1vdmVFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59XG5cbmV4cG9ydCB7XG4gIGFkZEV2ZW50LFxuICByZW1vdmVFdmVudFxufTsiLCJmdW5jdGlvbiBwcmVmaXhQb2ludGVyRXZlbnQgKHBvaW50ZXJFdmVudCkge1xuICByZXR1cm4gd2luZG93Lk1TUG9pbnRlckV2ZW50ID8gXG4gICAgJ01TUG9pbnRlcicgKyBwb2ludGVyRXZlbnQuY2hhckF0KDcpLnRvVXBwZXJDYXNlKCkgKyBwb2ludGVyRXZlbnQuc3Vic3RyKDgpIDpcbiAgICBwb2ludGVyRXZlbnQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHByZWZpeFBvaW50ZXJFdmVudDsiLCJ2YXIgZXZlbnRUeXBlID0ge1xuICB0b3VjaHN0YXJ0OiAxLFxuICB0b3VjaG1vdmU6IDEsXG4gIHRvdWNoZW5kOiAxLFxuXG4gIG1vdXNlZG93bjogMixcbiAgbW91c2Vtb3ZlOiAyLFxuICBtb3VzZXVwOiAyLFxuXG4gIHBvaW50ZXJkb3duOiAzLFxuICBwb2ludGVybW92ZTogMyxcbiAgcG9pbnRlcnVwOiAzLFxuXG4gIE1TUG9pbnRlckRvd246IDMsXG4gIE1TUG9pbnRlck1vdmU6IDMsXG4gIE1TUG9pbnRlclVwOiAzXG59O1xuXG5leHBvcnQgZGVmYXVsdCBldmVudFR5cGU7IiwidmFyIHByZXZlbnREZWZhdWx0RXhjZXB0aW9uID0gZnVuY3Rpb24gKGVsLCBleGNlcHRpb25zKSB7XG4gIGZvciAodmFyIGkgaW4gZXhjZXB0aW9ucykge1xuICAgIGlmICggZXhjZXB0aW9uc1tpXS50ZXN0KGVsW2ldKSApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHByZXZlbnREZWZhdWx0RXhjZXB0aW9uOyIsImltcG9ydCBlYXNpbmdzIGZyb20gJy4vdXRpbHMvZWFzaW5ncyc7XG5pbXBvcnQgc3R5bGVVdGlscyBmcm9tICcuL3V0aWxzL3N0eWxlJztcbmltcG9ydCBpc0JhZEFuZHJvaWQgZnJvbSAnLi91dGlscy9pc0JhZEFuZHJvaWQnO1xuaW1wb3J0IGdldFRpbWUgZnJvbSAnLi91dGlscy9nZXRUaW1lJztcbmltcG9ydCBvZmZzZXRVdGlscyBmcm9tICcuL3V0aWxzL29mZnNldCc7XG5pbXBvcnQgZ2V0UmVjdCBmcm9tICcuL3V0aWxzL2dldFJlY3QnO1xuaW1wb3J0IHsgaGFzUG9pbnRlciwgaGFzVG91Y2ggfSBmcm9tICcuL3V0aWxzL2RldGVjdG9yJztcbmltcG9ydCBnZXRUb3VjaEFjdGlvbiBmcm9tICcuL3V0aWxzL2dldFRvdWNoQWN0aW9uJztcbmltcG9ydCB7IGFkZEV2ZW50LCByZW1vdmVFdmVudCB9IGZyb20gJy4vdXRpbHMvZXZlbnRIYW5kbGVyJztcbmltcG9ydCBwcmVmaXhQb2ludGVyRXZlbnQgZnJvbSAnLi91dGlscy9wcmVmaXhQb2ludGVyRXZlbnQnO1xuaW1wb3J0IGV2ZW50VHlwZSBmcm9tICcuL3V0aWxzL2V2ZW50VHlwZSc7XG5pbXBvcnQgcHJldmVudERlZmF1bHRFeGNlcHRpb24gZnJvbSAnLi91dGlscy9wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbidcblxuLy8gZGVhbCB3aXRoIHJlcXVlc3RBbmltYXRpb25GcmFtZSBjb21wYXRiaWxpdHlcbnZhciByQUYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7IHdpbmRvdy5zZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApOyB9O1xuXG5mdW5jdGlvbiBJc2Nyb2xsKGVsZW0sIG9wdGlvbnMpIHtcbiAgLyoqXG4gICAqIGdldCBzY3JvbGwgbm9kZSBlbGVtZW50XG4gICAqL1xuICB0aGlzLndyYXBwZXIgPSB0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pIDogZWxlbTtcbiAgdGhpcy5zY3JvbGxlciA9IHRoaXMud3JhcHBlci5jaGlsZHJlblswXTtcbiAgdGhpcy5zY3JvbGxlclN0eWxlID0gdGhpcy5zY3JvbGxlci5zdHlsZTtcblxuICAvKipcbiAgICogbWVyZ2UgZGVmYXVsdCBvcHRpb25zIGFuZCBjdXN0b21pemVkIG9wdGlvbnNcbiAgICovXG4gIHRoaXMub3B0aW9ucyA9IHtcbiAgICBkaXNhYmxlUG9pbnRlcjogIWhhc1BvaW50ZXIsXG4gICAgZGlzYWJsZVRvdWNoOiBoYXNQb2ludGVyIHx8ICFoYXNUb3VjaCxcbiAgICBkaXNhYmxlTW91c2U6IGhhc1BvaW50ZXIgfHwgIWhhc1RvdWNoLFxuICAgIHVzZVRyYW5zaXRpb246IHRydWUsXG4gICAgdXNlVHJhbnNmb3JtOiB0cnVlLFxuICAgIHNjcm9sbFk6IHRydWUsXG4gICAgc3RhcnRYOiAwLFxuICAgIHN0YXJ0WTogMCxcbiAgICBiaW5kVG9XcmFwcGVyOiB0eXBlb2Ygd2luZG93Lm9ubW91c2Vkb3duID09PSBcInVuZGVmaW5lZFwiLFxuICAgIHByZXZlbnREZWZhdWx0OiB0cnVlLFxuICAgIHByZXZlbnREZWZhdWx0RXhjZXB0aW9uOiB7IHRhZ05hbWU6IC9eKElOUFVUfFRFWFRBUkVBfEJVVFRPTnxTRUxFQ1QpJC8gfSxcbiAgICBkaXJlY3Rpb25Mb2NrVGhyZXNob2xkOiA1LFxuXHRcdGJvdW5jZTogdHJ1ZSxcblx0XHRib3VuY2VUaW1lOiA2MDAsXG5cdFx0Ym91bmNlRWFzaW5nOiAnJ1xuICB9O1xuXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9uc1tpXSA9IG9wdGlvbnNbaV07XG4gIH1cblxuICB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSB0cnVlID8gJ3ZlcnRpY2FsJyA6IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoO1xuXG4gIC8vIElmIHlvdSB3YW50IGV2ZW50UGFzc3Rocm91Z2ggSSBoYXZlIHRvIGxvY2sgb25lIG9mIHRoZSBheGVzXG4gIHRoaXMub3B0aW9ucy5zY3JvbGxZID0gdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT09ICd2ZXJ0aWNhbCcgPyBmYWxzZSA6IHRoaXMub3B0aW9ucy5zY3JvbGxZO1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSAnaG9yaXpvbnRhbCcgPyBmYWxzZSA6IHRoaXMub3B0aW9ucy5zY3JvbGxYO1xuXG4gIHRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsID0gdGhpcy5vcHRpb25zLmZyZWVTY3JvbGwgJiYgIXRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoO1xuICB0aGlzLm9wdGlvbnMuZGlyZWN0aW9uTG9ja1RocmVzaG9sZCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID8gMCA6IHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkO1xuXG4gIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcgPSB0eXBlb2YgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyA9PSAnc3RyaW5nJyA/XG4gICAgZWFzaW5nc1t0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nXSB8fCBlYXNpbmdzLmNpcmN1bGFyIDpcbiAgICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nO1xuXG4gIHRoaXMueCA9IDA7XG4gIHRoaXMueSA9IDA7XG5cbiAgdGhpcy5faW5pdCgpO1xuICB0aGlzLnJlZnJlc2goKTtcbiAgdGhpcy5zY3JvbGxUbyh0aGlzLm9wdGlvbnMuc3RhcnRYLCB0aGlzLm9wdGlvbnMuc3RhcnRZKTtcbiAgdGhpcy5lbmFibGUoKTtcbn1cblxuSXNjcm9sbC5wcm90b3R5cGUgPSB7XG5cbiAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pbml0RXZlbnRzKCk7XG4gIH0sXG5cbiAgX2luaXRFdmVudHM6IGZ1bmN0aW9uIChyZW1vdmUpIHtcbiAgICB2YXIgZXZlbnRUeXBlID0gcmVtb3ZlID8gcmVtb3ZlRXZlbnQgOiBhZGRFdmVudCxcbiAgICAgIHRhcmdldCA9IHRoaXMub3B0aW9ucy5iaW5kVG9XcmFwcGVyID8gdGhpcy53cmFwcGVyIDogd2luZG93O1xuXG4gICAgZXZlbnRUeXBlKHdpbmRvdywgJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHdpbmRvdywgJ3Jlc2l6ZScsIHRoaXMpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbGljaykge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ2NsaWNrJywgdGhpcywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZU1vdXNlKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCAnbW91c2Vkb3duJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAnbW91c2Vtb3ZlJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAnbW91c2VjYW5jZWwnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICdtb3VzZXVwJywgdGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKGhhc1BvaW50ZXIgJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlUG9pbnRlcikge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVyZG93bicpLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsIHByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcm1vdmUnKSwgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJjYW5jZWwnKSwgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJ1cCcpLCB0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAoaGFzVG91Y2ggJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlVG91Y2gpIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsICd0b3VjaHN0YXJ0JywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAndG91Y2htb3ZlJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAndG91Y2hjYW5jZWwnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICd0b3VjaGVuZCcsIHRoaXMpO1xuICAgIH1cblxuICAgIGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAndHJhbnNpdGlvbmVuZCcsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAnd2Via2l0VHJhbnNpdGlvbkVuZCcsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAnb1RyYW5zaXRpb25FbmQnLCB0aGlzKTtcbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ01TVHJhbnNpdGlvbkVuZCcsIHRoaXMpO1xuICB9LFxuXG4gIGhhbmRsZUV2ZW50OiBmdW5jdGlvbiAoZSkge1xuICAgIHN3aXRjaCAoZS50eXBlKSB7XG4gICAgICBjYXNlICd0b3VjaHN0YXJ0JzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJkb3duJzpcbiAgICAgIGNhc2UgJ01TUG9pbnRlckRvd24nOlxuICAgICAgY2FzZSAnbW91c2Vkb3duJzpcbiAgICAgICAgdGhpcy5fc3RhcnQoZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd0b3VjaG1vdmUnOlxuICAgICAgY2FzZSAncG9pbnRlcm1vdmUnOlxuICAgICAgY2FzZSAnTVNQb2ludGVyTW92ZSc6XG4gICAgICBjYXNlICdtb3VzZW1vdmUnOlxuICAgICAgICB0aGlzLl9tb3ZlKGUpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH0sXG5cbiAgX3N0YXJ0OiBmdW5jdGlvbiAoZSkge1xuICAgIGNvbnNvbGUubG9nKGUudHlwZSk7XG4gICAgLy8gUmVhY3QgdG8gbGVmdCBtb3VzZSBidXR0b24gb25seVxuICAgIGlmIChldmVudFR5cGVbZS50eXBlXSAhPT0gMSkgeyAvLyBub3QgdG91Y2ggZXZlbnRcbiAgICAgIHZhciBidXR0b247XG4gICAgICBpZiAoIWUud2hpY2gpIHtcbiAgICAgICAgLyogSUUgY2FzZSAqL1xuICAgICAgICBidXR0b24gPSAoZS5idXR0b24gPCAyKSA/IDAgOlxuICAgICAgICAgICgoZS5idXR0b24gPT0gNCkgPyAxIDogMik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvKiBBbGwgb3RoZXJzICovXG4gICAgICAgIGJ1dHRvbiA9IGUuYnV0dG9uO1xuICAgICAgfVxuXG4gICAgICAvLyBub3QgbGVmdCBtb3VzZSBidXR0b25cbiAgICAgIGlmIChidXR0b24gIT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdGhpcy5lbmFibGVkIHx8ICh0aGlzLmluaXRpYXRlZCAmJiBldmVudFR5cGVbZS50eXBlXSAhPT0gdGhpcy5pbml0aWF0ZWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdCAmJiAhaXNCYWRBbmRyb2lkICYmICFwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbihlLnRhcmdldCwgdGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0RXhjZXB0aW9uKSkge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIHZhciBwb2ludCA9IGUudG91Y2hlcyA/IGUudG91Y2hlc1swXSA6IGUsXG4gICAgICBwb3M7XG5cbiAgICB0aGlzLmluaXRpYXRlZCA9IGV2ZW50VHlwZVtlLnR5cGVdO1xuICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmRpc3RYID0gMDtcbiAgICB0aGlzLmRpc3RZID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblggPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAwO1xuXG4gICAgdGhpcy5zdGFydFRpbWUgPSBnZXRUaW1lKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgdGhpcy5pc0luVHJhbnNpdGlvbikge1xuICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWUoKTtcbiAgICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSBmYWxzZTtcbiAgICAgIHBvcyA9IHRoaXMuZ2V0Q29tcHV0ZWRQb3NpdGlvbigpO1xuICAgICAgdGhpcy5fdHJhbnNsYXRlKE1hdGgucm91bmQocG9zLngpLCBNYXRoLnJvdW5kKHBvcy55KSk7XG4gICAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRoaXMuaXNBbmltYXRpbmcpIHtcbiAgICAgIHRoaXMuaXNBbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsRW5kJyk7XG4gICAgfVxuXG4gICAgdGhpcy5zdGFydFggPSB0aGlzLng7XG4gICAgdGhpcy5zdGFydFkgPSB0aGlzLnk7XG4gICAgdGhpcy5hYnNTdGFydFggPSB0aGlzLng7XG4gICAgdGhpcy5hYnNTdGFydFkgPSB0aGlzLnk7XG4gICAgdGhpcy5wb2ludFggPSBwb2ludC5wYWdlWDtcbiAgICB0aGlzLnBvaW50WSA9IHBvaW50LnBhZ2VZO1xuXG4gICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdiZWZvcmVTY3JvbGxTdGFydCcpO1xuICB9LFxuXG4gIF9tb3ZlOiBmdW5jdGlvbiAoZSkge1xuICAgIGlmICghdGhpcy5lbmFibGVkIHx8IGV2ZW50VHlwZVtlLnR5cGVdICE9PSB0aGlzLmluaXRpYXRlZCkge1xuICAgICAgY29uc29sZS5sb2coMTExKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0KSB7XHQvLyBpbmNyZWFzZXMgcGVyZm9ybWFuY2Ugb24gQW5kcm9pZD8gVE9ETzogY2hlY2shXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgdmFyIHBvaW50ID0gZS50b3VjaGVzID8gZS50b3VjaGVzWzBdIDogZSxcbiAgICAgIGRlbHRhWCA9IHBvaW50LnBhZ2VYIC0gdGhpcy5wb2ludFgsIC8vIHRoZSBtb3ZlZCBkaXN0YW5jZVxuICAgICAgZGVsdGFZID0gcG9pbnQucGFnZVkgLSB0aGlzLnBvaW50WSxcbiAgICAgIHRpbWVzdGFtcCA9IGdldFRpbWUoKSxcbiAgICAgIG5ld1gsIG5ld1ksXG4gICAgICBhYnNEaXN0WCwgYWJzRGlzdFk7XG5cbiAgICB0aGlzLnBvaW50WCA9IHBvaW50LnBhZ2VYO1xuICAgIHRoaXMucG9pbnRZID0gcG9pbnQucGFnZVk7XG5cbiAgICB0aGlzLmRpc3RYICs9IGRlbHRhWDtcbiAgICB0aGlzLmRpc3RZICs9IGRlbHRhWTtcbiAgICBhYnNEaXN0WCA9IE1hdGguYWJzKHRoaXMuZGlzdFgpOyAvLyBhYnNvbHV0ZSBtb3ZlZCBkaXN0YW5jZVxuICAgIGFic0Rpc3RZID0gTWF0aC5hYnModGhpcy5kaXN0WSk7XG5cbiAgICAvKipcbiAgICAgKiAgV2UgbmVlZCB0byBtb3ZlIGF0IGxlYXN0IDEwIHBpeGVscyBmb3IgdGhlIHNjcm9sbGluZyB0byBpbml0aWF0ZVxuICAgICAqICB0aGlzLmVuZFRpbWUgaXMgaW5pdGlhdGVkIGluIHRoaXMucHJvdG90eXBlLnJlZnJlc2ggbWV0aG9kXG4gICAgICovXG4gICAgaWYgKHRpbWVzdGFtcCAtIHRoaXMuZW5kVGltZSA+IDMwMCAmJiAoYWJzRGlzdFggPCAxMCAmJiBhYnNEaXN0WSA8IDEwKSkge1xuICAgICAgY29uc29sZS5sb2coMjIyKVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHlvdSBhcmUgc2Nyb2xsaW5nIGluIG9uZSBkaXJlY3Rpb24gbG9jayB0aGUgb3RoZXJcbiAgICBpZiAoIXRoaXMuZGlyZWN0aW9uTG9ja2VkICYmICF0aGlzLm9wdGlvbnMuZnJlZVNjcm9sbCkge1xuXG4gICAgICBpZiAoYWJzRGlzdFggPiBhYnNEaXN0WSArIHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ2gnO1x0XHQvLyBsb2NrIGhvcml6b250YWxseVxuICAgICAgfSBlbHNlIGlmIChhYnNEaXN0WSA+PSBhYnNEaXN0WCArIHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ3YnO1x0XHQvLyBsb2NrIHZlcnRpY2FsbHlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ24nO1x0XHQvLyBubyBsb2NrXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICBpZiAodGhpcy5kaXJlY3Rpb25Mb2NrZWQgPT0gJ2gnKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ3ZlcnRpY2FsJykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICdob3Jpem9udGFsJykge1xuICAgICAgICB0aGlzLmluaXRpYXRlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGRlbHRhWSA9IDA7XG4gICAgfSBlbHNlIGlmICh0aGlzLmRpcmVjdGlvbkxvY2tlZCA9PSAndicpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAnaG9yaXpvbnRhbCcpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAndmVydGljYWwnKSB7XG4gICAgICAgIHRoaXMuaW5pdGlhdGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZGVsdGFYID0gMDtcbiAgICB9XG4gICAgY29uc29sZS5sb2codGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCwgZGVsdGFZKTtcblx0XHRkZWx0YVggPSB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPyBkZWx0YVggOiAwO1xuICAgIGRlbHRhWSA9IHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPyBkZWx0YVkgOiAwO1xuICAgIFxuXHRcdG5ld1ggPSB0aGlzLnggKyBkZWx0YVg7XG4gICAgbmV3WSA9IHRoaXMueSArIGRlbHRhWTtcbiAgICBcbiAgICAvLyBTbG93IGRvd24gaWYgb3V0c2lkZSBvZiB0aGUgYm91bmRhcmllc1xuICAgIGlmICggbmV3WCA+IDAgfHwgbmV3WCA8IHRoaXMubWF4U2Nyb2xsWCApIHtcbiAgICAgIG5ld1ggPSB0aGlzLm9wdGlvbnMuYm91bmNlID8gdGhpcy54ICsgZGVsdGFYIC8gMyA6IG5ld1ggPiAwID8gMCA6IHRoaXMubWF4U2Nyb2xsWDtcbiAgICB9XG5cdFx0aWYgKCBuZXdZID4gMCB8fCBuZXdZIDwgdGhpcy5tYXhTY3JvbGxZICkge1xuXHRcdFx0bmV3WSA9IHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLnkgKyBkZWx0YVkgLyAzIDogbmV3WSA+IDAgPyAwIDogdGhpcy5tYXhTY3JvbGxZO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLmRpcmVjdGlvblggPSBkZWx0YVggPiAwID8gLTEgOiBkZWx0YVggPCAwID8gMSA6IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25ZID0gZGVsdGFZID4gMCA/IC0xIDogZGVsdGFZIDwgMCA/IDEgOiAwO1xuXG5cdFx0aWYgKCAhdGhpcy5tb3ZlZCApIHtcblx0XHRcdC8vIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsU3RhcnQnKTtcbiAgICB9XG4gICAgXG4gICAgdGhpcy5tb3ZlZCA9IHRydWU7XG5cbiAgICB0aGlzLl90cmFuc2xhdGUobmV3WCwgbmV3WSk7XG5cbiAgICBpZiAoIHRpbWVzdGFtcCAtIHRoaXMuc3RhcnRUaW1lID4gMzAwICkge1xuICAgICAgdGhpcy5zdGFydFRpbWUgPSB0aW1lc3RhbXA7XG5cdFx0XHR0aGlzLnN0YXJ0WCA9IHRoaXMueDtcblx0XHRcdHRoaXMuc3RhcnRZID0gdGhpcy55O1xuICAgIH1cbiAgfSxcblxuICBnZXRDb21wdXRlZFBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1hdHJpeCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuc2Nyb2xsZXIsIG51bGwpLFxuICAgICAgeCwgeTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMudXNlVHJhbnNmb3JtKSB7XG4gICAgICBtYXRyaXggPSBtYXRyaXhbc3R5bGVVdGlscy50cmFuc2Zvcm1dLnNwbGl0KCcpJylbMF0uc3BsaXQoJywgJyk7XG4gICAgICB4ID0gKyhtYXRyaXhbMTJdIHx8IG1hdHJpeFs0XSk7XG4gICAgICB5ID0gKyhtYXRyaXhbMTNdIHx8IG1hdHJpeFs1XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGVnLiB0cmFuc2Zvcm0gJzBweCcgdG8gMFxuICAgICAgeCA9ICttYXRyaXgubGVmdC5yZXBsYWNlKC9bXi1cXGQuXS9nLCAnJyk7XG4gICAgICB5ID0gK21hdHJpeC50b3AucmVwbGFjZSgvW14tXFxkLl0vZywgJycpO1xuICAgIH1cblxuICAgIHJldHVybiB7IHg6IHgsIHk6IHkgfTtcbiAgfSxcblxuICBzY3JvbGxUbzogZnVuY3Rpb24gKHgsIHksIHRpbWUsIGVhc2luZykge1xuICAgIGVhc2luZyA9IGVhc2luZyB8fCBlYXNpbmdzLmNpcmN1bGFyO1xuICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSB0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiB0aW1lID4gMDtcbiAgICB2YXIgdHJhbnNpdGlvblR5cGUgPSB0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiBlYXNpbmcuc3R5bGU7XG5cbiAgICBpZiAoIXRpbWUgfHwgdHJhbnNpdGlvblR5cGUpIHtcbiAgICAgIGlmICh0cmFuc2l0aW9uVHlwZSkge1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24oZWFzaW5nLnN0eWxlKTtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWUodGltZSk7XG4gICAgICB9XG4gICAgICB0aGlzLl90cmFuc2xhdGUoeCwgeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FuaW1hdGUoeCwgeSwgdGltZSwgZWFzaW5nLmZuKTtcbiAgICB9XG4gIH0sXG5cbiAgc2Nyb2xsVG9FbGVtZW50OiBmdW5jdGlvbiAoZWwsIHRpbWUsIG9mZnNldFgsIG9mZnNldFksIGVhc2luZykge1xuICAgIGVsID0gZWwubm9kZVR5cGUgPyBlbCA6IHRoaXMuc2Nyb2xsZXIucXVlcnlTZWxlY3RvcihlbCk7XG5cbiAgICAvLyBpZiBubyBlbGVtZW50IHNlbGVjdGVkLCB0aGVuIHJldHVyblxuICAgIGlmICghZWwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcG9zID0gb2Zmc2V0VXRpbHMoZWwpO1xuICB9LFxuXG4gIF90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IGZ1bmN0aW9uIChlYXNpbmdTdHlsZSkge1xuICAgIC8vIGFzc2lnbiBlYXNpbmcgY3NzIHN0eWxlIHRvIHNjcm9sbCBjb250YWluZXIgdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIHByb3BlcnR5XG4gICAgLy8gZXhhbXBsZTogY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpXG4gICAgdGhpcy5zY3JvbGxlclN0eWxlW3N0eWxlVXRpbHMudHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uXSA9IGVhc2luZ1N0eWxlO1xuICB9LFxuXG4gIF90cmFuc2l0aW9uVGltZTogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICAvLyBpZiBkbyBub3QgdXNlIHRyYW5zaXRpb24gdG8gc2Nyb2xsLCByZXR1cm5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcbiAgICAvLyB0cmFuc2l0aW9uRHVyYXRpb24gd2hpY2ggaGFzIHZlbmRvciBwcmVmaXhcbiAgICB2YXIgZHVyYXRpb25Qcm9wID0gc3R5bGVVdGlscy50cmFuc2l0aW9uRHVyYXRpb247XG4gICAgaWYgKCFkdXJhdGlvblByb3ApIHsgLy8gaWYgbm8gdmVuZG9yIGZvdW5kLCBkdXJhdGlvblByb3Agd2lsbCBiZSBmYWxzZVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gdGltZSArICdtcyc7IC8vIGFzc2lnbiBtcyB0byB0cmFuc2l0aW9uRHVyYXRpb24gcHJvcFxuXG4gICAgaWYgKCF0aW1lICYmIGlzQmFkQW5kcm9pZCkge1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSAnMC4wMDAxbXMnO1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICByQUYoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoc2VsZi5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPT09ICcwLjAwMDFtcycpIHtcbiAgICAgICAgICBzZWxmLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9ICcwcyc7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfdHJhbnNsYXRlOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgIGNvbnNvbGUubG9nKCd0cmFuc2xhdGUgbm93ISE6ICcsIHgsJyAnICwgeSk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2Zvcm0pIHtcblxuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW3N0eWxlVXRpbHMudHJhbnNmb3JtXSA9XG4gICAgICAgICd0cmFuc2xhdGUoJyArIHggKyAncHgsJyArIHkgKyAncHgpJyArICd0cmFuc2xhdGVaKDApJztcblxuICAgIH0gZWxzZSB7XG4gICAgICB4ID0gTWF0aC5yb3VuZCh4KTtcbiAgICAgIHkgPSBNYXRoLnJvdW5kKHkpO1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlLmxlZnQgPSB4ICsgJ3B4JztcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZS50b3AgPSB5ICsgJ3B4JztcbiAgICB9XG5cbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gIH0sXG5cbiAgX2FuaW1hdGU6IGZ1bmN0aW9uIChkZXN0WCwgZGVzdFksIGR1cmF0aW9uLCBlYXNpbmdGbikge1xuICAgIHZhciB0aGF0ID0gdGhpcyxcbiAgICAgIHN0YXJ0WCA9IHRoaXMueCxcbiAgICAgIHN0YXJ0WSA9IHRoaXMueSxcbiAgICAgIHN0YXJ0VGltZSA9IGdldFRpbWUoKSxcbiAgICAgIGRlc3RUaW1lID0gc3RhcnRUaW1lICsgZHVyYXRpb247XG5cbiAgICBmdW5jdGlvbiBzdGVwKCkge1xuICAgICAgdmFyIG5vdyA9IGdldFRpbWUoKSxcbiAgICAgICAgbmV3WCwgbmV3WSxcbiAgICAgICAgZWFzaW5nO1xuXG4gICAgICBpZiAobm93ID49IGRlc3RUaW1lKSB7XG4gICAgICAgIHRoYXQuaXNBbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhhdC5fdHJhbnNsYXRlKGRlc3RYLCBkZXN0WSk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBub3cgPSAobm93IC0gc3RhcnRUaW1lKSAvIGR1cmF0aW9uO1xuICAgICAgZWFzaW5nID0gZWFzaW5nRm4obm93KTtcbiAgICAgIG5ld1ggPSAoZGVzdFggLSBzdGFydFgpICogZWFzaW5nICsgc3RhcnRYO1xuICAgICAgbmV3WSA9IChkZXN0WSAtIHN0YXJ0WSkgKiBlYXNpbmcgKyBzdGFydFk7XG4gICAgICB0aGF0Ll90cmFuc2xhdGUobmV3WCwgbmV3WSk7XG5cbiAgICAgIGlmICh0aGF0LmlzQW5pbWF0aW5nKSB7XG4gICAgICAgIHJBRihzdGVwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzQW5pbWF0aW5nID0gdHJ1ZTtcbiAgICBzdGVwKCk7XG4gIH0sXG5cbiAgcmVmcmVzaDogZnVuY3Rpb24gKCkge1xuICAgIGdldFJlY3QodGhpcy53cmFwcGVyKTsgLy8gRm9yY2UgcmVmbG93XG5cbiAgICB0aGlzLndyYXBwZXJXaWR0aCA9IHRoaXMud3JhcHBlci5jbGllbnRXaWR0aDtcbiAgICB0aGlzLndyYXBwZXJIZWlnaHQgPSB0aGlzLndyYXBwZXIuY2xpZW50SGVpZ2h0O1xuXG4gICAgdmFyIHJlY3QgPSBnZXRSZWN0KHRoaXMuc2Nyb2xsZXIpO1xuXG4gICAgdGhpcy5zY3JvbGxlcldpZHRoID0gcmVjdC53aWR0aDtcbiAgICB0aGlzLnNjcm9sbGVySGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XG5cbiAgICAvKipcbiAgICAgKiB0aGlzLm1heFNjcm9sbFggb3IgdGhpcy5tYXhTY3JvbGxZIHNtYWxsZXIgdGhhbiAwLCBtZWFuaW5nXG4gICAgICogb3ZlcmZsb3cgaGFwcGVuZWQuXG4gICAgICovXG4gICAgdGhpcy5tYXhTY3JvbGxYID0gdGhpcy53cmFwcGVyV2lkdGggLSB0aGlzLnNjcm9sbGVyV2lkdGg7XG4gICAgdGhpcy5tYXhTY3JvbGxZID0gdGhpcy53cmFwcGVySGVpZ2h0IC0gdGhpcy5zY3JvbGxlckhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIG9wdGlvbiBlbmFibGVzIHNjcm9sbCBBTkQgb3ZlcmZsb3cgZXhpc3RzXG4gICAgICovXG4gICAgdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsID0gdGhpcy5vcHRpb25zLnNjcm9sbFggJiYgdGhpcy5tYXhTY3JvbGxYIDwgMDtcbiAgICB0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsID0gdGhpcy5vcHRpb25zLnNjcm9sbFkgJiYgdGhpcy5tYXhTY3JvbGxZIDwgMDtcblxuICAgIGlmICghdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsKSB7XG4gICAgICB0aGlzLm1heFNjcm9sbFggPSAwO1xuICAgICAgdGhpcy5zY3JvbGxlcldpZHRoID0gdGhpcy53cmFwcGVyV2lkdGg7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsKSB7XG4gICAgICB0aGlzLm1heFNjcm9sbFkgPSAwO1xuICAgICAgdGhpcy5zY3JvbGxlckhlaWdodCA9IHRoaXMud3JhcHBlckhlaWdodDtcbiAgICB9XG5cbiAgICB0aGlzLmVuZFRpbWUgPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWCA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25ZID0gMDtcblxuICAgIGlmIChoYXNQb2ludGVyICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVBvaW50ZXIpIHtcbiAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSA9XG4gICAgICAgIGdldFRvdWNoQWN0aW9uKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoLCB0cnVlKTtcblxuICAgICAgaWYgKCF0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0pIHtcbiAgICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dID1cbiAgICAgICAgICBnZXRUb3VjaEFjdGlvbih0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCwgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMud3JhcHBlck9mZnNldCA9IG9mZnNldFV0aWxzKHRoaXMud3JhcHBlcik7XG5cbiAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3JlZnJlc2gnKTtcblxuICAgIHRoaXMucmVzZXRQb3NpdGlvbigpO1xuICB9LFxuXG4gIHJlc2V0UG9zaXRpb246IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdmFyIHggPSB0aGlzLngsXG4gICAgICB5ID0gdGhpcy55O1xuXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcblxuICAgIGlmICghdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsIHx8IHRoaXMueCA+IDApIHtcbiAgICAgIHggPSAwO1xuICAgIH0gZWxzZSBpZiAodGhpcy54IDwgdGhpcy5tYXhTY3JvbGxYKSB7XG4gICAgICB4ID0gdGhpcy5tYXhTY3JvbGxYO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCB8fCB0aGlzLnkgPiAwKSB7XG4gICAgICB5ID0gMDtcbiAgICB9IGVsc2UgaWYgKHRoaXMueSA8IHRoaXMubWF4U2Nyb2xsWSkge1xuICAgICAgeSA9IHRoaXMubWF4U2Nyb2xsWTtcbiAgICB9XG5cbiAgICBpZiAoeCA9PT0gdGhpcy54ICYmIHkgPT09IHRoaXMueSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsVG8oeCwgeSwgdGltZSwgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBkaXNhYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGVkID0gZmFsc2U7XG4gIH0sXG5cbiAgZW5hYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGVkID0gdHJ1ZTtcbiAgfVxuXG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IElzY3JvbGw7Il0sIm5hbWVzIjpbImVhc2luZ3MiLCJrIiwiTWF0aCIsInNxcnQiLCJiIiwiZiIsImUiLCJwb3ciLCJzaW4iLCJQSSIsIl9lbGVtZW50U3R5bGUiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzdHlsZSIsIl92ZW5kb3IiLCJ2ZW5kb3JzIiwidHJhbnNmb3JtIiwiaSIsImwiLCJsZW5ndGgiLCJzdWJzdHIiLCJfcHJlZml4U3R5bGUiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsImlzQmFkQW5kcm9pZCIsImFwcFZlcnNpb24iLCJ3aW5kb3ciLCJuYXZpZ2F0b3IiLCJ0ZXN0Iiwic2FmYXJpVmVyc2lvbiIsIm1hdGNoIiwicGFyc2VGbG9hdCIsImdldFRpbWUiLCJEYXRlIiwibm93Iiwib2Zmc2V0IiwiZWwiLCJsZWZ0Iiwib2Zmc2V0TGVmdCIsInRvcCIsIm9mZnNldFRvcCIsIm9mZnNldFBhcmVudCIsImdldFJlY3QiLCJTVkdFbGVtZW50IiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsIndpZHRoIiwiaGVpZ2h0Iiwib2Zmc2V0V2lkdGgiLCJvZmZzZXRIZWlnaHQiLCJoYXNQb2ludGVyIiwiUG9pbnRlckV2ZW50IiwiTVNQb2ludGVyRXZlbnQiLCJoYXNUb3VjaCIsImdldFRvdWNoQWN0aW9uIiwiZXZlbnRQYXNzdGhyb3VnaCIsImFkZFBpbmNoIiwidG91Y2hBY3Rpb24iLCJhZGRFdmVudCIsInR5cGUiLCJmbiIsImNhcHR1cmUiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnQiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwicHJlZml4UG9pbnRlckV2ZW50IiwicG9pbnRlckV2ZW50IiwiZXZlbnRUeXBlIiwicHJldmVudERlZmF1bHRFeGNlcHRpb24iLCJleGNlcHRpb25zIiwickFGIiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwid2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwibW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwib1JlcXVlc3RBbmltYXRpb25GcmFtZSIsIm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiY2FsbGJhY2siLCJzZXRUaW1lb3V0IiwiSXNjcm9sbCIsImVsZW0iLCJvcHRpb25zIiwid3JhcHBlciIsInF1ZXJ5U2VsZWN0b3IiLCJzY3JvbGxlciIsImNoaWxkcmVuIiwic2Nyb2xsZXJTdHlsZSIsIm9ubW91c2Vkb3duIiwidGFnTmFtZSIsInNjcm9sbFkiLCJzY3JvbGxYIiwiZnJlZVNjcm9sbCIsImRpcmVjdGlvbkxvY2tUaHJlc2hvbGQiLCJib3VuY2VFYXNpbmciLCJjaXJjdWxhciIsIngiLCJ5IiwiX2luaXQiLCJyZWZyZXNoIiwic2Nyb2xsVG8iLCJzdGFydFgiLCJzdGFydFkiLCJlbmFibGUiLCJwcm90b3R5cGUiLCJfaW5pdEV2ZW50cyIsInJlbW92ZSIsInRhcmdldCIsImJpbmRUb1dyYXBwZXIiLCJjbGljayIsImRpc2FibGVNb3VzZSIsImRpc2FibGVQb2ludGVyIiwiZGlzYWJsZVRvdWNoIiwiX3N0YXJ0IiwiX21vdmUiLCJsb2ciLCJidXR0b24iLCJ3aGljaCIsImVuYWJsZWQiLCJpbml0aWF0ZWQiLCJwcmV2ZW50RGVmYXVsdCIsInBvaW50IiwidG91Y2hlcyIsInBvcyIsIm1vdmVkIiwiZGlzdFgiLCJkaXN0WSIsImRpcmVjdGlvblgiLCJkaXJlY3Rpb25ZIiwiZGlyZWN0aW9uTG9ja2VkIiwic3RhcnRUaW1lIiwidXNlVHJhbnNpdGlvbiIsImlzSW5UcmFuc2l0aW9uIiwiX3RyYW5zaXRpb25UaW1lIiwiZ2V0Q29tcHV0ZWRQb3NpdGlvbiIsIl90cmFuc2xhdGUiLCJyb3VuZCIsImlzQW5pbWF0aW5nIiwiYWJzU3RhcnRYIiwiYWJzU3RhcnRZIiwicG9pbnRYIiwicGFnZVgiLCJwb2ludFkiLCJwYWdlWSIsImRlbHRhWCIsInRpbWVzdGFtcCIsIm5ld1giLCJuZXdZIiwiYWJzRGlzdFgiLCJhYnNEaXN0WSIsImRlbHRhWSIsImFicyIsImVuZFRpbWUiLCJoYXNWZXJ0aWNhbFNjcm9sbCIsImhhc0hvcml6b250YWxTY3JvbGwiLCJtYXhTY3JvbGxYIiwiYm91bmNlIiwibWF4U2Nyb2xsWSIsIm1hdHJpeCIsImdldENvbXB1dGVkU3R5bGUiLCJ1c2VUcmFuc2Zvcm0iLCJzdHlsZVV0aWxzIiwic3BsaXQiLCJyZXBsYWNlIiwidGltZSIsImVhc2luZyIsInRyYW5zaXRpb25UeXBlIiwiX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiIsIl9hbmltYXRlIiwib2Zmc2V0WCIsIm9mZnNldFkiLCJub2RlVHlwZSIsIm9mZnNldFV0aWxzIiwiZWFzaW5nU3R5bGUiLCJ0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJkdXJhdGlvblByb3AiLCJ0cmFuc2l0aW9uRHVyYXRpb24iLCJzZWxmIiwiZGVzdFgiLCJkZXN0WSIsImR1cmF0aW9uIiwiZWFzaW5nRm4iLCJ0aGF0IiwiZGVzdFRpbWUiLCJzdGVwIiwid3JhcHBlcldpZHRoIiwiY2xpZW50V2lkdGgiLCJ3cmFwcGVySGVpZ2h0IiwiY2xpZW50SGVpZ2h0Iiwic2Nyb2xsZXJXaWR0aCIsInNjcm9sbGVySGVpZ2h0Iiwid3JhcHBlck9mZnNldCIsInJlc2V0UG9zaXRpb24iXSwibWFwcGluZ3MiOiJBQUFBLElBQUlBLFVBQVU7YUFDRDtXQUNGLHNDQURFO1FBRUwsVUFBVUMsQ0FBVixFQUFhO2FBQ1JBLEtBQUssSUFBSUEsQ0FBVCxDQUFQOztHQUpRO1lBT0Y7V0FDRCxpQ0FEQztRQUVKLFVBQVVBLENBQVYsRUFBYTthQUNSQyxLQUFLQyxJQUFMLENBQVUsSUFBSyxFQUFFRixDQUFGLEdBQU1BLENBQXJCLENBQVA7O0dBVlE7UUFhTjtXQUNHLHlDQURIO1FBRUEsVUFBVUEsQ0FBVixFQUFhO1VBQ1hHLElBQUksQ0FBUjthQUNPLENBQUNILElBQUlBLElBQUksQ0FBVCxJQUFjQSxDQUFkLElBQW1CLENBQUNHLElBQUksQ0FBTCxJQUFVSCxDQUFWLEdBQWNHLENBQWpDLElBQXNDLENBQTdDOztHQWpCUTtVQW9CSjtXQUNDLEVBREQ7UUFFRixVQUFVSCxDQUFWLEVBQWE7VUFDWCxDQUFDQSxLQUFLLENBQU4sSUFBWSxJQUFJLElBQXBCLEVBQTJC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

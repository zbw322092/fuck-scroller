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

var momentum = function (current, start, time, lowerMargin, wrapperSize, deceleration) {
  var distance = current - start,
      speed = Math.abs(distance) / time,
      destination,
      duration;

  deceleration = deceleration === undefined ? 0.0006 : deceleration;

  destination = current + speed * speed / (2 * deceleration) * (distance < 0 ? -1 : 1);
  duration = speed / deceleration;

  if (destination < lowerMargin) {
    destination = wrapperSize ? lowerMargin - wrapperSize / 2.5 * (speed / 8) : lowerMargin;
    distance = Math.abs(destination - current);
    duration = distance / speed;
  } else if (destination > 0) {
    destination = wrapperSize ? wrapperSize / 2.5 * (speed / 8) : 0;
    distance = Math.abs(current) + destination;
    duration = distance / speed;
  }

  return {
    destination: Math.round(destination),
    duration: duration
  };
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
    bounceEasing: '',
    momentum: true
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
  this.directionX = 0;
  this.directionY = 0;
  this._events = {};

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

      case 'touchend':
      case 'pointerup':
      case 'MSPointerUp':
      case 'mouseup':
      case 'touchcancel':
      case 'pointercancel':
      case 'MSPointerCancel':
      case 'mousecancel':
        this._end(e);
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

  _end: function (e) {
    if (!this.enabled || eventType[e.type] !== this.initiated) {
      return;
    }

    if (this.options.preventDefault && !preventDefaultException(e.target, this.options.preventDefaultException)) {
      e.preventDefault();
    }

    var point = e.changedTouches ? e.changedTouches[0] : e,
        momentumX,
        momentumY,
        duration = getTime() - this.startTime,
        newX = Math.round(this.x),
        newY = Math.round(this.y),
        distanceX = Math.abs(newX - this.startX),
        distanceY = Math.abs(newY - this.startY),
        time = 0,
        easing = '';

    this.isInTransition = 0;
    this.initiated = 0;
    this.endTime = getTime();

    // reset if we are outside of the boundaries
    if (this.resetPosition(this.options.bounceTime)) {
      return;
    }

    this.scrollTo(newX, newY); // ensures that the last position is rounded

    // we scrolled less than 10 pixels
    if (!this.moved) {
      if (this.options.tap) {
        // utils.tap(e, this.options.tap);
      }

      if (this.options.click) {}
      // utils.click(e);


      // this._execEvent('scrollCancel');
      return;
    }

    if (this._events.flick && duration < 200 && distanceX < 100 && distanceY < 100) {
      // this._execEvent('flick');
      return;
    }

    // start momentum animation if needed
    if (this.options.momentum && duration < 300) {
      momentumX = this.hasHorizontalScroll ? momentum(this.x, this.startX, duration, this.maxScrollX, this.options.bounce ? this.wrapperWidth : 0, this.options.deceleration) : { destination: newX, duration: 0 };
      momentumY = this.hasVerticalScroll ? momentum(this.y, this.startY, duration, this.maxScrollY, this.options.bounce ? this.wrapperHeight : 0, this.options.deceleration) : { destination: newY, duration: 0 };
      newX = momentumX.destination;
      newY = momentumY.destination;
      time = Math.max(momentumX.duration, momentumY.duration);
      this.isInTransition = 1;
    }

    if (this.options.snap) {
      // do someting
    }

    if (newX != this.x || newY != this.y) {
      // change easing function when scroller goes out of the boundaries
      if (newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY) {
        easing = easings.quadratic;
      }
      console.log('endendendend!');
      this.scrollTo(newX, newY, time, easing);
      return;
    }

    // this._execEvent('scrollEnd');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL3V0aWxzL2Vhc2luZ3MuanMiLCIuLi9zcmMvdXRpbHMvc3R5bGUuanMiLCIuLi9zcmMvdXRpbHMvaXNCYWRBbmRyb2lkLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRpbWUuanMiLCIuLi9zcmMvdXRpbHMvb2Zmc2V0LmpzIiwiLi4vc3JjL3V0aWxzL2dldFJlY3QuanMiLCIuLi9zcmMvdXRpbHMvZGV0ZWN0b3IuanMiLCIuLi9zcmMvdXRpbHMvZ2V0VG91Y2hBY3Rpb24uanMiLCIuLi9zcmMvdXRpbHMvZXZlbnRIYW5kbGVyLmpzIiwiLi4vc3JjL3V0aWxzL3ByZWZpeFBvaW50ZXJFdmVudC5qcyIsIi4uL3NyYy91dGlscy9ldmVudFR5cGUuanMiLCIuLi9zcmMvdXRpbHMvcHJldmVudERlZmF1bHRFeGNlcHRpb24uanMiLCIuLi9zcmMvdXRpbHMvbW9tZW50dW0uanMiLCIuLi9zcmMvbXktaXNjcm9sbC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZWFzaW5ncyA9IHtcbiAgcXVhZHJhdGljOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4yNSwgMC40NiwgMC40NSwgMC45NCknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIGsgKiAoMiAtIGspO1xuICAgIH1cbiAgfSxcbiAgY2lyY3VsYXI6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjEsIDAuNTcsIDAuMSwgMSknLFx0Ly8gTm90IHByb3Blcmx5IFwiY2lyY3VsYXJcIiBidXQgdGhpcyBsb29rcyBiZXR0ZXIsIGl0IHNob3VsZCBiZSAoMC4wNzUsIDAuODIsIDAuMTY1LCAxKVxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIE1hdGguc3FydCgxIC0gKC0tayAqIGspKTtcbiAgICB9XG4gIH0sXG4gIGJhY2s6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjE3NSwgMC44ODUsIDAuMzIsIDEuMjc1KScsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICB2YXIgYiA9IDQ7XG4gICAgICByZXR1cm4gKGsgPSBrIC0gMSkgKiBrICogKChiICsgMSkgKiBrICsgYikgKyAxO1xuICAgIH1cbiAgfSxcbiAgYm91bmNlOiB7XG4gICAgc3R5bGU6ICcnLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgaWYgKChrIC89IDEpIDwgKDEgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogayAqIGs7XG4gICAgICB9IGVsc2UgaWYgKGsgPCAoMiAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMS41IC8gMi43NSkpICogayArIDAuNzU7XG4gICAgICB9IGVsc2UgaWYgKGsgPCAoMi41IC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjI1IC8gMi43NSkpICogayArIDAuOTM3NTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi42MjUgLyAyLjc1KSkgKiBrICsgMC45ODQzNzU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBlbGFzdGljOiB7XG4gICAgc3R5bGU6ICcnLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGYgPSAwLjIyLFxuICAgICAgICBlID0gMC40O1xuXG4gICAgICBpZiAoayA9PT0gMCkgeyByZXR1cm4gMDsgfVxuICAgICAgaWYgKGsgPT0gMSkgeyByZXR1cm4gMTsgfVxuXG4gICAgICByZXR1cm4gKGUgKiBNYXRoLnBvdygyLCAtIDEwICogaykgKiBNYXRoLnNpbigoayAtIGYgLyA0KSAqICgyICogTWF0aC5QSSkgLyBmKSArIDEpO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgZWFzaW5nczsiLCJ2YXIgX2VsZW1lbnRTdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlO1xuXG52YXIgX3ZlbmRvciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciB2ZW5kb3JzID0gWyd0JywgJ3dlYmtpdFQnLCAnTW96VCcsICdtc1QnLCAnT1QnXSxcbiAgICB0cmFuc2Zvcm0sXG4gICAgaSA9IDAsXG4gICAgbCA9IHZlbmRvcnMubGVuZ3RoO1xuXG4gIHdoaWxlIChpIDwgbCkge1xuICAgIHRyYW5zZm9ybSA9IHZlbmRvcnNbaV0gKyAncmFuc2Zvcm0nO1xuICAgIGlmICh0cmFuc2Zvcm0gaW4gX2VsZW1lbnRTdHlsZSkge1xuICAgICAgcmV0dXJuIHZlbmRvcnNbaV0uc3Vic3RyKDAsIHZlbmRvcnNbaV0ubGVuZ3RoIC0gMSk7XG4gICAgfVxuICAgIGkrKztcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn0pKCk7XG5cbmZ1bmN0aW9uIF9wcmVmaXhTdHlsZSAoc3R5bGUpIHtcbiAgaWYgKCBfdmVuZG9yID09PSBmYWxzZSApIHJldHVybiBmYWxzZTsgLy8gbm8gdmVuZG9yIGZvdW5kXG4gIGlmICggX3ZlbmRvciA9PT0gJycgKSByZXR1cm4gc3R5bGU7IC8vIG5vIHByZWZpeCBuZWVkZWRcbiAgcmV0dXJuIF92ZW5kb3IgKyBzdHlsZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0eWxlLnN1YnN0cigxKTsgLy8gb3RoZXJ3aXNlIGFkZCBwcmVmaXhcbn1cblxuLy8gc3R5bGUgdGhhdCBoYXMgdmVuZG9yIHByZWZpeCwgZWc6IHdlYmtpdFRyYW5zZm9ybVxudmFyIHN0eWxlID0ge1xuICB0cmFuc2Zvcm06IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtJyksXG4gIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24nKSxcbiAgdHJhbnNpdGlvbkR1cmF0aW9uOiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EdXJhdGlvbicpLFxuICB0cmFuc2l0aW9uRGVsYXk6IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvbkRlbGF5JyksXG4gIHRyYW5zZm9ybU9yaWdpbjogX3ByZWZpeFN0eWxlKCd0cmFuc2Zvcm1PcmlnaW4nKSxcbiAgdG91Y2hBY3Rpb246IF9wcmVmaXhTdHlsZSgndG91Y2hBY3Rpb24nKVxufTtcblxuZXhwb3J0IGRlZmF1bHQgc3R5bGU7IiwidmFyIGlzQmFkQW5kcm9pZCA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBhcHBWZXJzaW9uID0gd2luZG93Lm5hdmlnYXRvci5hcHBWZXJzaW9uO1xuXG4gIGlmICgvQW5kcm9pZC8udGVzdChhcHBWZXJzaW9uKSAmJiAhKC9DaHJvbWVcXC9cXGQvLnRlc3QoYXBwVmVyc2lvbikpKSB7XG4gICAgdmFyIHNhZmFyaVZlcnNpb24gPSBhcHBWZXJzaW9uLm1hdGNoKC9TYWZhcmlcXC8oXFxkKy5cXGQpLyk7XG4gICAgaWYoc2FmYXJpVmVyc2lvbiAmJiB0eXBlb2Ygc2FmYXJpVmVyc2lvbiA9PT0gXCJvYmplY3RcIiAmJiBzYWZhcmlWZXJzaW9uLmxlbmd0aCA+PSAyKSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdChzYWZhcmlWZXJzaW9uWzFdKSA8IDUzNS4xOTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSkoKTtcblxuZXhwb3J0IGRlZmF1bHQgaXNCYWRBbmRyb2lkOyIsIi8qKlxuICogMS4gRGF0ZS5wcm90b3R5cGUuZ2V0VGltZSBoYXMgQkVUVEVSIGNvbXBhdGliaWxpdHkgdGhhbiBEYXRlLm5vd1xuICogcmVmZXJlbmNlOiBcbiAqICBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9EYXRlL2dldFRpbWUjQnJvd3Nlcl9jb21wYXRpYmlsaXR5XG4gKiAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9ub3cjQnJvd3Nlcl9jb21wYXRpYmlsaXR5XG4gKiBcbiAqIDIuIERhdGUucHJvdG90eXBlLmdldFRpbWUgc3BlZWQgaXMgU0xPV1NFUiB0aGFuIERhdGUubm93XG4gKiByZWZlcmVuY2U6XG4gKiAgaHR0cHM6Ly9qc3BlcmYuY29tL2RhdGUtbm93LXZzLWRhdGUtZ2V0dGltZS83XG4gKi9cblxudmFyIGdldFRpbWUgPSBEYXRlLm5vdyB8fFxuICBmdW5jdGlvbiBnZXRUaW1lKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfTtcblxuZXhwb3J0IGRlZmF1bHQgZ2V0VGltZTsiLCJ2YXIgb2Zmc2V0ID0gZnVuY3Rpb24gKGVsKSB7XG4gIHZhciBsZWZ0ID0gLWVsLm9mZnNldExlZnQsXG4gIHRvcCA9IC1lbC5vZmZzZXRUb3A7XG5cbiAgLyoqXG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9IVE1MRWxlbWVudC9vZmZzZXRQYXJlbnRcbiAgICogUmV0dXJucyBudWxsIHdoZW4gdGhlIGVsZW1lbnQgaGFzIHN0eWxlLmRpc3BsYXkgc2V0IHRvIFwibm9uZVwiLiBUaGUgb2Zmc2V0UGFyZW50IFxuICAgKiBpcyB1c2VmdWwgYmVjYXVzZSBvZmZzZXRUb3AgYW5kIG9mZnNldExlZnQgYXJlIHJlbGF0aXZlIHRvIGl0cyBwYWRkaW5nIGVkZ2UuXG4gICAqL1xuICB3aGlsZSAoZWwgPSBlbC5vZmZzZXRQYXJlbnQpIHtcbiAgICBsZWZ0IC09IGVsLm9mZnNldExlZnQ7XG4gICAgdG9wIC09IGVsLm9mZnNldFRvcDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbGVmdDogbGVmdCxcbiAgICB0b3A6IHRvcFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBvZmZzZXQ7IiwiZnVuY3Rpb24gZ2V0UmVjdChlbCkge1xuICBpZiAoZWwgaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB7XG4gICAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIHJldHVybiB7XG4gICAgICB0b3AgOiByZWN0LnRvcCxcbiAgICAgIGxlZnQgOiByZWN0LmxlZnQsXG4gICAgICB3aWR0aCA6IHJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQgOiByZWN0LmhlaWdodFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgdG9wIDogZWwub2Zmc2V0VG9wLFxuICAgICAgbGVmdCA6IGVsLm9mZnNldExlZnQsXG4gICAgICB3aWR0aCA6IGVsLm9mZnNldFdpZHRoLFxuICAgICAgaGVpZ2h0IDogZWwub2Zmc2V0SGVpZ2h0XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRSZWN0OyIsInZhciBoYXNQb2ludGVyID0gISEod2luZG93LlBvaW50ZXJFdmVudCB8fCB3aW5kb3cuTVNQb2ludGVyRXZlbnQpOyAvLyBJRTEwIGlzIHByZWZpeGVkXG52YXIgaGFzVG91Y2ggPSAnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3c7XG5cbmV4cG9ydCB7XG4gIGhhc1BvaW50ZXIsXG4gIGhhc1RvdWNoXG59IiwidmFyIGdldFRvdWNoQWN0aW9uID0gZnVuY3Rpb24gKGV2ZW50UGFzc3Rocm91Z2gsIGFkZFBpbmNoKSB7XG4gIHZhciB0b3VjaEFjdGlvbiA9ICdub25lJztcbiAgaWYgKGV2ZW50UGFzc3Rocm91Z2ggPT09ICd2ZXJ0aWNhbCcpIHtcbiAgICB0b3VjaEFjdGlvbiA9ICdwYW4teSc7XG4gIH0gZWxzZSBpZiAoZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ2hvcml6b250YWwnKSB7XG4gICAgdG91Y2hBY3Rpb24gPSAncGFuLXgnO1xuICB9XG5cbiAgaWYgKGFkZFBpbmNoICYmIHRvdWNoQWN0aW9uICE9ICdub25lJykge1xuICAgIC8vIGFkZCBwaW5jaC16b29tIHN1cHBvcnQgaWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgaXQsIGJ1dCBpZiBub3QgKGVnLiBDaHJvbWUgPDU1KSBkbyBub3RoaW5nXG4gICAgdG91Y2hBY3Rpb24gKz0gJyBwaW5jaC16b29tJztcbiAgfVxuICByZXR1cm4gdG91Y2hBY3Rpb247XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdldFRvdWNoQWN0aW9uOyIsImZ1bmN0aW9uIGFkZEV2ZW50IChlbCwgdHlwZSwgZm4sIGNhcHR1cmUpIHtcbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgISFjYXB0dXJlKTtcbn07XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50IChlbCwgdHlwZSwgZm4sIGNhcHR1cmUpIHtcbiAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgISFjYXB0dXJlKTtcbn1cblxuZXhwb3J0IHtcbiAgYWRkRXZlbnQsXG4gIHJlbW92ZUV2ZW50XG59OyIsImZ1bmN0aW9uIHByZWZpeFBvaW50ZXJFdmVudCAocG9pbnRlckV2ZW50KSB7XG4gIHJldHVybiB3aW5kb3cuTVNQb2ludGVyRXZlbnQgPyBcbiAgICAnTVNQb2ludGVyJyArIHBvaW50ZXJFdmVudC5jaGFyQXQoNykudG9VcHBlckNhc2UoKSArIHBvaW50ZXJFdmVudC5zdWJzdHIoOCkgOlxuICAgIHBvaW50ZXJFdmVudDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgcHJlZml4UG9pbnRlckV2ZW50OyIsInZhciBldmVudFR5cGUgPSB7XG4gIHRvdWNoc3RhcnQ6IDEsXG4gIHRvdWNobW92ZTogMSxcbiAgdG91Y2hlbmQ6IDEsXG5cbiAgbW91c2Vkb3duOiAyLFxuICBtb3VzZW1vdmU6IDIsXG4gIG1vdXNldXA6IDIsXG5cbiAgcG9pbnRlcmRvd246IDMsXG4gIHBvaW50ZXJtb3ZlOiAzLFxuICBwb2ludGVydXA6IDMsXG5cbiAgTVNQb2ludGVyRG93bjogMyxcbiAgTVNQb2ludGVyTW92ZTogMyxcbiAgTVNQb2ludGVyVXA6IDNcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGV2ZW50VHlwZTsiLCJ2YXIgcHJldmVudERlZmF1bHRFeGNlcHRpb24gPSBmdW5jdGlvbiAoZWwsIGV4Y2VwdGlvbnMpIHtcbiAgZm9yICh2YXIgaSBpbiBleGNlcHRpb25zKSB7XG4gICAgaWYgKCBleGNlcHRpb25zW2ldLnRlc3QoZWxbaV0pICkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgcHJldmVudERlZmF1bHRFeGNlcHRpb247IiwidmFyIG1vbWVudHVtID0gZnVuY3Rpb24gKGN1cnJlbnQsIHN0YXJ0LCB0aW1lLCBsb3dlck1hcmdpbiwgd3JhcHBlclNpemUsIGRlY2VsZXJhdGlvbikge1xuICB2YXIgZGlzdGFuY2UgPSBjdXJyZW50IC0gc3RhcnQsXG4gICAgc3BlZWQgPSBNYXRoLmFicyhkaXN0YW5jZSkgLyB0aW1lLFxuICAgIGRlc3RpbmF0aW9uLFxuICAgIGR1cmF0aW9uO1xuXG4gIGRlY2VsZXJhdGlvbiA9IGRlY2VsZXJhdGlvbiA9PT0gdW5kZWZpbmVkID8gMC4wMDA2IDogZGVjZWxlcmF0aW9uO1xuXG4gIGRlc3RpbmF0aW9uID0gY3VycmVudCArICggc3BlZWQgKiBzcGVlZCApIC8gKCAyICogZGVjZWxlcmF0aW9uICkgKiAoIGRpc3RhbmNlIDwgMCA/IC0xIDogMSApO1xuICBkdXJhdGlvbiA9IHNwZWVkIC8gZGVjZWxlcmF0aW9uO1xuXG4gIGlmICggZGVzdGluYXRpb24gPCBsb3dlck1hcmdpbiApIHtcbiAgICBkZXN0aW5hdGlvbiA9IHdyYXBwZXJTaXplID8gbG93ZXJNYXJnaW4gLSAoIHdyYXBwZXJTaXplIC8gMi41ICogKCBzcGVlZCAvIDggKSApIDogbG93ZXJNYXJnaW47XG4gICAgZGlzdGFuY2UgPSBNYXRoLmFicyhkZXN0aW5hdGlvbiAtIGN1cnJlbnQpO1xuICAgIGR1cmF0aW9uID0gZGlzdGFuY2UgLyBzcGVlZDtcbiAgfSBlbHNlIGlmICggZGVzdGluYXRpb24gPiAwICkge1xuICAgIGRlc3RpbmF0aW9uID0gd3JhcHBlclNpemUgPyB3cmFwcGVyU2l6ZSAvIDIuNSAqICggc3BlZWQgLyA4ICkgOiAwO1xuICAgIGRpc3RhbmNlID0gTWF0aC5hYnMoY3VycmVudCkgKyBkZXN0aW5hdGlvbjtcbiAgICBkdXJhdGlvbiA9IGRpc3RhbmNlIC8gc3BlZWQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGRlc3RpbmF0aW9uOiBNYXRoLnJvdW5kKGRlc3RpbmF0aW9uKSxcbiAgICBkdXJhdGlvbjogZHVyYXRpb25cbiAgfTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgbW9tZW50dW07IiwiaW1wb3J0IGVhc2luZ3MgZnJvbSAnLi91dGlscy9lYXNpbmdzJztcbmltcG9ydCBzdHlsZVV0aWxzIGZyb20gJy4vdXRpbHMvc3R5bGUnO1xuaW1wb3J0IGlzQmFkQW5kcm9pZCBmcm9tICcuL3V0aWxzL2lzQmFkQW5kcm9pZCc7XG5pbXBvcnQgZ2V0VGltZSBmcm9tICcuL3V0aWxzL2dldFRpbWUnO1xuaW1wb3J0IG9mZnNldFV0aWxzIGZyb20gJy4vdXRpbHMvb2Zmc2V0JztcbmltcG9ydCBnZXRSZWN0IGZyb20gJy4vdXRpbHMvZ2V0UmVjdCc7XG5pbXBvcnQgeyBoYXNQb2ludGVyLCBoYXNUb3VjaCB9IGZyb20gJy4vdXRpbHMvZGV0ZWN0b3InO1xuaW1wb3J0IGdldFRvdWNoQWN0aW9uIGZyb20gJy4vdXRpbHMvZ2V0VG91Y2hBY3Rpb24nO1xuaW1wb3J0IHsgYWRkRXZlbnQsIHJlbW92ZUV2ZW50IH0gZnJvbSAnLi91dGlscy9ldmVudEhhbmRsZXInO1xuaW1wb3J0IHByZWZpeFBvaW50ZXJFdmVudCBmcm9tICcuL3V0aWxzL3ByZWZpeFBvaW50ZXJFdmVudCc7XG5pbXBvcnQgZXZlbnRUeXBlIGZyb20gJy4vdXRpbHMvZXZlbnRUeXBlJztcbmltcG9ydCBwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbiBmcm9tICcuL3V0aWxzL3ByZXZlbnREZWZhdWx0RXhjZXB0aW9uJztcbmltcG9ydCBtb21lbnR1bSBmcm9tICcuL3V0aWxzL21vbWVudHVtJztcblxuLy8gZGVhbCB3aXRoIHJlcXVlc3RBbmltYXRpb25GcmFtZSBjb21wYXRiaWxpdHlcbnZhciByQUYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7IHdpbmRvdy5zZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApOyB9O1xuXG5mdW5jdGlvbiBJc2Nyb2xsKGVsZW0sIG9wdGlvbnMpIHtcbiAgLyoqXG4gICAqIGdldCBzY3JvbGwgbm9kZSBlbGVtZW50XG4gICAqL1xuICB0aGlzLndyYXBwZXIgPSB0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pIDogZWxlbTtcbiAgdGhpcy5zY3JvbGxlciA9IHRoaXMud3JhcHBlci5jaGlsZHJlblswXTtcbiAgdGhpcy5zY3JvbGxlclN0eWxlID0gdGhpcy5zY3JvbGxlci5zdHlsZTtcblxuICAvKipcbiAgICogbWVyZ2UgZGVmYXVsdCBvcHRpb25zIGFuZCBjdXN0b21pemVkIG9wdGlvbnNcbiAgICovXG4gIHRoaXMub3B0aW9ucyA9IHtcbiAgICBkaXNhYmxlUG9pbnRlcjogIWhhc1BvaW50ZXIsXG4gICAgZGlzYWJsZVRvdWNoOiBoYXNQb2ludGVyIHx8ICFoYXNUb3VjaCxcbiAgICBkaXNhYmxlTW91c2U6IGhhc1BvaW50ZXIgfHwgIWhhc1RvdWNoLFxuICAgIHVzZVRyYW5zaXRpb246IHRydWUsXG4gICAgdXNlVHJhbnNmb3JtOiB0cnVlLFxuICAgIHNjcm9sbFk6IHRydWUsXG4gICAgc3RhcnRYOiAwLFxuICAgIHN0YXJ0WTogMCxcbiAgICBiaW5kVG9XcmFwcGVyOiB0eXBlb2Ygd2luZG93Lm9ubW91c2Vkb3duID09PSBcInVuZGVmaW5lZFwiLFxuICAgIHByZXZlbnREZWZhdWx0OiB0cnVlLFxuICAgIHByZXZlbnREZWZhdWx0RXhjZXB0aW9uOiB7IHRhZ05hbWU6IC9eKElOUFVUfFRFWFRBUkVBfEJVVFRPTnxTRUxFQ1QpJC8gfSxcbiAgICBkaXJlY3Rpb25Mb2NrVGhyZXNob2xkOiA1LFxuICAgIGJvdW5jZTogdHJ1ZSxcbiAgICBib3VuY2VUaW1lOiA2MDAsXG4gICAgYm91bmNlRWFzaW5nOiAnJyxcbiAgICBtb21lbnR1bTogdHJ1ZVxuICB9O1xuXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9uc1tpXSA9IG9wdGlvbnNbaV07XG4gIH1cblxuICB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSB0cnVlID8gJ3ZlcnRpY2FsJyA6IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoO1xuXG4gIC8vIElmIHlvdSB3YW50IGV2ZW50UGFzc3Rocm91Z2ggSSBoYXZlIHRvIGxvY2sgb25lIG9mIHRoZSBheGVzXG4gIHRoaXMub3B0aW9ucy5zY3JvbGxZID0gdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT09ICd2ZXJ0aWNhbCcgPyBmYWxzZSA6IHRoaXMub3B0aW9ucy5zY3JvbGxZO1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSAnaG9yaXpvbnRhbCcgPyBmYWxzZSA6IHRoaXMub3B0aW9ucy5zY3JvbGxYO1xuXG4gIHRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsID0gdGhpcy5vcHRpb25zLmZyZWVTY3JvbGwgJiYgIXRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoO1xuICB0aGlzLm9wdGlvbnMuZGlyZWN0aW9uTG9ja1RocmVzaG9sZCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID8gMCA6IHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkO1xuXG4gIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcgPSB0eXBlb2YgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyA9PSAnc3RyaW5nJyA/XG4gICAgZWFzaW5nc1t0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nXSB8fCBlYXNpbmdzLmNpcmN1bGFyIDpcbiAgICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nO1xuXG4gIHRoaXMueCA9IDA7XG4gIHRoaXMueSA9IDA7XG5cdHRoaXMuZGlyZWN0aW9uWCA9IDA7XG5cdHRoaXMuZGlyZWN0aW9uWSA9IDA7XG5cdHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIHRoaXMuX2luaXQoKTtcbiAgdGhpcy5yZWZyZXNoKCk7XG4gIHRoaXMuc2Nyb2xsVG8odGhpcy5vcHRpb25zLnN0YXJ0WCwgdGhpcy5vcHRpb25zLnN0YXJ0WSk7XG4gIHRoaXMuZW5hYmxlKCk7XG59XG5cbklzY3JvbGwucHJvdG90eXBlID0ge1xuXG4gIF9pbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faW5pdEV2ZW50cygpO1xuICB9LFxuXG4gIF9pbml0RXZlbnRzOiBmdW5jdGlvbiAocmVtb3ZlKSB7XG4gICAgdmFyIGV2ZW50VHlwZSA9IHJlbW92ZSA/IHJlbW92ZUV2ZW50IDogYWRkRXZlbnQsXG4gICAgICB0YXJnZXQgPSB0aGlzLm9wdGlvbnMuYmluZFRvV3JhcHBlciA/IHRoaXMud3JhcHBlciA6IHdpbmRvdztcblxuICAgIGV2ZW50VHlwZSh3aW5kb3csICdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh3aW5kb3csICdyZXNpemUnLCB0aGlzKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2spIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsICdjbGljaycsIHRoaXMsIHRydWUpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVNb3VzZSkge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ21vdXNlZG93bicsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNlbW92ZScsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNlY2FuY2VsJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAnbW91c2V1cCcsIHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChoYXNQb2ludGVyICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVBvaW50ZXIpIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsIHByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcmRvd24nKSwgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJtb3ZlJyksIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVyY2FuY2VsJyksIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVydXAnKSwgdGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKGhhc1RvdWNoICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVRvdWNoKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCAndG91Y2hzdGFydCcsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ3RvdWNobW92ZScsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ3RvdWNoY2FuY2VsJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAndG91Y2hlbmQnLCB0aGlzKTtcbiAgICB9XG5cbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ3RyYW5zaXRpb25lbmQnLCB0aGlzKTtcbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ3dlYmtpdFRyYW5zaXRpb25FbmQnLCB0aGlzKTtcbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ29UcmFuc2l0aW9uRW5kJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICdNU1RyYW5zaXRpb25FbmQnLCB0aGlzKTtcbiAgfSxcblxuICBoYW5kbGVFdmVudDogZnVuY3Rpb24gKGUpIHtcbiAgICBzd2l0Y2ggKGUudHlwZSkge1xuICAgICAgY2FzZSAndG91Y2hzdGFydCc6XG4gICAgICBjYXNlICdwb2ludGVyZG93bic6XG4gICAgICBjYXNlICdNU1BvaW50ZXJEb3duJzpcbiAgICAgIGNhc2UgJ21vdXNlZG93bic6XG4gICAgICAgIHRoaXMuX3N0YXJ0KGUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndG91Y2htb3ZlJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJtb3ZlJzpcbiAgICAgIGNhc2UgJ01TUG9pbnRlck1vdmUnOlxuICAgICAgY2FzZSAnbW91c2Vtb3ZlJzpcbiAgICAgICAgdGhpcy5fbW92ZShlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3RvdWNoZW5kJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJ1cCc6XG4gICAgICBjYXNlICdNU1BvaW50ZXJVcCc6XG4gICAgICBjYXNlICdtb3VzZXVwJzpcbiAgICAgIGNhc2UgJ3RvdWNoY2FuY2VsJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJjYW5jZWwnOlxuICAgICAgY2FzZSAnTVNQb2ludGVyQ2FuY2VsJzpcbiAgICAgIGNhc2UgJ21vdXNlY2FuY2VsJzpcbiAgICAgICAgdGhpcy5fZW5kKGUpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH0sXG5cbiAgX3N0YXJ0OiBmdW5jdGlvbiAoZSkge1xuICAgIGNvbnNvbGUubG9nKGUudHlwZSk7XG4gICAgLy8gUmVhY3QgdG8gbGVmdCBtb3VzZSBidXR0b24gb25seVxuICAgIGlmIChldmVudFR5cGVbZS50eXBlXSAhPT0gMSkgeyAvLyBub3QgdG91Y2ggZXZlbnRcbiAgICAgIHZhciBidXR0b247XG4gICAgICBpZiAoIWUud2hpY2gpIHtcbiAgICAgICAgLyogSUUgY2FzZSAqL1xuICAgICAgICBidXR0b24gPSAoZS5idXR0b24gPCAyKSA/IDAgOlxuICAgICAgICAgICgoZS5idXR0b24gPT0gNCkgPyAxIDogMik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvKiBBbGwgb3RoZXJzICovXG4gICAgICAgIGJ1dHRvbiA9IGUuYnV0dG9uO1xuICAgICAgfVxuXG4gICAgICAvLyBub3QgbGVmdCBtb3VzZSBidXR0b25cbiAgICAgIGlmIChidXR0b24gIT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdGhpcy5lbmFibGVkIHx8ICh0aGlzLmluaXRpYXRlZCAmJiBldmVudFR5cGVbZS50eXBlXSAhPT0gdGhpcy5pbml0aWF0ZWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdCAmJiAhaXNCYWRBbmRyb2lkICYmICFwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbihlLnRhcmdldCwgdGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0RXhjZXB0aW9uKSkge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIHZhciBwb2ludCA9IGUudG91Y2hlcyA/IGUudG91Y2hlc1swXSA6IGUsXG4gICAgICBwb3M7XG5cbiAgICB0aGlzLmluaXRpYXRlZCA9IGV2ZW50VHlwZVtlLnR5cGVdO1xuICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmRpc3RYID0gMDtcbiAgICB0aGlzLmRpc3RZID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblggPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAwO1xuXG4gICAgdGhpcy5zdGFydFRpbWUgPSBnZXRUaW1lKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgdGhpcy5pc0luVHJhbnNpdGlvbikge1xuICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWUoKTtcbiAgICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSBmYWxzZTtcbiAgICAgIHBvcyA9IHRoaXMuZ2V0Q29tcHV0ZWRQb3NpdGlvbigpO1xuICAgICAgdGhpcy5fdHJhbnNsYXRlKE1hdGgucm91bmQocG9zLngpLCBNYXRoLnJvdW5kKHBvcy55KSk7XG4gICAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRoaXMuaXNBbmltYXRpbmcpIHtcbiAgICAgIHRoaXMuaXNBbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsRW5kJyk7XG4gICAgfVxuXG4gICAgdGhpcy5zdGFydFggPSB0aGlzLng7XG4gICAgdGhpcy5zdGFydFkgPSB0aGlzLnk7XG4gICAgdGhpcy5hYnNTdGFydFggPSB0aGlzLng7XG4gICAgdGhpcy5hYnNTdGFydFkgPSB0aGlzLnk7XG4gICAgdGhpcy5wb2ludFggPSBwb2ludC5wYWdlWDtcbiAgICB0aGlzLnBvaW50WSA9IHBvaW50LnBhZ2VZO1xuXG4gICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdiZWZvcmVTY3JvbGxTdGFydCcpO1xuICB9LFxuXG4gIF9tb3ZlOiBmdW5jdGlvbiAoZSkge1xuICAgIGlmICghdGhpcy5lbmFibGVkIHx8IGV2ZW50VHlwZVtlLnR5cGVdICE9PSB0aGlzLmluaXRpYXRlZCkge1xuICAgICAgY29uc29sZS5sb2coMTExKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0KSB7XHQvLyBpbmNyZWFzZXMgcGVyZm9ybWFuY2Ugb24gQW5kcm9pZD8gVE9ETzogY2hlY2shXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgdmFyIHBvaW50ID0gZS50b3VjaGVzID8gZS50b3VjaGVzWzBdIDogZSxcbiAgICAgIGRlbHRhWCA9IHBvaW50LnBhZ2VYIC0gdGhpcy5wb2ludFgsIC8vIHRoZSBtb3ZlZCBkaXN0YW5jZVxuICAgICAgZGVsdGFZID0gcG9pbnQucGFnZVkgLSB0aGlzLnBvaW50WSxcbiAgICAgIHRpbWVzdGFtcCA9IGdldFRpbWUoKSxcbiAgICAgIG5ld1gsIG5ld1ksXG4gICAgICBhYnNEaXN0WCwgYWJzRGlzdFk7XG5cbiAgICB0aGlzLnBvaW50WCA9IHBvaW50LnBhZ2VYO1xuICAgIHRoaXMucG9pbnRZID0gcG9pbnQucGFnZVk7XG5cbiAgICB0aGlzLmRpc3RYICs9IGRlbHRhWDtcbiAgICB0aGlzLmRpc3RZICs9IGRlbHRhWTtcbiAgICBhYnNEaXN0WCA9IE1hdGguYWJzKHRoaXMuZGlzdFgpOyAvLyBhYnNvbHV0ZSBtb3ZlZCBkaXN0YW5jZVxuICAgIGFic0Rpc3RZID0gTWF0aC5hYnModGhpcy5kaXN0WSk7XG5cbiAgICAvKipcbiAgICAgKiAgV2UgbmVlZCB0byBtb3ZlIGF0IGxlYXN0IDEwIHBpeGVscyBmb3IgdGhlIHNjcm9sbGluZyB0byBpbml0aWF0ZVxuICAgICAqICB0aGlzLmVuZFRpbWUgaXMgaW5pdGlhdGVkIGluIHRoaXMucHJvdG90eXBlLnJlZnJlc2ggbWV0aG9kXG4gICAgICovXG4gICAgaWYgKHRpbWVzdGFtcCAtIHRoaXMuZW5kVGltZSA+IDMwMCAmJiAoYWJzRGlzdFggPCAxMCAmJiBhYnNEaXN0WSA8IDEwKSkge1xuICAgICAgY29uc29sZS5sb2coMjIyKVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHlvdSBhcmUgc2Nyb2xsaW5nIGluIG9uZSBkaXJlY3Rpb24gbG9jayB0aGUgb3RoZXJcbiAgICBpZiAoIXRoaXMuZGlyZWN0aW9uTG9ja2VkICYmICF0aGlzLm9wdGlvbnMuZnJlZVNjcm9sbCkge1xuXG4gICAgICBpZiAoYWJzRGlzdFggPiBhYnNEaXN0WSArIHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ2gnO1x0XHQvLyBsb2NrIGhvcml6b250YWxseVxuICAgICAgfSBlbHNlIGlmIChhYnNEaXN0WSA+PSBhYnNEaXN0WCArIHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ3YnO1x0XHQvLyBsb2NrIHZlcnRpY2FsbHlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ24nO1x0XHQvLyBubyBsb2NrXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICBpZiAodGhpcy5kaXJlY3Rpb25Mb2NrZWQgPT0gJ2gnKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ3ZlcnRpY2FsJykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICdob3Jpem9udGFsJykge1xuICAgICAgICB0aGlzLmluaXRpYXRlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGRlbHRhWSA9IDA7XG4gICAgfSBlbHNlIGlmICh0aGlzLmRpcmVjdGlvbkxvY2tlZCA9PSAndicpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAnaG9yaXpvbnRhbCcpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAndmVydGljYWwnKSB7XG4gICAgICAgIHRoaXMuaW5pdGlhdGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZGVsdGFYID0gMDtcbiAgICB9XG4gICAgY29uc29sZS5sb2codGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCwgZGVsdGFZKTtcbiAgICBkZWx0YVggPSB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPyBkZWx0YVggOiAwO1xuICAgIGRlbHRhWSA9IHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPyBkZWx0YVkgOiAwO1xuXG4gICAgbmV3WCA9IHRoaXMueCArIGRlbHRhWDtcbiAgICBuZXdZID0gdGhpcy55ICsgZGVsdGFZO1xuXG4gICAgLy8gU2xvdyBkb3duIGlmIG91dHNpZGUgb2YgdGhlIGJvdW5kYXJpZXNcbiAgICBpZiAobmV3WCA+IDAgfHwgbmV3WCA8IHRoaXMubWF4U2Nyb2xsWCkge1xuICAgICAgbmV3WCA9IHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLnggKyBkZWx0YVggLyAzIDogbmV3WCA+IDAgPyAwIDogdGhpcy5tYXhTY3JvbGxYO1xuICAgIH1cbiAgICBpZiAobmV3WSA+IDAgfHwgbmV3WSA8IHRoaXMubWF4U2Nyb2xsWSkge1xuICAgICAgbmV3WSA9IHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLnkgKyBkZWx0YVkgLyAzIDogbmV3WSA+IDAgPyAwIDogdGhpcy5tYXhTY3JvbGxZO1xuICAgIH1cblxuICAgIHRoaXMuZGlyZWN0aW9uWCA9IGRlbHRhWCA+IDAgPyAtMSA6IGRlbHRhWCA8IDAgPyAxIDogMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSBkZWx0YVkgPiAwID8gLTEgOiBkZWx0YVkgPCAwID8gMSA6IDA7XG5cbiAgICBpZiAoIXRoaXMubW92ZWQpIHtcbiAgICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsU3RhcnQnKTtcbiAgICB9XG5cbiAgICB0aGlzLm1vdmVkID0gdHJ1ZTtcblxuICAgIHRoaXMuX3RyYW5zbGF0ZShuZXdYLCBuZXdZKTtcblxuICAgIGlmICh0aW1lc3RhbXAgLSB0aGlzLnN0YXJ0VGltZSA+IDMwMCkge1xuICAgICAgdGhpcy5zdGFydFRpbWUgPSB0aW1lc3RhbXA7XG4gICAgICB0aGlzLnN0YXJ0WCA9IHRoaXMueDtcbiAgICAgIHRoaXMuc3RhcnRZID0gdGhpcy55O1xuICAgIH1cbiAgfSxcblxuICBfZW5kOiBmdW5jdGlvbiAoZSkge1xuXHRcdGlmICggIXRoaXMuZW5hYmxlZCB8fCBldmVudFR5cGVbZS50eXBlXSAhPT0gdGhpcy5pbml0aWF0ZWQgKSB7XG5cdFx0XHRyZXR1cm47XG4gICAgfVxuICAgIFxuXHRcdGlmICggdGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0ICYmICFwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbihlLnRhcmdldCwgdGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0RXhjZXB0aW9uKSApIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAgXG5cdFx0dmFyIHBvaW50ID0gZS5jaGFuZ2VkVG91Y2hlcyA/IGUuY2hhbmdlZFRvdWNoZXNbMF0gOiBlLFxuICAgIG1vbWVudHVtWCxcbiAgICBtb21lbnR1bVksXG4gICAgZHVyYXRpb24gPSBnZXRUaW1lKCkgLSB0aGlzLnN0YXJ0VGltZSxcbiAgICBuZXdYID0gTWF0aC5yb3VuZCh0aGlzLngpLFxuICAgIG5ld1kgPSBNYXRoLnJvdW5kKHRoaXMueSksXG4gICAgZGlzdGFuY2VYID0gTWF0aC5hYnMobmV3WCAtIHRoaXMuc3RhcnRYKSxcbiAgICBkaXN0YW5jZVkgPSBNYXRoLmFicyhuZXdZIC0gdGhpcy5zdGFydFkpLFxuICAgIHRpbWUgPSAwLFxuICAgIGVhc2luZyA9ICcnO1xuXG5cdFx0dGhpcy5pc0luVHJhbnNpdGlvbiA9IDA7XG5cdFx0dGhpcy5pbml0aWF0ZWQgPSAwO1xuICAgIHRoaXMuZW5kVGltZSA9IGdldFRpbWUoKTtcbiAgICBcblx0XHQvLyByZXNldCBpZiB3ZSBhcmUgb3V0c2lkZSBvZiB0aGUgYm91bmRhcmllc1xuXHRcdGlmICggdGhpcy5yZXNldFBvc2l0aW9uKHRoaXMub3B0aW9ucy5ib3VuY2VUaW1lKSApIHtcblx0XHRcdHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgdGhpcy5zY3JvbGxUbyhuZXdYLCBuZXdZKTtcdC8vIGVuc3VyZXMgdGhhdCB0aGUgbGFzdCBwb3NpdGlvbiBpcyByb3VuZGVkXG5cblx0XHQvLyB3ZSBzY3JvbGxlZCBsZXNzIHRoYW4gMTAgcGl4ZWxzXG5cdFx0aWYgKCAhdGhpcy5tb3ZlZCApIHtcblx0XHRcdGlmICggdGhpcy5vcHRpb25zLnRhcCApIHtcblx0XHRcdFx0Ly8gdXRpbHMudGFwKGUsIHRoaXMub3B0aW9ucy50YXApO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIHRoaXMub3B0aW9ucy5jbGljayApIHtcblx0XHRcdFx0Ly8gdXRpbHMuY2xpY2soZSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsQ2FuY2VsJyk7XG5cdFx0XHRyZXR1cm47XG4gICAgfVxuXG5cdFx0aWYgKCB0aGlzLl9ldmVudHMuZmxpY2sgJiYgZHVyYXRpb24gPCAyMDAgJiYgZGlzdGFuY2VYIDwgMTAwICYmIGRpc3RhbmNlWSA8IDEwMCApIHtcblx0XHRcdC8vIHRoaXMuX2V4ZWNFdmVudCgnZmxpY2snKTtcblx0XHRcdHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgLy8gc3RhcnQgbW9tZW50dW0gYW5pbWF0aW9uIGlmIG5lZWRlZFxuICAgIGlmICggdGhpcy5vcHRpb25zLm1vbWVudHVtICYmIGR1cmF0aW9uIDwgMzAwICkge1xuXHRcdFx0bW9tZW50dW1YID0gdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsID8gbW9tZW50dW0odGhpcy54LCB0aGlzLnN0YXJ0WCwgZHVyYXRpb24sIHRoaXMubWF4U2Nyb2xsWCwgdGhpcy5vcHRpb25zLmJvdW5jZSA/IHRoaXMud3JhcHBlcldpZHRoIDogMCwgdGhpcy5vcHRpb25zLmRlY2VsZXJhdGlvbikgOiB7IGRlc3RpbmF0aW9uOiBuZXdYLCBkdXJhdGlvbjogMCB9O1xuXHRcdFx0bW9tZW50dW1ZID0gdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCA/IG1vbWVudHVtKHRoaXMueSwgdGhpcy5zdGFydFksIGR1cmF0aW9uLCB0aGlzLm1heFNjcm9sbFksIHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLndyYXBwZXJIZWlnaHQgOiAwLCB0aGlzLm9wdGlvbnMuZGVjZWxlcmF0aW9uKSA6IHsgZGVzdGluYXRpb246IG5ld1ksIGR1cmF0aW9uOiAwIH07XG5cdFx0XHRuZXdYID0gbW9tZW50dW1YLmRlc3RpbmF0aW9uO1xuXHRcdFx0bmV3WSA9IG1vbWVudHVtWS5kZXN0aW5hdGlvbjtcblx0XHRcdHRpbWUgPSBNYXRoLm1heChtb21lbnR1bVguZHVyYXRpb24sIG1vbWVudHVtWS5kdXJhdGlvbik7XG5cdFx0XHR0aGlzLmlzSW5UcmFuc2l0aW9uID0gMTtcbiAgICB9XG5cbiAgICBpZiAoIHRoaXMub3B0aW9ucy5zbmFwICkge1xuICAgICAgLy8gZG8gc29tZXRpbmdcbiAgICB9XG5cbiAgICBpZiAoIG5ld1ggIT0gdGhpcy54IHx8IG5ld1kgIT0gdGhpcy55ICkge1xuICAgICAgLy8gY2hhbmdlIGVhc2luZyBmdW5jdGlvbiB3aGVuIHNjcm9sbGVyIGdvZXMgb3V0IG9mIHRoZSBib3VuZGFyaWVzXG5cdFx0XHRpZiAoIG5ld1ggPiAwIHx8IG5ld1ggPCB0aGlzLm1heFNjcm9sbFggfHwgbmV3WSA+IDAgfHwgbmV3WSA8IHRoaXMubWF4U2Nyb2xsWSApIHtcblx0XHRcdFx0ZWFzaW5nID0gZWFzaW5ncy5xdWFkcmF0aWM7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZygnZW5kZW5kZW5kZW5kIScpO1xuXHRcdFx0dGhpcy5zY3JvbGxUbyhuZXdYLCBuZXdZLCB0aW1lLCBlYXNpbmcpO1xuXHRcdFx0cmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsRW5kJyk7XG4gICAgXG4gIH0sXG5cbiAgZ2V0Q29tcHV0ZWRQb3NpdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBtYXRyaXggPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLnNjcm9sbGVyLCBudWxsKSxcbiAgICAgIHgsIHk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zZm9ybSkge1xuICAgICAgbWF0cml4ID0gbWF0cml4W3N0eWxlVXRpbHMudHJhbnNmb3JtXS5zcGxpdCgnKScpWzBdLnNwbGl0KCcsICcpO1xuICAgICAgeCA9ICsobWF0cml4WzEyXSB8fCBtYXRyaXhbNF0pO1xuICAgICAgeSA9ICsobWF0cml4WzEzXSB8fCBtYXRyaXhbNV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBlZy4gdHJhbnNmb3JtICcwcHgnIHRvIDBcbiAgICAgIHggPSArbWF0cml4LmxlZnQucmVwbGFjZSgvW14tXFxkLl0vZywgJycpO1xuICAgICAgeSA9ICttYXRyaXgudG9wLnJlcGxhY2UoL1teLVxcZC5dL2csICcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyB4OiB4LCB5OiB5IH07XG4gIH0sXG5cbiAgc2Nyb2xsVG86IGZ1bmN0aW9uICh4LCB5LCB0aW1lLCBlYXNpbmcpIHtcbiAgICBlYXNpbmcgPSBlYXNpbmcgfHwgZWFzaW5ncy5jaXJjdWxhcjtcbiAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgdGltZSA+IDA7XG4gICAgdmFyIHRyYW5zaXRpb25UeXBlID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgZWFzaW5nLnN0eWxlO1xuXG4gICAgaWYgKCF0aW1lIHx8IHRyYW5zaXRpb25UeXBlKSB7XG4gICAgICBpZiAodHJhbnNpdGlvblR5cGUpIHtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uKGVhc2luZy5zdHlsZSk7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1lKHRpbWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5fdHJhbnNsYXRlKHgsIHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hbmltYXRlKHgsIHksIHRpbWUsIGVhc2luZy5mbik7XG4gICAgfVxuICB9LFxuXG4gIHNjcm9sbFRvRWxlbWVudDogZnVuY3Rpb24gKGVsLCB0aW1lLCBvZmZzZXRYLCBvZmZzZXRZLCBlYXNpbmcpIHtcbiAgICBlbCA9IGVsLm5vZGVUeXBlID8gZWwgOiB0aGlzLnNjcm9sbGVyLnF1ZXJ5U2VsZWN0b3IoZWwpO1xuXG4gICAgLy8gaWYgbm8gZWxlbWVudCBzZWxlY3RlZCwgdGhlbiByZXR1cm5cbiAgICBpZiAoIWVsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHBvcyA9IG9mZnNldFV0aWxzKGVsKTtcbiAgfSxcblxuICBfdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uOiBmdW5jdGlvbiAoZWFzaW5nU3R5bGUpIHtcbiAgICAvLyBhc3NpZ24gZWFzaW5nIGNzcyBzdHlsZSB0byBzY3JvbGwgY29udGFpbmVyIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiBwcm9wZXJ0eVxuICAgIC8vIGV4YW1wbGU6IGN1YmljLWJlemllcigwLjI1LCAwLjQ2LCAwLjQ1LCAwLjk0KVxuICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtzdHlsZVV0aWxzLnRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbl0gPSBlYXNpbmdTdHlsZTtcbiAgfSxcblxuICBfdHJhbnNpdGlvblRpbWU6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgLy8gaWYgZG8gbm90IHVzZSB0cmFuc2l0aW9uIHRvIHNjcm9sbCwgcmV0dXJuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRpbWUgPSB0aW1lIHx8IDA7XG4gICAgLy8gdHJhbnNpdGlvbkR1cmF0aW9uIHdoaWNoIGhhcyB2ZW5kb3IgcHJlZml4XG4gICAgdmFyIGR1cmF0aW9uUHJvcCA9IHN0eWxlVXRpbHMudHJhbnNpdGlvbkR1cmF0aW9uO1xuICAgIGlmICghZHVyYXRpb25Qcm9wKSB7IC8vIGlmIG5vIHZlbmRvciBmb3VuZCwgZHVyYXRpb25Qcm9wIHdpbGwgYmUgZmFsc2VcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9IHRpbWUgKyAnbXMnOyAvLyBhc3NpZ24gbXMgdG8gdHJhbnNpdGlvbkR1cmF0aW9uIHByb3BcblxuICAgIGlmICghdGltZSAmJiBpc0JhZEFuZHJvaWQpIHtcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gJzAuMDAwMW1zJztcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgckFGKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHNlbGYuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID09PSAnMC4wMDAxbXMnKSB7XG4gICAgICAgICAgc2VsZi5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSAnMHMnO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX3RyYW5zbGF0ZTogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICBjb25zb2xlLmxvZygndHJhbnNsYXRlIG5vdyEhOiAnLCB4LCAnICcsIHkpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMudXNlVHJhbnNmb3JtKSB7XG5cbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtzdHlsZVV0aWxzLnRyYW5zZm9ybV0gPVxuICAgICAgICAndHJhbnNsYXRlKCcgKyB4ICsgJ3B4LCcgKyB5ICsgJ3B4KScgKyAndHJhbnNsYXRlWigwKSc7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgeCA9IE1hdGgucm91bmQoeCk7XG4gICAgICB5ID0gTWF0aC5yb3VuZCh5KTtcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZS5sZWZ0ID0geCArICdweCc7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGUudG9wID0geSArICdweCc7XG4gICAgfVxuXG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICB9LFxuXG4gIF9hbmltYXRlOiBmdW5jdGlvbiAoZGVzdFgsIGRlc3RZLCBkdXJhdGlvbiwgZWFzaW5nRm4pIHtcbiAgICB2YXIgdGhhdCA9IHRoaXMsXG4gICAgICBzdGFydFggPSB0aGlzLngsXG4gICAgICBzdGFydFkgPSB0aGlzLnksXG4gICAgICBzdGFydFRpbWUgPSBnZXRUaW1lKCksXG4gICAgICBkZXN0VGltZSA9IHN0YXJ0VGltZSArIGR1cmF0aW9uO1xuXG4gICAgZnVuY3Rpb24gc3RlcCgpIHtcbiAgICAgIHZhciBub3cgPSBnZXRUaW1lKCksXG4gICAgICAgIG5ld1gsIG5ld1ksXG4gICAgICAgIGVhc2luZztcblxuICAgICAgaWYgKG5vdyA+PSBkZXN0VGltZSkge1xuICAgICAgICB0aGF0LmlzQW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoYXQuX3RyYW5zbGF0ZShkZXN0WCwgZGVzdFkpO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbm93ID0gKG5vdyAtIHN0YXJ0VGltZSkgLyBkdXJhdGlvbjtcbiAgICAgIGVhc2luZyA9IGVhc2luZ0ZuKG5vdyk7XG4gICAgICBuZXdYID0gKGRlc3RYIC0gc3RhcnRYKSAqIGVhc2luZyArIHN0YXJ0WDtcbiAgICAgIG5ld1kgPSAoZGVzdFkgLSBzdGFydFkpICogZWFzaW5nICsgc3RhcnRZO1xuICAgICAgdGhhdC5fdHJhbnNsYXRlKG5ld1gsIG5ld1kpO1xuXG4gICAgICBpZiAodGhhdC5pc0FuaW1hdGluZykge1xuICAgICAgICByQUYoc3RlcCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5pc0FuaW1hdGluZyA9IHRydWU7XG4gICAgc3RlcCgpO1xuICB9LFxuXG4gIHJlZnJlc2g6IGZ1bmN0aW9uICgpIHtcbiAgICBnZXRSZWN0KHRoaXMud3JhcHBlcik7IC8vIEZvcmNlIHJlZmxvd1xuXG4gICAgdGhpcy53cmFwcGVyV2lkdGggPSB0aGlzLndyYXBwZXIuY2xpZW50V2lkdGg7XG4gICAgdGhpcy53cmFwcGVySGVpZ2h0ID0gdGhpcy53cmFwcGVyLmNsaWVudEhlaWdodDtcblxuICAgIHZhciByZWN0ID0gZ2V0UmVjdCh0aGlzLnNjcm9sbGVyKTtcblxuICAgIHRoaXMuc2Nyb2xsZXJXaWR0aCA9IHJlY3Qud2lkdGg7XG4gICAgdGhpcy5zY3JvbGxlckhlaWdodCA9IHJlY3QuaGVpZ2h0O1xuXG4gICAgLyoqXG4gICAgICogdGhpcy5tYXhTY3JvbGxYIG9yIHRoaXMubWF4U2Nyb2xsWSBzbWFsbGVyIHRoYW4gMCwgbWVhbmluZ1xuICAgICAqIG92ZXJmbG93IGhhcHBlbmVkLlxuICAgICAqL1xuICAgIHRoaXMubWF4U2Nyb2xsWCA9IHRoaXMud3JhcHBlcldpZHRoIC0gdGhpcy5zY3JvbGxlcldpZHRoO1xuICAgIHRoaXMubWF4U2Nyb2xsWSA9IHRoaXMud3JhcHBlckhlaWdodCAtIHRoaXMuc2Nyb2xsZXJIZWlnaHQ7XG5cbiAgICAvKipcbiAgICAgKiBvcHRpb24gZW5hYmxlcyBzY3JvbGwgQU5EIG92ZXJmbG93IGV4aXN0c1xuICAgICAqL1xuICAgIHRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCA9IHRoaXMub3B0aW9ucy5zY3JvbGxYICYmIHRoaXMubWF4U2Nyb2xsWCA8IDA7XG4gICAgdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCA9IHRoaXMub3B0aW9ucy5zY3JvbGxZICYmIHRoaXMubWF4U2Nyb2xsWSA8IDA7XG5cbiAgICBpZiAoIXRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCkge1xuICAgICAgdGhpcy5tYXhTY3JvbGxYID0gMDtcbiAgICAgIHRoaXMuc2Nyb2xsZXJXaWR0aCA9IHRoaXMud3JhcHBlcldpZHRoO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCkge1xuICAgICAgdGhpcy5tYXhTY3JvbGxZID0gMDtcbiAgICAgIHRoaXMuc2Nyb2xsZXJIZWlnaHQgPSB0aGlzLndyYXBwZXJIZWlnaHQ7XG4gICAgfVxuXG4gICAgdGhpcy5lbmRUaW1lID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblggPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWSA9IDA7XG5cbiAgICBpZiAoaGFzUG9pbnRlciAmJiAhdGhpcy5vcHRpb25zLmRpc2FibGVQb2ludGVyKSB7XG4gICAgICB0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0gPVxuICAgICAgICBnZXRUb3VjaEFjdGlvbih0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCwgdHJ1ZSk7XG5cbiAgICAgIGlmICghdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dKSB7XG4gICAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSA9XG4gICAgICAgICAgZ2V0VG91Y2hBY3Rpb24odGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2gsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLndyYXBwZXJPZmZzZXQgPSBvZmZzZXRVdGlscyh0aGlzLndyYXBwZXIpO1xuXG4gICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdyZWZyZXNoJyk7XG5cbiAgICB0aGlzLnJlc2V0UG9zaXRpb24oKTtcbiAgfSxcblxuICByZXNldFBvc2l0aW9uOiBmdW5jdGlvbiAodGltZSkge1xuICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgeSA9IHRoaXMueTtcblxuICAgIHRpbWUgPSB0aW1lIHx8IDA7XG5cbiAgICBpZiAoIXRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCB8fCB0aGlzLnggPiAwKSB7XG4gICAgICB4ID0gMDtcbiAgICB9IGVsc2UgaWYgKHRoaXMueCA8IHRoaXMubWF4U2Nyb2xsWCkge1xuICAgICAgeCA9IHRoaXMubWF4U2Nyb2xsWDtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaGFzVmVydGljYWxTY3JvbGwgfHwgdGhpcy55ID4gMCkge1xuICAgICAgeSA9IDA7XG4gICAgfSBlbHNlIGlmICh0aGlzLnkgPCB0aGlzLm1heFNjcm9sbFkpIHtcbiAgICAgIHkgPSB0aGlzLm1heFNjcm9sbFk7XG4gICAgfVxuXG4gICAgaWYgKHggPT09IHRoaXMueCAmJiB5ID09PSB0aGlzLnkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbFRvKHgsIHksIHRpbWUsIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcpO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgZGlzYWJsZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xuICB9LFxuXG4gIGVuYWJsZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZW5hYmxlZCA9IHRydWU7XG4gIH1cblxuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBJc2Nyb2xsOyJdLCJuYW1lcyI6WyJlYXNpbmdzIiwiayIsIk1hdGgiLCJzcXJ0IiwiYiIsImYiLCJlIiwicG93Iiwic2luIiwiUEkiLCJfZWxlbWVudFN0eWxlIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwic3R5bGUiLCJfdmVuZG9yIiwidmVuZG9ycyIsInRyYW5zZm9ybSIsImkiLCJsIiwibGVuZ3RoIiwic3Vic3RyIiwiX3ByZWZpeFN0eWxlIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJpc0JhZEFuZHJvaWQiLCJhcHBWZXJzaW9uIiwid2luZG93IiwibmF2aWdhdG9yIiwidGVzdCIsInNhZmFyaVZlcnNpb24iLCJtYXRjaCIsInBhcnNlRmxvYXQiLCJnZXRUaW1lIiwiRGF0ZSIsIm5vdyIsIm9mZnNldCIsImVsIiwibGVmdCIsIm9mZnNldExlZnQiLCJ0b3AiLCJvZmZzZXRUb3AiLCJvZmZzZXRQYXJlbnQiLCJnZXRSZWN0IiwiU1ZHRWxlbWVudCIsInJlY3QiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJ3aWR0aCIsImhlaWdodCIsIm9mZnNldFdpZHRoIiwib2Zmc2V0SGVpZ2h0IiwiaGFzUG9pbnRlciIsIlBvaW50ZXJFdmVudCIsIk1TUG9pbnRlckV2ZW50IiwiaGFzVG91Y2giLCJnZXRUb3VjaEFjdGlvbiIsImV2ZW50UGFzc3Rocm91Z2giLCJhZGRQaW5jaCIsInRvdWNoQWN0aW9uIiwiYWRkRXZlbnQiLCJ0eXBlIiwiZm4iLCJjYXB0dXJlIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50IiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsInByZWZpeFBvaW50ZXJFdmVudCIsInBvaW50ZXJFdmVudCIsImV2ZW50VHlwZSIsInByZXZlbnREZWZhdWx0RXhjZXB0aW9uIiwiZXhjZXB0aW9ucyIsIm1vbWVudHVtIiwiY3VycmVudCIsInN0YXJ0IiwidGltZSIsImxvd2VyTWFyZ2luIiwid3JhcHBlclNpemUiLCJkZWNlbGVyYXRpb24iLCJkaXN0YW5jZSIsInNwZWVkIiwiYWJzIiwiZGVzdGluYXRpb24iLCJkdXJhdGlvbiIsInVuZGVmaW5lZCIsInJvdW5kIiwickFGIiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwid2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwibW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwib1JlcXVlc3RBbmltYXRpb25GcmFtZSIsIm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiY2FsbGJhY2siLCJzZXRUaW1lb3V0IiwiSXNjcm9sbCIsImVsZW0iLCJvcHRpb25zIiwid3JhcHBlciIsInF1ZXJ5U2VsZWN0b3IiLCJzY3JvbGxlciIsImNoaWxkcmVuIiwic2Nyb2xsZXJTdHlsZSIsIm9ubW91c2Vkb3duIiwidGFnTmFtZSIsInNjcm9sbFkiLCJzY3JvbGxYIiwiZnJlZVNjcm9sbCIsImRpcmVjdGlvbkxvY2tUaHJlc2hvbGQiLCJib3VuY2VFYXNpbmciLCJjaXJjdWxhciIsIngiLCJ5IiwiZGlyZWN0aW9uWCIsImRpcmVjdGlvblkiLCJfZXZlbnRzIiwiX2luaXQiLCJyZWZyZXNoIiwic2Nyb2xsVG8iLCJzdGFydFgiLCJzdGFydFkiLCJlbmFibGUiLCJwcm90b3R5cGUiLCJfaW5pdEV2ZW50cyIsInJlbW92ZSIsInRhcmdldCIsImJpbmRUb1dyYXBwZXIiLCJjbGljayIsImRpc2FibGVNb3VzZSIsImRpc2FibGVQb2ludGVyIiwiZGlzYWJsZVRvdWNoIiwiX3N0YXJ0IiwiX21vdmUiLCJfZW5kIiwibG9nIiwiYnV0dG9uIiwid2hpY2giLCJlbmFibGVkIiwiaW5pdGlhdGVkIiwicHJldmVudERlZmF1bHQiLCJwb2ludCIsInRvdWNoZXMiLCJwb3MiLCJtb3ZlZCIsImRpc3RYIiwiZGlzdFkiLCJkaXJlY3Rpb25Mb2NrZWQiLCJzdGFydFRpbWUiLCJ1c2VUcmFuc2l0aW9uIiwiaXNJblRyYW5zaXRpb24iLCJfdHJhbnNpdGlvblRpbWUiLCJnZXRDb21wdXRlZFBvc2l0aW9uIiwiX3RyYW5zbGF0ZSIsImlzQW5pbWF0aW5nIiwiYWJzU3RhcnRYIiwiYWJzU3RhcnRZIiwicG9pbnRYIiwicGFnZVgiLCJwb2ludFkiLCJwYWdlWSIsImRlbHRhWCIsInRpbWVzdGFtcCIsIm5ld1giLCJuZXdZIiwiYWJzRGlzdFgiLCJhYnNEaXN0WSIsImRlbHRhWSIsImVuZFRpbWUiLCJoYXNWZXJ0aWNhbFNjcm9sbCIsImhhc0hvcml6b250YWxTY3JvbGwiLCJtYXhTY3JvbGxYIiwiYm91bmNlIiwibWF4U2Nyb2xsWSIsImNoYW5nZWRUb3VjaGVzIiwibW9tZW50dW1YIiwibW9tZW50dW1ZIiwiZGlzdGFuY2VYIiwiZGlzdGFuY2VZIiwiZWFzaW5nIiwicmVzZXRQb3NpdGlvbiIsImJvdW5jZVRpbWUiLCJ0YXAiLCJmbGljayIsIndyYXBwZXJXaWR0aCIsIndyYXBwZXJIZWlnaHQiLCJtYXgiLCJzbmFwIiwicXVhZHJhdGljIiwibWF0cml4IiwiZ2V0Q29tcHV0ZWRTdHlsZSIsInVzZVRyYW5zZm9ybSIsInN0eWxlVXRpbHMiLCJzcGxpdCIsInJlcGxhY2UiLCJ0cmFuc2l0aW9uVHlwZSIsIl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJfYW5pbWF0ZSIsIm9mZnNldFgiLCJvZmZzZXRZIiwibm9kZVR5cGUiLCJvZmZzZXRVdGlscyIsImVhc2luZ1N0eWxlIiwidHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIiwiZHVyYXRpb25Qcm9wIiwidHJhbnNpdGlvbkR1cmF0aW9uIiwic2VsZiIsImRlc3RYIiwiZGVzdFkiLCJlYXNpbmdGbiIsInRoYXQiLCJkZXN0VGltZSIsInN0ZXAiLCJjbGllbnRXaWR0aCIsImNsaWVudEhlaWdodCIsInNjcm9sbGVyV2lkdGgiLCJzY3JvbGxlckhlaWdodCIsIndyYXBwZXJPZmZzZXQiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLElBQUlBLFVBQVU7YUFDRDtXQUNGLHNDQURFO1FBRUwsVUFBVUMsQ0FBVixFQUFhO2FBQ1JBLEtBQUssSUFBSUEsQ0FBVCxDQUFQOztHQUpRO1lBT0Y7V0FDRCxpQ0FEQztRQUVKLFVBQVVBLENBQVYsRUFBYTthQUNSQyxLQUFLQyxJQUFMLENBQVUsSUFBSyxFQUFFRixDQUFGLEdBQU1BLENBQXJCLENBQVA7O0dBVlE7UUFhTjtXQUNHLHlDQURIO1FBRUEsVUFBVUEsQ0FBVixFQUFhO1VBQ1hHLElBQUksQ0FBUjthQUNPLENBQUNILElBQUlBLElBQUksQ0FBVCxJQUFjQSxDQUFkLElBQW1CLENBQUNHLElBQUksQ0FBTCxJQUFVSCxDQUFWLEdBQWNHLENBQWpDLElBQXNDLENBQTdDOztHQWpCUTtVQW9CSjtXQUNDLEVBREQ7UUFFRixVQUFVSCxDQUFWLEVBQWE7VUFDWCxDQUFDQSxLQUFLLENBQU4sSUFBWSxJQUFJLElBQXBCLEVBQTJCO2VBQ2xCLFNBQVNBLENBQVQsR0FBYUEsQ0FBcEI7T0FERixNQUVPLElBQUlBLElBQUssSUFBSSxJQUFiLEVBQW9CO2VBQ2xCLFVBQVVBLEtBQU0sTUFBTSxJQUF0QixJQUErQkEsQ0FBL0IsR0FBbUMsSUFBMUM7T0FESyxNQUVBLElBQUlBLElBQUssTUFBTSxJQUFmLEVBQXNCO2VBQ3BCLFVBQVVBLEtBQU0sT0FBTyxJQUF2QixJQUFnQ0EsQ0FBaEMsR0FBb0MsTUFBM0M7T0FESyxNQUVBO2VBQ0UsVUFBVUEsS0FBTSxRQUFRLElBQXhCLElBQWlDQSxDQUFqQyxHQUFxQyxRQUE1Qzs7O0dBOUJNO1dBa0NIO1dBQ0EsRUFEQTtRQUVILFVBQVVBLENBQVYsRUFBYTtVQUNYSSxJQUFJLElBQVI7VUFDRUMsSUFBSSxHQUROOztVQUdJTCxNQUFNLENBQVYsRUFB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

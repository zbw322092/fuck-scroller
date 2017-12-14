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

  this.options.resizePolling = this.options.resizePolling === undefined ? 60 : this.options.resizePolling;

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
      case 'orientationchange':
      case 'resize':
        this._resize();
        break;
      case 'transitionend':
      case 'webkitTransitionEnd':
      case 'oTransitionEnd':
      case 'MSTransitionEnd':
        this._transitionEnd(e);
        break;
    }
  },

  _start: function (e) {
    console.log('start event type: ', e.type);
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
      console.log('do not move scroll');
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
      console.log('less than 10 px');
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
      console.log('end end end end!');
      this.scrollTo(newX, newY, time, easing);
      return;
    }

    // this._execEvent('scrollEnd');
  },

  _transitionEnd: function (e) {
    if (e.target != this.scroller || !this.isInTransition) {
      return;
    }

    this._transitionTime();
    if (!this.resetPosition(this.options.bounceTime)) {
      this.isInTransition = false;
      // this._execEvent('scrollEnd');
    }
  },

  _resize: function () {
    var that = this;

    clearTimeout(this.resizeTimeout);

    this.resizeTimeout = setTimeout(function () {
      console.log('resize now');
      that.refresh();
    }, this.options.resizePolling);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL3V0aWxzL2Vhc2luZ3MuanMiLCIuLi9zcmMvdXRpbHMvc3R5bGUuanMiLCIuLi9zcmMvdXRpbHMvaXNCYWRBbmRyb2lkLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRpbWUuanMiLCIuLi9zcmMvdXRpbHMvb2Zmc2V0LmpzIiwiLi4vc3JjL3V0aWxzL2dldFJlY3QuanMiLCIuLi9zcmMvdXRpbHMvZGV0ZWN0b3IuanMiLCIuLi9zcmMvdXRpbHMvZ2V0VG91Y2hBY3Rpb24uanMiLCIuLi9zcmMvdXRpbHMvZXZlbnRIYW5kbGVyLmpzIiwiLi4vc3JjL3V0aWxzL3ByZWZpeFBvaW50ZXJFdmVudC5qcyIsIi4uL3NyYy91dGlscy9ldmVudFR5cGUuanMiLCIuLi9zcmMvdXRpbHMvcHJldmVudERlZmF1bHRFeGNlcHRpb24uanMiLCIuLi9zcmMvdXRpbHMvbW9tZW50dW0uanMiLCIuLi9zcmMvbXktaXNjcm9sbC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZWFzaW5ncyA9IHtcbiAgcXVhZHJhdGljOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4yNSwgMC40NiwgMC40NSwgMC45NCknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIGsgKiAoMiAtIGspO1xuICAgIH1cbiAgfSxcbiAgY2lyY3VsYXI6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjEsIDAuNTcsIDAuMSwgMSknLFx0Ly8gTm90IHByb3Blcmx5IFwiY2lyY3VsYXJcIiBidXQgdGhpcyBsb29rcyBiZXR0ZXIsIGl0IHNob3VsZCBiZSAoMC4wNzUsIDAuODIsIDAuMTY1LCAxKVxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIE1hdGguc3FydCgxIC0gKC0tayAqIGspKTtcbiAgICB9XG4gIH0sXG4gIGJhY2s6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjE3NSwgMC44ODUsIDAuMzIsIDEuMjc1KScsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICB2YXIgYiA9IDQ7XG4gICAgICByZXR1cm4gKGsgPSBrIC0gMSkgKiBrICogKChiICsgMSkgKiBrICsgYikgKyAxO1xuICAgIH1cbiAgfSxcbiAgYm91bmNlOiB7XG4gICAgc3R5bGU6ICcnLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgaWYgKChrIC89IDEpIDwgKDEgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogayAqIGs7XG4gICAgICB9IGVsc2UgaWYgKGsgPCAoMiAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMS41IC8gMi43NSkpICogayArIDAuNzU7XG4gICAgICB9IGVsc2UgaWYgKGsgPCAoMi41IC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjI1IC8gMi43NSkpICogayArIDAuOTM3NTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi42MjUgLyAyLjc1KSkgKiBrICsgMC45ODQzNzU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBlbGFzdGljOiB7XG4gICAgc3R5bGU6ICcnLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGYgPSAwLjIyLFxuICAgICAgICBlID0gMC40O1xuXG4gICAgICBpZiAoayA9PT0gMCkgeyByZXR1cm4gMDsgfVxuICAgICAgaWYgKGsgPT0gMSkgeyByZXR1cm4gMTsgfVxuXG4gICAgICByZXR1cm4gKGUgKiBNYXRoLnBvdygyLCAtIDEwICogaykgKiBNYXRoLnNpbigoayAtIGYgLyA0KSAqICgyICogTWF0aC5QSSkgLyBmKSArIDEpO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgZWFzaW5nczsiLCJ2YXIgX2VsZW1lbnRTdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlO1xuXG52YXIgX3ZlbmRvciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciB2ZW5kb3JzID0gWyd0JywgJ3dlYmtpdFQnLCAnTW96VCcsICdtc1QnLCAnT1QnXSxcbiAgICB0cmFuc2Zvcm0sXG4gICAgaSA9IDAsXG4gICAgbCA9IHZlbmRvcnMubGVuZ3RoO1xuXG4gIHdoaWxlIChpIDwgbCkge1xuICAgIHRyYW5zZm9ybSA9IHZlbmRvcnNbaV0gKyAncmFuc2Zvcm0nO1xuICAgIGlmICh0cmFuc2Zvcm0gaW4gX2VsZW1lbnRTdHlsZSkge1xuICAgICAgcmV0dXJuIHZlbmRvcnNbaV0uc3Vic3RyKDAsIHZlbmRvcnNbaV0ubGVuZ3RoIC0gMSk7XG4gICAgfVxuICAgIGkrKztcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn0pKCk7XG5cbmZ1bmN0aW9uIF9wcmVmaXhTdHlsZSAoc3R5bGUpIHtcbiAgaWYgKCBfdmVuZG9yID09PSBmYWxzZSApIHJldHVybiBmYWxzZTsgLy8gbm8gdmVuZG9yIGZvdW5kXG4gIGlmICggX3ZlbmRvciA9PT0gJycgKSByZXR1cm4gc3R5bGU7IC8vIG5vIHByZWZpeCBuZWVkZWRcbiAgcmV0dXJuIF92ZW5kb3IgKyBzdHlsZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0eWxlLnN1YnN0cigxKTsgLy8gb3RoZXJ3aXNlIGFkZCBwcmVmaXhcbn1cblxuLy8gc3R5bGUgdGhhdCBoYXMgdmVuZG9yIHByZWZpeCwgZWc6IHdlYmtpdFRyYW5zZm9ybVxudmFyIHN0eWxlID0ge1xuICB0cmFuc2Zvcm06IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtJyksXG4gIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24nKSxcbiAgdHJhbnNpdGlvbkR1cmF0aW9uOiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EdXJhdGlvbicpLFxuICB0cmFuc2l0aW9uRGVsYXk6IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvbkRlbGF5JyksXG4gIHRyYW5zZm9ybU9yaWdpbjogX3ByZWZpeFN0eWxlKCd0cmFuc2Zvcm1PcmlnaW4nKSxcbiAgdG91Y2hBY3Rpb246IF9wcmVmaXhTdHlsZSgndG91Y2hBY3Rpb24nKVxufTtcblxuZXhwb3J0IGRlZmF1bHQgc3R5bGU7IiwidmFyIGlzQmFkQW5kcm9pZCA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBhcHBWZXJzaW9uID0gd2luZG93Lm5hdmlnYXRvci5hcHBWZXJzaW9uO1xuXG4gIGlmICgvQW5kcm9pZC8udGVzdChhcHBWZXJzaW9uKSAmJiAhKC9DaHJvbWVcXC9cXGQvLnRlc3QoYXBwVmVyc2lvbikpKSB7XG4gICAgdmFyIHNhZmFyaVZlcnNpb24gPSBhcHBWZXJzaW9uLm1hdGNoKC9TYWZhcmlcXC8oXFxkKy5cXGQpLyk7XG4gICAgaWYoc2FmYXJpVmVyc2lvbiAmJiB0eXBlb2Ygc2FmYXJpVmVyc2lvbiA9PT0gXCJvYmplY3RcIiAmJiBzYWZhcmlWZXJzaW9uLmxlbmd0aCA+PSAyKSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdChzYWZhcmlWZXJzaW9uWzFdKSA8IDUzNS4xOTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSkoKTtcblxuZXhwb3J0IGRlZmF1bHQgaXNCYWRBbmRyb2lkOyIsIi8qKlxuICogMS4gRGF0ZS5wcm90b3R5cGUuZ2V0VGltZSBoYXMgQkVUVEVSIGNvbXBhdGliaWxpdHkgdGhhbiBEYXRlLm5vd1xuICogcmVmZXJlbmNlOiBcbiAqICBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9EYXRlL2dldFRpbWUjQnJvd3Nlcl9jb21wYXRpYmlsaXR5XG4gKiAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9ub3cjQnJvd3Nlcl9jb21wYXRpYmlsaXR5XG4gKiBcbiAqIDIuIERhdGUucHJvdG90eXBlLmdldFRpbWUgc3BlZWQgaXMgU0xPV1NFUiB0aGFuIERhdGUubm93XG4gKiByZWZlcmVuY2U6XG4gKiAgaHR0cHM6Ly9qc3BlcmYuY29tL2RhdGUtbm93LXZzLWRhdGUtZ2V0dGltZS83XG4gKi9cblxudmFyIGdldFRpbWUgPSBEYXRlLm5vdyB8fFxuICBmdW5jdGlvbiBnZXRUaW1lKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfTtcblxuZXhwb3J0IGRlZmF1bHQgZ2V0VGltZTsiLCJ2YXIgb2Zmc2V0ID0gZnVuY3Rpb24gKGVsKSB7XG4gIHZhciBsZWZ0ID0gLWVsLm9mZnNldExlZnQsXG4gIHRvcCA9IC1lbC5vZmZzZXRUb3A7XG5cbiAgLyoqXG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9IVE1MRWxlbWVudC9vZmZzZXRQYXJlbnRcbiAgICogUmV0dXJucyBudWxsIHdoZW4gdGhlIGVsZW1lbnQgaGFzIHN0eWxlLmRpc3BsYXkgc2V0IHRvIFwibm9uZVwiLiBUaGUgb2Zmc2V0UGFyZW50IFxuICAgKiBpcyB1c2VmdWwgYmVjYXVzZSBvZmZzZXRUb3AgYW5kIG9mZnNldExlZnQgYXJlIHJlbGF0aXZlIHRvIGl0cyBwYWRkaW5nIGVkZ2UuXG4gICAqL1xuICB3aGlsZSAoZWwgPSBlbC5vZmZzZXRQYXJlbnQpIHtcbiAgICBsZWZ0IC09IGVsLm9mZnNldExlZnQ7XG4gICAgdG9wIC09IGVsLm9mZnNldFRvcDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbGVmdDogbGVmdCxcbiAgICB0b3A6IHRvcFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBvZmZzZXQ7IiwiZnVuY3Rpb24gZ2V0UmVjdChlbCkge1xuICBpZiAoZWwgaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB7XG4gICAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIHJldHVybiB7XG4gICAgICB0b3AgOiByZWN0LnRvcCxcbiAgICAgIGxlZnQgOiByZWN0LmxlZnQsXG4gICAgICB3aWR0aCA6IHJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQgOiByZWN0LmhlaWdodFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgdG9wIDogZWwub2Zmc2V0VG9wLFxuICAgICAgbGVmdCA6IGVsLm9mZnNldExlZnQsXG4gICAgICB3aWR0aCA6IGVsLm9mZnNldFdpZHRoLFxuICAgICAgaGVpZ2h0IDogZWwub2Zmc2V0SGVpZ2h0XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRSZWN0OyIsInZhciBoYXNQb2ludGVyID0gISEod2luZG93LlBvaW50ZXJFdmVudCB8fCB3aW5kb3cuTVNQb2ludGVyRXZlbnQpOyAvLyBJRTEwIGlzIHByZWZpeGVkXG52YXIgaGFzVG91Y2ggPSAnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3c7XG5cbmV4cG9ydCB7XG4gIGhhc1BvaW50ZXIsXG4gIGhhc1RvdWNoXG59IiwidmFyIGdldFRvdWNoQWN0aW9uID0gZnVuY3Rpb24gKGV2ZW50UGFzc3Rocm91Z2gsIGFkZFBpbmNoKSB7XG4gIHZhciB0b3VjaEFjdGlvbiA9ICdub25lJztcbiAgaWYgKGV2ZW50UGFzc3Rocm91Z2ggPT09ICd2ZXJ0aWNhbCcpIHtcbiAgICB0b3VjaEFjdGlvbiA9ICdwYW4teSc7XG4gIH0gZWxzZSBpZiAoZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ2hvcml6b250YWwnKSB7XG4gICAgdG91Y2hBY3Rpb24gPSAncGFuLXgnO1xuICB9XG5cbiAgaWYgKGFkZFBpbmNoICYmIHRvdWNoQWN0aW9uICE9ICdub25lJykge1xuICAgIC8vIGFkZCBwaW5jaC16b29tIHN1cHBvcnQgaWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgaXQsIGJ1dCBpZiBub3QgKGVnLiBDaHJvbWUgPDU1KSBkbyBub3RoaW5nXG4gICAgdG91Y2hBY3Rpb24gKz0gJyBwaW5jaC16b29tJztcbiAgfVxuICByZXR1cm4gdG91Y2hBY3Rpb247XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdldFRvdWNoQWN0aW9uOyIsImZ1bmN0aW9uIGFkZEV2ZW50IChlbCwgdHlwZSwgZm4sIGNhcHR1cmUpIHtcbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgISFjYXB0dXJlKTtcbn07XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50IChlbCwgdHlwZSwgZm4sIGNhcHR1cmUpIHtcbiAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgISFjYXB0dXJlKTtcbn1cblxuZXhwb3J0IHtcbiAgYWRkRXZlbnQsXG4gIHJlbW92ZUV2ZW50XG59OyIsImZ1bmN0aW9uIHByZWZpeFBvaW50ZXJFdmVudCAocG9pbnRlckV2ZW50KSB7XG4gIHJldHVybiB3aW5kb3cuTVNQb2ludGVyRXZlbnQgPyBcbiAgICAnTVNQb2ludGVyJyArIHBvaW50ZXJFdmVudC5jaGFyQXQoNykudG9VcHBlckNhc2UoKSArIHBvaW50ZXJFdmVudC5zdWJzdHIoOCkgOlxuICAgIHBvaW50ZXJFdmVudDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgcHJlZml4UG9pbnRlckV2ZW50OyIsInZhciBldmVudFR5cGUgPSB7XG4gIHRvdWNoc3RhcnQ6IDEsXG4gIHRvdWNobW92ZTogMSxcbiAgdG91Y2hlbmQ6IDEsXG5cbiAgbW91c2Vkb3duOiAyLFxuICBtb3VzZW1vdmU6IDIsXG4gIG1vdXNldXA6IDIsXG5cbiAgcG9pbnRlcmRvd246IDMsXG4gIHBvaW50ZXJtb3ZlOiAzLFxuICBwb2ludGVydXA6IDMsXG5cbiAgTVNQb2ludGVyRG93bjogMyxcbiAgTVNQb2ludGVyTW92ZTogMyxcbiAgTVNQb2ludGVyVXA6IDNcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGV2ZW50VHlwZTsiLCJ2YXIgcHJldmVudERlZmF1bHRFeGNlcHRpb24gPSBmdW5jdGlvbiAoZWwsIGV4Y2VwdGlvbnMpIHtcbiAgZm9yICh2YXIgaSBpbiBleGNlcHRpb25zKSB7XG4gICAgaWYgKCBleGNlcHRpb25zW2ldLnRlc3QoZWxbaV0pICkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgcHJldmVudERlZmF1bHRFeGNlcHRpb247IiwidmFyIG1vbWVudHVtID0gZnVuY3Rpb24gKGN1cnJlbnQsIHN0YXJ0LCB0aW1lLCBsb3dlck1hcmdpbiwgd3JhcHBlclNpemUsIGRlY2VsZXJhdGlvbikge1xuICB2YXIgZGlzdGFuY2UgPSBjdXJyZW50IC0gc3RhcnQsXG4gICAgc3BlZWQgPSBNYXRoLmFicyhkaXN0YW5jZSkgLyB0aW1lLFxuICAgIGRlc3RpbmF0aW9uLFxuICAgIGR1cmF0aW9uO1xuXG4gIGRlY2VsZXJhdGlvbiA9IGRlY2VsZXJhdGlvbiA9PT0gdW5kZWZpbmVkID8gMC4wMDA2IDogZGVjZWxlcmF0aW9uO1xuXG4gIGRlc3RpbmF0aW9uID0gY3VycmVudCArICggc3BlZWQgKiBzcGVlZCApIC8gKCAyICogZGVjZWxlcmF0aW9uICkgKiAoIGRpc3RhbmNlIDwgMCA/IC0xIDogMSApO1xuICBkdXJhdGlvbiA9IHNwZWVkIC8gZGVjZWxlcmF0aW9uO1xuXG4gIGlmICggZGVzdGluYXRpb24gPCBsb3dlck1hcmdpbiApIHtcbiAgICBkZXN0aW5hdGlvbiA9IHdyYXBwZXJTaXplID8gbG93ZXJNYXJnaW4gLSAoIHdyYXBwZXJTaXplIC8gMi41ICogKCBzcGVlZCAvIDggKSApIDogbG93ZXJNYXJnaW47XG4gICAgZGlzdGFuY2UgPSBNYXRoLmFicyhkZXN0aW5hdGlvbiAtIGN1cnJlbnQpO1xuICAgIGR1cmF0aW9uID0gZGlzdGFuY2UgLyBzcGVlZDtcbiAgfSBlbHNlIGlmICggZGVzdGluYXRpb24gPiAwICkge1xuICAgIGRlc3RpbmF0aW9uID0gd3JhcHBlclNpemUgPyB3cmFwcGVyU2l6ZSAvIDIuNSAqICggc3BlZWQgLyA4ICkgOiAwO1xuICAgIGRpc3RhbmNlID0gTWF0aC5hYnMoY3VycmVudCkgKyBkZXN0aW5hdGlvbjtcbiAgICBkdXJhdGlvbiA9IGRpc3RhbmNlIC8gc3BlZWQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGRlc3RpbmF0aW9uOiBNYXRoLnJvdW5kKGRlc3RpbmF0aW9uKSxcbiAgICBkdXJhdGlvbjogZHVyYXRpb25cbiAgfTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgbW9tZW50dW07IiwiaW1wb3J0IGVhc2luZ3MgZnJvbSAnLi91dGlscy9lYXNpbmdzJztcbmltcG9ydCBzdHlsZVV0aWxzIGZyb20gJy4vdXRpbHMvc3R5bGUnO1xuaW1wb3J0IGlzQmFkQW5kcm9pZCBmcm9tICcuL3V0aWxzL2lzQmFkQW5kcm9pZCc7XG5pbXBvcnQgZ2V0VGltZSBmcm9tICcuL3V0aWxzL2dldFRpbWUnO1xuaW1wb3J0IG9mZnNldFV0aWxzIGZyb20gJy4vdXRpbHMvb2Zmc2V0JztcbmltcG9ydCBnZXRSZWN0IGZyb20gJy4vdXRpbHMvZ2V0UmVjdCc7XG5pbXBvcnQgeyBoYXNQb2ludGVyLCBoYXNUb3VjaCB9IGZyb20gJy4vdXRpbHMvZGV0ZWN0b3InO1xuaW1wb3J0IGdldFRvdWNoQWN0aW9uIGZyb20gJy4vdXRpbHMvZ2V0VG91Y2hBY3Rpb24nO1xuaW1wb3J0IHsgYWRkRXZlbnQsIHJlbW92ZUV2ZW50IH0gZnJvbSAnLi91dGlscy9ldmVudEhhbmRsZXInO1xuaW1wb3J0IHByZWZpeFBvaW50ZXJFdmVudCBmcm9tICcuL3V0aWxzL3ByZWZpeFBvaW50ZXJFdmVudCc7XG5pbXBvcnQgZXZlbnRUeXBlIGZyb20gJy4vdXRpbHMvZXZlbnRUeXBlJztcbmltcG9ydCBwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbiBmcm9tICcuL3V0aWxzL3ByZXZlbnREZWZhdWx0RXhjZXB0aW9uJztcbmltcG9ydCBtb21lbnR1bSBmcm9tICcuL3V0aWxzL21vbWVudHVtJztcblxuLy8gZGVhbCB3aXRoIHJlcXVlc3RBbmltYXRpb25GcmFtZSBjb21wYXRiaWxpdHlcbnZhciByQUYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7IHdpbmRvdy5zZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApOyB9O1xuXG5mdW5jdGlvbiBJc2Nyb2xsKGVsZW0sIG9wdGlvbnMpIHtcbiAgLyoqXG4gICAqIGdldCBzY3JvbGwgbm9kZSBlbGVtZW50XG4gICAqL1xuICB0aGlzLndyYXBwZXIgPSB0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pIDogZWxlbTtcbiAgdGhpcy5zY3JvbGxlciA9IHRoaXMud3JhcHBlci5jaGlsZHJlblswXTtcbiAgdGhpcy5zY3JvbGxlclN0eWxlID0gdGhpcy5zY3JvbGxlci5zdHlsZTtcblxuICAvKipcbiAgICogbWVyZ2UgZGVmYXVsdCBvcHRpb25zIGFuZCBjdXN0b21pemVkIG9wdGlvbnNcbiAgICovXG4gIHRoaXMub3B0aW9ucyA9IHtcbiAgICBkaXNhYmxlUG9pbnRlcjogIWhhc1BvaW50ZXIsXG4gICAgZGlzYWJsZVRvdWNoOiBoYXNQb2ludGVyIHx8ICFoYXNUb3VjaCxcbiAgICBkaXNhYmxlTW91c2U6IGhhc1BvaW50ZXIgfHwgIWhhc1RvdWNoLFxuICAgIHVzZVRyYW5zaXRpb246IHRydWUsXG4gICAgdXNlVHJhbnNmb3JtOiB0cnVlLFxuICAgIHNjcm9sbFk6IHRydWUsXG4gICAgc3RhcnRYOiAwLFxuICAgIHN0YXJ0WTogMCxcbiAgICBiaW5kVG9XcmFwcGVyOiB0eXBlb2Ygd2luZG93Lm9ubW91c2Vkb3duID09PSBcInVuZGVmaW5lZFwiLFxuICAgIHByZXZlbnREZWZhdWx0OiB0cnVlLFxuICAgIHByZXZlbnREZWZhdWx0RXhjZXB0aW9uOiB7IHRhZ05hbWU6IC9eKElOUFVUfFRFWFRBUkVBfEJVVFRPTnxTRUxFQ1QpJC8gfSxcbiAgICBkaXJlY3Rpb25Mb2NrVGhyZXNob2xkOiA1LFxuICAgIGJvdW5jZTogdHJ1ZSxcbiAgICBib3VuY2VUaW1lOiA2MDAsXG4gICAgYm91bmNlRWFzaW5nOiAnJyxcbiAgICBtb21lbnR1bTogdHJ1ZVxuICB9O1xuXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9uc1tpXSA9IG9wdGlvbnNbaV07XG4gIH1cblxuICB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSB0cnVlID8gJ3ZlcnRpY2FsJyA6IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoO1xuXG4gIC8vIElmIHlvdSB3YW50IGV2ZW50UGFzc3Rocm91Z2ggSSBoYXZlIHRvIGxvY2sgb25lIG9mIHRoZSBheGVzXG4gIHRoaXMub3B0aW9ucy5zY3JvbGxZID0gdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT09ICd2ZXJ0aWNhbCcgPyBmYWxzZSA6IHRoaXMub3B0aW9ucy5zY3JvbGxZO1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSAnaG9yaXpvbnRhbCcgPyBmYWxzZSA6IHRoaXMub3B0aW9ucy5zY3JvbGxYO1xuXG4gIHRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsID0gdGhpcy5vcHRpb25zLmZyZWVTY3JvbGwgJiYgIXRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoO1xuICB0aGlzLm9wdGlvbnMuZGlyZWN0aW9uTG9ja1RocmVzaG9sZCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID8gMCA6IHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkO1xuXG4gIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcgPSB0eXBlb2YgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyA9PSAnc3RyaW5nJyA/XG4gICAgZWFzaW5nc1t0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nXSB8fCBlYXNpbmdzLmNpcmN1bGFyIDpcbiAgICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nO1xuXG4gIHRoaXMub3B0aW9ucy5yZXNpemVQb2xsaW5nID0gdGhpcy5vcHRpb25zLnJlc2l6ZVBvbGxpbmcgPT09IHVuZGVmaW5lZCA/IDYwIDogdGhpcy5vcHRpb25zLnJlc2l6ZVBvbGxpbmc7XG5cbiAgdGhpcy54ID0gMDtcbiAgdGhpcy55ID0gMDtcbiAgdGhpcy5kaXJlY3Rpb25YID0gMDtcbiAgdGhpcy5kaXJlY3Rpb25ZID0gMDtcbiAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgdGhpcy5faW5pdCgpO1xuICB0aGlzLnJlZnJlc2goKTtcbiAgdGhpcy5zY3JvbGxUbyh0aGlzLm9wdGlvbnMuc3RhcnRYLCB0aGlzLm9wdGlvbnMuc3RhcnRZKTtcbiAgdGhpcy5lbmFibGUoKTtcbn1cblxuSXNjcm9sbC5wcm90b3R5cGUgPSB7XG5cbiAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pbml0RXZlbnRzKCk7XG4gIH0sXG5cbiAgX2luaXRFdmVudHM6IGZ1bmN0aW9uIChyZW1vdmUpIHtcbiAgICB2YXIgZXZlbnRUeXBlID0gcmVtb3ZlID8gcmVtb3ZlRXZlbnQgOiBhZGRFdmVudCxcbiAgICAgIHRhcmdldCA9IHRoaXMub3B0aW9ucy5iaW5kVG9XcmFwcGVyID8gdGhpcy53cmFwcGVyIDogd2luZG93O1xuXG4gICAgZXZlbnRUeXBlKHdpbmRvdywgJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHdpbmRvdywgJ3Jlc2l6ZScsIHRoaXMpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbGljaykge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ2NsaWNrJywgdGhpcywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZU1vdXNlKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCAnbW91c2Vkb3duJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAnbW91c2Vtb3ZlJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAnbW91c2VjYW5jZWwnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICdtb3VzZXVwJywgdGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKGhhc1BvaW50ZXIgJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlUG9pbnRlcikge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVyZG93bicpLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsIHByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcm1vdmUnKSwgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJjYW5jZWwnKSwgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJ1cCcpLCB0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAoaGFzVG91Y2ggJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlVG91Y2gpIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsICd0b3VjaHN0YXJ0JywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAndG91Y2htb3ZlJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAndG91Y2hjYW5jZWwnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICd0b3VjaGVuZCcsIHRoaXMpO1xuICAgIH1cblxuICAgIGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAndHJhbnNpdGlvbmVuZCcsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAnd2Via2l0VHJhbnNpdGlvbkVuZCcsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAnb1RyYW5zaXRpb25FbmQnLCB0aGlzKTtcbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ01TVHJhbnNpdGlvbkVuZCcsIHRoaXMpO1xuICB9LFxuXG4gIGhhbmRsZUV2ZW50OiBmdW5jdGlvbiAoZSkge1xuICAgIHN3aXRjaCAoZS50eXBlKSB7XG4gICAgICBjYXNlICd0b3VjaHN0YXJ0JzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJkb3duJzpcbiAgICAgIGNhc2UgJ01TUG9pbnRlckRvd24nOlxuICAgICAgY2FzZSAnbW91c2Vkb3duJzpcbiAgICAgICAgdGhpcy5fc3RhcnQoZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd0b3VjaG1vdmUnOlxuICAgICAgY2FzZSAncG9pbnRlcm1vdmUnOlxuICAgICAgY2FzZSAnTVNQb2ludGVyTW92ZSc6XG4gICAgICBjYXNlICdtb3VzZW1vdmUnOlxuICAgICAgICB0aGlzLl9tb3ZlKGUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndG91Y2hlbmQnOlxuICAgICAgY2FzZSAncG9pbnRlcnVwJzpcbiAgICAgIGNhc2UgJ01TUG9pbnRlclVwJzpcbiAgICAgIGNhc2UgJ21vdXNldXAnOlxuICAgICAgY2FzZSAndG91Y2hjYW5jZWwnOlxuICAgICAgY2FzZSAncG9pbnRlcmNhbmNlbCc6XG4gICAgICBjYXNlICdNU1BvaW50ZXJDYW5jZWwnOlxuICAgICAgY2FzZSAnbW91c2VjYW5jZWwnOlxuICAgICAgICB0aGlzLl9lbmQoZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnb3JpZW50YXRpb25jaGFuZ2UnOlxuICAgICAgY2FzZSAncmVzaXplJzpcbiAgICAgICAgdGhpcy5fcmVzaXplKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndHJhbnNpdGlvbmVuZCc6XG4gICAgICBjYXNlICd3ZWJraXRUcmFuc2l0aW9uRW5kJzpcbiAgICAgIGNhc2UgJ29UcmFuc2l0aW9uRW5kJzpcbiAgICAgIGNhc2UgJ01TVHJhbnNpdGlvbkVuZCc6XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25FbmQoZSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSxcblxuICBfc3RhcnQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgY29uc29sZS5sb2coJ3N0YXJ0IGV2ZW50IHR5cGU6ICcsIGUudHlwZSk7XG4gICAgLy8gUmVhY3QgdG8gbGVmdCBtb3VzZSBidXR0b24gb25seVxuICAgIGlmIChldmVudFR5cGVbZS50eXBlXSAhPT0gMSkgeyAvLyBub3QgdG91Y2ggZXZlbnRcbiAgICAgIHZhciBidXR0b247XG4gICAgICBpZiAoIWUud2hpY2gpIHtcbiAgICAgICAgLyogSUUgY2FzZSAqL1xuICAgICAgICBidXR0b24gPSAoZS5idXR0b24gPCAyKSA/IDAgOlxuICAgICAgICAgICgoZS5idXR0b24gPT0gNCkgPyAxIDogMik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvKiBBbGwgb3RoZXJzICovXG4gICAgICAgIGJ1dHRvbiA9IGUuYnV0dG9uO1xuICAgICAgfVxuXG4gICAgICAvLyBub3QgbGVmdCBtb3VzZSBidXR0b25cbiAgICAgIGlmIChidXR0b24gIT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdGhpcy5lbmFibGVkIHx8ICh0aGlzLmluaXRpYXRlZCAmJiBldmVudFR5cGVbZS50eXBlXSAhPT0gdGhpcy5pbml0aWF0ZWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdCAmJiAhaXNCYWRBbmRyb2lkICYmICFwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbihlLnRhcmdldCwgdGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0RXhjZXB0aW9uKSkge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIHZhciBwb2ludCA9IGUudG91Y2hlcyA/IGUudG91Y2hlc1swXSA6IGUsXG4gICAgICBwb3M7XG5cbiAgICB0aGlzLmluaXRpYXRlZCA9IGV2ZW50VHlwZVtlLnR5cGVdO1xuICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmRpc3RYID0gMDtcbiAgICB0aGlzLmRpc3RZID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblggPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAwO1xuXG4gICAgdGhpcy5zdGFydFRpbWUgPSBnZXRUaW1lKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgdGhpcy5pc0luVHJhbnNpdGlvbikge1xuICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWUoKTtcbiAgICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSBmYWxzZTtcbiAgICAgIHBvcyA9IHRoaXMuZ2V0Q29tcHV0ZWRQb3NpdGlvbigpO1xuICAgICAgdGhpcy5fdHJhbnNsYXRlKE1hdGgucm91bmQocG9zLngpLCBNYXRoLnJvdW5kKHBvcy55KSk7XG4gICAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRoaXMuaXNBbmltYXRpbmcpIHtcbiAgICAgIHRoaXMuaXNBbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsRW5kJyk7XG4gICAgfVxuXG4gICAgdGhpcy5zdGFydFggPSB0aGlzLng7XG4gICAgdGhpcy5zdGFydFkgPSB0aGlzLnk7XG4gICAgdGhpcy5hYnNTdGFydFggPSB0aGlzLng7XG4gICAgdGhpcy5hYnNTdGFydFkgPSB0aGlzLnk7XG4gICAgdGhpcy5wb2ludFggPSBwb2ludC5wYWdlWDtcbiAgICB0aGlzLnBvaW50WSA9IHBvaW50LnBhZ2VZO1xuXG4gICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdiZWZvcmVTY3JvbGxTdGFydCcpO1xuICB9LFxuXG4gIF9tb3ZlOiBmdW5jdGlvbiAoZSkge1xuICAgIGlmICghdGhpcy5lbmFibGVkIHx8IGV2ZW50VHlwZVtlLnR5cGVdICE9PSB0aGlzLmluaXRpYXRlZCkge1xuICAgICAgY29uc29sZS5sb2coJ2RvIG5vdCBtb3ZlIHNjcm9sbCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHQpIHtcdC8vIGluY3JlYXNlcyBwZXJmb3JtYW5jZSBvbiBBbmRyb2lkPyBUT0RPOiBjaGVjayFcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnQgPSBlLnRvdWNoZXMgPyBlLnRvdWNoZXNbMF0gOiBlLFxuICAgICAgZGVsdGFYID0gcG9pbnQucGFnZVggLSB0aGlzLnBvaW50WCwgLy8gdGhlIG1vdmVkIGRpc3RhbmNlXG4gICAgICBkZWx0YVkgPSBwb2ludC5wYWdlWSAtIHRoaXMucG9pbnRZLFxuICAgICAgdGltZXN0YW1wID0gZ2V0VGltZSgpLFxuICAgICAgbmV3WCwgbmV3WSxcbiAgICAgIGFic0Rpc3RYLCBhYnNEaXN0WTtcblxuICAgIHRoaXMucG9pbnRYID0gcG9pbnQucGFnZVg7XG4gICAgdGhpcy5wb2ludFkgPSBwb2ludC5wYWdlWTtcblxuICAgIHRoaXMuZGlzdFggKz0gZGVsdGFYO1xuICAgIHRoaXMuZGlzdFkgKz0gZGVsdGFZO1xuICAgIGFic0Rpc3RYID0gTWF0aC5hYnModGhpcy5kaXN0WCk7IC8vIGFic29sdXRlIG1vdmVkIGRpc3RhbmNlXG4gICAgYWJzRGlzdFkgPSBNYXRoLmFicyh0aGlzLmRpc3RZKTtcblxuICAgIC8qKlxuICAgICAqICBXZSBuZWVkIHRvIG1vdmUgYXQgbGVhc3QgMTAgcGl4ZWxzIGZvciB0aGUgc2Nyb2xsaW5nIHRvIGluaXRpYXRlXG4gICAgICogIHRoaXMuZW5kVGltZSBpcyBpbml0aWF0ZWQgaW4gdGhpcy5wcm90b3R5cGUucmVmcmVzaCBtZXRob2RcbiAgICAgKi9cbiAgICBpZiAodGltZXN0YW1wIC0gdGhpcy5lbmRUaW1lID4gMzAwICYmIChhYnNEaXN0WCA8IDEwICYmIGFic0Rpc3RZIDwgMTApKSB7XG4gICAgICBjb25zb2xlLmxvZygnbGVzcyB0aGFuIDEwIHB4Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgeW91IGFyZSBzY3JvbGxpbmcgaW4gb25lIGRpcmVjdGlvbiBsb2NrIHRoZSBvdGhlclxuICAgIGlmICghdGhpcy5kaXJlY3Rpb25Mb2NrZWQgJiYgIXRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsKSB7XG5cbiAgICAgIGlmIChhYnNEaXN0WCA+IGFic0Rpc3RZICsgdGhpcy5vcHRpb25zLmRpcmVjdGlvbkxvY2tUaHJlc2hvbGQpIHtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAnaCc7XHRcdC8vIGxvY2sgaG9yaXpvbnRhbGx5XG4gICAgICB9IGVsc2UgaWYgKGFic0Rpc3RZID49IGFic0Rpc3RYICsgdGhpcy5vcHRpb25zLmRpcmVjdGlvbkxvY2tUaHJlc2hvbGQpIHtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAndic7XHRcdC8vIGxvY2sgdmVydGljYWxseVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAnbic7XHRcdC8vIG5vIGxvY2tcbiAgICAgIH1cblxuICAgIH1cblxuICAgIGlmICh0aGlzLmRpcmVjdGlvbkxvY2tlZCA9PSAnaCcpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAndmVydGljYWwnKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ2hvcml6b250YWwnKSB7XG4gICAgICAgIHRoaXMuaW5pdGlhdGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZGVsdGFZID0gMDtcbiAgICB9IGVsc2UgaWYgKHRoaXMuZGlyZWN0aW9uTG9ja2VkID09ICd2Jykge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICdob3Jpem9udGFsJykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICd2ZXJ0aWNhbCcpIHtcbiAgICAgICAgdGhpcy5pbml0aWF0ZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBkZWx0YVggPSAwO1xuICAgIH1cblxuICAgIGRlbHRhWCA9IHRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCA/IGRlbHRhWCA6IDA7XG4gICAgZGVsdGFZID0gdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCA/IGRlbHRhWSA6IDA7XG5cbiAgICBuZXdYID0gdGhpcy54ICsgZGVsdGFYO1xuICAgIG5ld1kgPSB0aGlzLnkgKyBkZWx0YVk7XG5cbiAgICAvLyBTbG93IGRvd24gaWYgb3V0c2lkZSBvZiB0aGUgYm91bmRhcmllc1xuICAgIGlmIChuZXdYID4gMCB8fCBuZXdYIDwgdGhpcy5tYXhTY3JvbGxYKSB7XG4gICAgICBuZXdYID0gdGhpcy5vcHRpb25zLmJvdW5jZSA/IHRoaXMueCArIGRlbHRhWCAvIDMgOiBuZXdYID4gMCA/IDAgOiB0aGlzLm1heFNjcm9sbFg7XG4gICAgfVxuICAgIGlmIChuZXdZID4gMCB8fCBuZXdZIDwgdGhpcy5tYXhTY3JvbGxZKSB7XG4gICAgICBuZXdZID0gdGhpcy5vcHRpb25zLmJvdW5jZSA/IHRoaXMueSArIGRlbHRhWSAvIDMgOiBuZXdZID4gMCA/IDAgOiB0aGlzLm1heFNjcm9sbFk7XG4gICAgfVxuXG4gICAgdGhpcy5kaXJlY3Rpb25YID0gZGVsdGFYID4gMCA/IC0xIDogZGVsdGFYIDwgMCA/IDEgOiAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWSA9IGRlbHRhWSA+IDAgPyAtMSA6IGRlbHRhWSA8IDAgPyAxIDogMDtcblxuICAgIGlmICghdGhpcy5tb3ZlZCkge1xuICAgICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxTdGFydCcpO1xuICAgIH1cblxuICAgIHRoaXMubW92ZWQgPSB0cnVlO1xuXG4gICAgdGhpcy5fdHJhbnNsYXRlKG5ld1gsIG5ld1kpO1xuXG4gICAgaWYgKHRpbWVzdGFtcCAtIHRoaXMuc3RhcnRUaW1lID4gMzAwKSB7XG4gICAgICB0aGlzLnN0YXJ0VGltZSA9IHRpbWVzdGFtcDtcbiAgICAgIHRoaXMuc3RhcnRYID0gdGhpcy54O1xuICAgICAgdGhpcy5zdGFydFkgPSB0aGlzLnk7XG4gICAgfVxuICB9LFxuXG4gIF9lbmQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQgfHwgZXZlbnRUeXBlW2UudHlwZV0gIT09IHRoaXMuaW5pdGlhdGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdCAmJiAhcHJldmVudERlZmF1bHRFeGNlcHRpb24oZS50YXJnZXQsIHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbikpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnQgPSBlLmNoYW5nZWRUb3VjaGVzID8gZS5jaGFuZ2VkVG91Y2hlc1swXSA6IGUsXG4gICAgICBtb21lbnR1bVgsXG4gICAgICBtb21lbnR1bVksXG4gICAgICBkdXJhdGlvbiA9IGdldFRpbWUoKSAtIHRoaXMuc3RhcnRUaW1lLFxuICAgICAgbmV3WCA9IE1hdGgucm91bmQodGhpcy54KSxcbiAgICAgIG5ld1kgPSBNYXRoLnJvdW5kKHRoaXMueSksXG4gICAgICBkaXN0YW5jZVggPSBNYXRoLmFicyhuZXdYIC0gdGhpcy5zdGFydFgpLFxuICAgICAgZGlzdGFuY2VZID0gTWF0aC5hYnMobmV3WSAtIHRoaXMuc3RhcnRZKSxcbiAgICAgIHRpbWUgPSAwLFxuICAgICAgZWFzaW5nID0gJyc7XG5cbiAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gMDtcbiAgICB0aGlzLmluaXRpYXRlZCA9IDA7XG4gICAgdGhpcy5lbmRUaW1lID0gZ2V0VGltZSgpO1xuXG4gICAgLy8gcmVzZXQgaWYgd2UgYXJlIG91dHNpZGUgb2YgdGhlIGJvdW5kYXJpZXNcbiAgICBpZiAodGhpcy5yZXNldFBvc2l0aW9uKHRoaXMub3B0aW9ucy5ib3VuY2VUaW1lKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsVG8obmV3WCwgbmV3WSk7XHQvLyBlbnN1cmVzIHRoYXQgdGhlIGxhc3QgcG9zaXRpb24gaXMgcm91bmRlZFxuXG4gICAgLy8gd2Ugc2Nyb2xsZWQgbGVzcyB0aGFuIDEwIHBpeGVsc1xuICAgIGlmICghdGhpcy5tb3ZlZCkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy50YXApIHtcbiAgICAgICAgLy8gdXRpbHMudGFwKGUsIHRoaXMub3B0aW9ucy50YXApO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrKSB7XG4gICAgICAgIC8vIHV0aWxzLmNsaWNrKGUpO1xuICAgICAgfVxuXG4gICAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbENhbmNlbCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMuZmxpY2sgJiYgZHVyYXRpb24gPCAyMDAgJiYgZGlzdGFuY2VYIDwgMTAwICYmIGRpc3RhbmNlWSA8IDEwMCkge1xuICAgICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdmbGljaycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHN0YXJ0IG1vbWVudHVtIGFuaW1hdGlvbiBpZiBuZWVkZWRcbiAgICBpZiAodGhpcy5vcHRpb25zLm1vbWVudHVtICYmIGR1cmF0aW9uIDwgMzAwKSB7XG4gICAgICBtb21lbnR1bVggPSB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPyBtb21lbnR1bSh0aGlzLngsIHRoaXMuc3RhcnRYLCBkdXJhdGlvbiwgdGhpcy5tYXhTY3JvbGxYLCB0aGlzLm9wdGlvbnMuYm91bmNlID8gdGhpcy53cmFwcGVyV2lkdGggOiAwLCB0aGlzLm9wdGlvbnMuZGVjZWxlcmF0aW9uKSA6IHsgZGVzdGluYXRpb246IG5ld1gsIGR1cmF0aW9uOiAwIH07XG4gICAgICBtb21lbnR1bVkgPSB0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsID8gbW9tZW50dW0odGhpcy55LCB0aGlzLnN0YXJ0WSwgZHVyYXRpb24sIHRoaXMubWF4U2Nyb2xsWSwgdGhpcy5vcHRpb25zLmJvdW5jZSA/IHRoaXMud3JhcHBlckhlaWdodCA6IDAsIHRoaXMub3B0aW9ucy5kZWNlbGVyYXRpb24pIDogeyBkZXN0aW5hdGlvbjogbmV3WSwgZHVyYXRpb246IDAgfTtcbiAgICAgIG5ld1ggPSBtb21lbnR1bVguZGVzdGluYXRpb247XG4gICAgICBuZXdZID0gbW9tZW50dW1ZLmRlc3RpbmF0aW9uO1xuICAgICAgdGltZSA9IE1hdGgubWF4KG1vbWVudHVtWC5kdXJhdGlvbiwgbW9tZW50dW1ZLmR1cmF0aW9uKTtcbiAgICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSAxO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc25hcCkge1xuICAgICAgLy8gZG8gc29tZXRpbmdcbiAgICB9XG5cbiAgICBpZiAobmV3WCAhPSB0aGlzLnggfHwgbmV3WSAhPSB0aGlzLnkpIHtcbiAgICAgIC8vIGNoYW5nZSBlYXNpbmcgZnVuY3Rpb24gd2hlbiBzY3JvbGxlciBnb2VzIG91dCBvZiB0aGUgYm91bmRhcmllc1xuICAgICAgaWYgKG5ld1ggPiAwIHx8IG5ld1ggPCB0aGlzLm1heFNjcm9sbFggfHwgbmV3WSA+IDAgfHwgbmV3WSA8IHRoaXMubWF4U2Nyb2xsWSkge1xuICAgICAgICBlYXNpbmcgPSBlYXNpbmdzLnF1YWRyYXRpYztcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKCdlbmQgZW5kIGVuZCBlbmQhJyk7XG4gICAgICB0aGlzLnNjcm9sbFRvKG5ld1gsIG5ld1ksIHRpbWUsIGVhc2luZyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxFbmQnKTtcblxuICB9LFxuXG4gIF90cmFuc2l0aW9uRW5kOiBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLnRhcmdldCAhPSB0aGlzLnNjcm9sbGVyIHx8ICF0aGlzLmlzSW5UcmFuc2l0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fdHJhbnNpdGlvblRpbWUoKTtcbiAgICBpZiAoIXRoaXMucmVzZXRQb3NpdGlvbih0aGlzLm9wdGlvbnMuYm91bmNlVGltZSkpIHtcbiAgICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSBmYWxzZTtcbiAgICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsRW5kJyk7XG4gICAgfVxuICB9LFxuXG4gIF9yZXNpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5yZXNpemVUaW1lb3V0KTtcblxuICAgIHRoaXMucmVzaXplVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgY29uc29sZS5sb2coJ3Jlc2l6ZSBub3cnKTtcbiAgICAgIHRoYXQucmVmcmVzaCgpO1xuICAgIH0sIHRoaXMub3B0aW9ucy5yZXNpemVQb2xsaW5nKTtcbiAgfSxcblxuICBnZXRDb21wdXRlZFBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1hdHJpeCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuc2Nyb2xsZXIsIG51bGwpLFxuICAgICAgeCwgeTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMudXNlVHJhbnNmb3JtKSB7XG4gICAgICBtYXRyaXggPSBtYXRyaXhbc3R5bGVVdGlscy50cmFuc2Zvcm1dLnNwbGl0KCcpJylbMF0uc3BsaXQoJywgJyk7XG4gICAgICB4ID0gKyhtYXRyaXhbMTJdIHx8IG1hdHJpeFs0XSk7XG4gICAgICB5ID0gKyhtYXRyaXhbMTNdIHx8IG1hdHJpeFs1XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGVnLiB0cmFuc2Zvcm0gJzBweCcgdG8gMFxuICAgICAgeCA9ICttYXRyaXgubGVmdC5yZXBsYWNlKC9bXi1cXGQuXS9nLCAnJyk7XG4gICAgICB5ID0gK21hdHJpeC50b3AucmVwbGFjZSgvW14tXFxkLl0vZywgJycpO1xuICAgIH1cblxuICAgIHJldHVybiB7IHg6IHgsIHk6IHkgfTtcbiAgfSxcblxuICBzY3JvbGxUbzogZnVuY3Rpb24gKHgsIHksIHRpbWUsIGVhc2luZykge1xuICAgIGVhc2luZyA9IGVhc2luZyB8fCBlYXNpbmdzLmNpcmN1bGFyO1xuICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSB0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiB0aW1lID4gMDtcbiAgICB2YXIgdHJhbnNpdGlvblR5cGUgPSB0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiBlYXNpbmcuc3R5bGU7XG5cbiAgICBpZiAoIXRpbWUgfHwgdHJhbnNpdGlvblR5cGUpIHtcbiAgICAgIGlmICh0cmFuc2l0aW9uVHlwZSkge1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24oZWFzaW5nLnN0eWxlKTtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWUodGltZSk7XG4gICAgICB9XG4gICAgICB0aGlzLl90cmFuc2xhdGUoeCwgeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FuaW1hdGUoeCwgeSwgdGltZSwgZWFzaW5nLmZuKTtcbiAgICB9XG4gIH0sXG5cbiAgc2Nyb2xsVG9FbGVtZW50OiBmdW5jdGlvbiAoZWwsIHRpbWUsIG9mZnNldFgsIG9mZnNldFksIGVhc2luZykge1xuICAgIGVsID0gZWwubm9kZVR5cGUgPyBlbCA6IHRoaXMuc2Nyb2xsZXIucXVlcnlTZWxlY3RvcihlbCk7XG5cbiAgICAvLyBpZiBubyBlbGVtZW50IHNlbGVjdGVkLCB0aGVuIHJldHVyblxuICAgIGlmICghZWwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcG9zID0gb2Zmc2V0VXRpbHMoZWwpO1xuICB9LFxuXG4gIF90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IGZ1bmN0aW9uIChlYXNpbmdTdHlsZSkge1xuICAgIC8vIGFzc2lnbiBlYXNpbmcgY3NzIHN0eWxlIHRvIHNjcm9sbCBjb250YWluZXIgdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIHByb3BlcnR5XG4gICAgLy8gZXhhbXBsZTogY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpXG4gICAgdGhpcy5zY3JvbGxlclN0eWxlW3N0eWxlVXRpbHMudHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uXSA9IGVhc2luZ1N0eWxlO1xuICB9LFxuXG4gIF90cmFuc2l0aW9uVGltZTogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICAvLyBpZiBkbyBub3QgdXNlIHRyYW5zaXRpb24gdG8gc2Nyb2xsLCByZXR1cm5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcbiAgICAvLyB0cmFuc2l0aW9uRHVyYXRpb24gd2hpY2ggaGFzIHZlbmRvciBwcmVmaXhcbiAgICB2YXIgZHVyYXRpb25Qcm9wID0gc3R5bGVVdGlscy50cmFuc2l0aW9uRHVyYXRpb247XG4gICAgaWYgKCFkdXJhdGlvblByb3ApIHsgLy8gaWYgbm8gdmVuZG9yIGZvdW5kLCBkdXJhdGlvblByb3Agd2lsbCBiZSBmYWxzZVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gdGltZSArICdtcyc7IC8vIGFzc2lnbiBtcyB0byB0cmFuc2l0aW9uRHVyYXRpb24gcHJvcFxuXG4gICAgaWYgKCF0aW1lICYmIGlzQmFkQW5kcm9pZCkge1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSAnMC4wMDAxbXMnO1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICByQUYoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoc2VsZi5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPT09ICcwLjAwMDFtcycpIHtcbiAgICAgICAgICBzZWxmLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9ICcwcyc7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfdHJhbnNsYXRlOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgIGNvbnNvbGUubG9nKCd0cmFuc2xhdGUgbm93ISE6ICcsIHgsICcgJywgeSk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2Zvcm0pIHtcblxuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW3N0eWxlVXRpbHMudHJhbnNmb3JtXSA9XG4gICAgICAgICd0cmFuc2xhdGUoJyArIHggKyAncHgsJyArIHkgKyAncHgpJyArICd0cmFuc2xhdGVaKDApJztcblxuICAgIH0gZWxzZSB7XG4gICAgICB4ID0gTWF0aC5yb3VuZCh4KTtcbiAgICAgIHkgPSBNYXRoLnJvdW5kKHkpO1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlLmxlZnQgPSB4ICsgJ3B4JztcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZS50b3AgPSB5ICsgJ3B4JztcbiAgICB9XG5cbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gIH0sXG5cbiAgX2FuaW1hdGU6IGZ1bmN0aW9uIChkZXN0WCwgZGVzdFksIGR1cmF0aW9uLCBlYXNpbmdGbikge1xuICAgIHZhciB0aGF0ID0gdGhpcyxcbiAgICAgIHN0YXJ0WCA9IHRoaXMueCxcbiAgICAgIHN0YXJ0WSA9IHRoaXMueSxcbiAgICAgIHN0YXJ0VGltZSA9IGdldFRpbWUoKSxcbiAgICAgIGRlc3RUaW1lID0gc3RhcnRUaW1lICsgZHVyYXRpb247XG5cbiAgICBmdW5jdGlvbiBzdGVwKCkge1xuICAgICAgdmFyIG5vdyA9IGdldFRpbWUoKSxcbiAgICAgICAgbmV3WCwgbmV3WSxcbiAgICAgICAgZWFzaW5nO1xuXG4gICAgICBpZiAobm93ID49IGRlc3RUaW1lKSB7XG4gICAgICAgIHRoYXQuaXNBbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhhdC5fdHJhbnNsYXRlKGRlc3RYLCBkZXN0WSk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBub3cgPSAobm93IC0gc3RhcnRUaW1lKSAvIGR1cmF0aW9uO1xuICAgICAgZWFzaW5nID0gZWFzaW5nRm4obm93KTtcbiAgICAgIG5ld1ggPSAoZGVzdFggLSBzdGFydFgpICogZWFzaW5nICsgc3RhcnRYO1xuICAgICAgbmV3WSA9IChkZXN0WSAtIHN0YXJ0WSkgKiBlYXNpbmcgKyBzdGFydFk7XG4gICAgICB0aGF0Ll90cmFuc2xhdGUobmV3WCwgbmV3WSk7XG5cbiAgICAgIGlmICh0aGF0LmlzQW5pbWF0aW5nKSB7XG4gICAgICAgIHJBRihzdGVwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzQW5pbWF0aW5nID0gdHJ1ZTtcbiAgICBzdGVwKCk7XG4gIH0sXG5cbiAgcmVmcmVzaDogZnVuY3Rpb24gKCkge1xuICAgIGdldFJlY3QodGhpcy53cmFwcGVyKTsgLy8gRm9yY2UgcmVmbG93XG5cbiAgICB0aGlzLndyYXBwZXJXaWR0aCA9IHRoaXMud3JhcHBlci5jbGllbnRXaWR0aDtcbiAgICB0aGlzLndyYXBwZXJIZWlnaHQgPSB0aGlzLndyYXBwZXIuY2xpZW50SGVpZ2h0O1xuXG4gICAgdmFyIHJlY3QgPSBnZXRSZWN0KHRoaXMuc2Nyb2xsZXIpO1xuXG4gICAgdGhpcy5zY3JvbGxlcldpZHRoID0gcmVjdC53aWR0aDtcbiAgICB0aGlzLnNjcm9sbGVySGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XG5cbiAgICAvKipcbiAgICAgKiB0aGlzLm1heFNjcm9sbFggb3IgdGhpcy5tYXhTY3JvbGxZIHNtYWxsZXIgdGhhbiAwLCBtZWFuaW5nXG4gICAgICogb3ZlcmZsb3cgaGFwcGVuZWQuXG4gICAgICovXG4gICAgdGhpcy5tYXhTY3JvbGxYID0gdGhpcy53cmFwcGVyV2lkdGggLSB0aGlzLnNjcm9sbGVyV2lkdGg7XG4gICAgdGhpcy5tYXhTY3JvbGxZID0gdGhpcy53cmFwcGVySGVpZ2h0IC0gdGhpcy5zY3JvbGxlckhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIG9wdGlvbiBlbmFibGVzIHNjcm9sbCBBTkQgb3ZlcmZsb3cgZXhpc3RzXG4gICAgICovXG4gICAgdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsID0gdGhpcy5vcHRpb25zLnNjcm9sbFggJiYgdGhpcy5tYXhTY3JvbGxYIDwgMDtcbiAgICB0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsID0gdGhpcy5vcHRpb25zLnNjcm9sbFkgJiYgdGhpcy5tYXhTY3JvbGxZIDwgMDtcblxuICAgIGlmICghdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsKSB7XG4gICAgICB0aGlzLm1heFNjcm9sbFggPSAwO1xuICAgICAgdGhpcy5zY3JvbGxlcldpZHRoID0gdGhpcy53cmFwcGVyV2lkdGg7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsKSB7XG4gICAgICB0aGlzLm1heFNjcm9sbFkgPSAwO1xuICAgICAgdGhpcy5zY3JvbGxlckhlaWdodCA9IHRoaXMud3JhcHBlckhlaWdodDtcbiAgICB9XG5cbiAgICB0aGlzLmVuZFRpbWUgPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWCA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25ZID0gMDtcblxuICAgIGlmIChoYXNQb2ludGVyICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVBvaW50ZXIpIHtcbiAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSA9XG4gICAgICAgIGdldFRvdWNoQWN0aW9uKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoLCB0cnVlKTtcblxuICAgICAgaWYgKCF0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0pIHtcbiAgICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dID1cbiAgICAgICAgICBnZXRUb3VjaEFjdGlvbih0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCwgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMud3JhcHBlck9mZnNldCA9IG9mZnNldFV0aWxzKHRoaXMud3JhcHBlcik7XG5cbiAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3JlZnJlc2gnKTtcblxuICAgIHRoaXMucmVzZXRQb3NpdGlvbigpO1xuICB9LFxuXG4gIHJlc2V0UG9zaXRpb246IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdmFyIHggPSB0aGlzLngsXG4gICAgICB5ID0gdGhpcy55O1xuXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcblxuICAgIGlmICghdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsIHx8IHRoaXMueCA+IDApIHtcbiAgICAgIHggPSAwO1xuICAgIH0gZWxzZSBpZiAodGhpcy54IDwgdGhpcy5tYXhTY3JvbGxYKSB7XG4gICAgICB4ID0gdGhpcy5tYXhTY3JvbGxYO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCB8fCB0aGlzLnkgPiAwKSB7XG4gICAgICB5ID0gMDtcbiAgICB9IGVsc2UgaWYgKHRoaXMueSA8IHRoaXMubWF4U2Nyb2xsWSkge1xuICAgICAgeSA9IHRoaXMubWF4U2Nyb2xsWTtcbiAgICB9XG5cbiAgICBpZiAoeCA9PT0gdGhpcy54ICYmIHkgPT09IHRoaXMueSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsVG8oeCwgeSwgdGltZSwgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBkaXNhYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGVkID0gZmFsc2U7XG4gIH0sXG5cbiAgZW5hYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGVkID0gdHJ1ZTtcbiAgfVxuXG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IElzY3JvbGw7Il0sIm5hbWVzIjpbImVhc2luZ3MiLCJrIiwiTWF0aCIsInNxcnQiLCJiIiwiZiIsImUiLCJwb3ciLCJzaW4iLCJQSSIsIl9lbGVtZW50U3R5bGUiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzdHlsZSIsIl92ZW5kb3IiLCJ2ZW5kb3JzIiwidHJhbnNmb3JtIiwiaSIsImwiLCJsZW5ndGgiLCJzdWJzdHIiLCJfcHJlZml4U3R5bGUiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsImlzQmFkQW5kcm9pZCIsImFwcFZlcnNpb24iLCJ3aW5kb3ciLCJuYXZpZ2F0b3IiLCJ0ZXN0Iiwic2FmYXJpVmVyc2lvbiIsIm1hdGNoIiwicGFyc2VGbG9hdCIsImdldFRpbWUiLCJEYXRlIiwibm93Iiwib2Zmc2V0IiwiZWwiLCJsZWZ0Iiwib2Zmc2V0TGVmdCIsInRvcCIsIm9mZnNldFRvcCIsIm9mZnNldFBhcmVudCIsImdldFJlY3QiLCJTVkdFbGVtZW50IiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsIndpZHRoIiwiaGVpZ2h0Iiwib2Zmc2V0V2lkdGgiLCJvZmZzZXRIZWlnaHQiLCJoYXNQb2ludGVyIiwiUG9pbnRlckV2ZW50IiwiTVNQb2ludGVyRXZlbnQiLCJoYXNUb3VjaCIsImdldFRvdWNoQWN0aW9uIiwiZXZlbnRQYXNzdGhyb3VnaCIsImFkZFBpbmNoIiwidG91Y2hBY3Rpb24iLCJhZGRFdmVudCIsInR5cGUiLCJmbiIsImNhcHR1cmUiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnQiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwicHJlZml4UG9pbnRlckV2ZW50IiwicG9pbnRlckV2ZW50IiwiZXZlbnRUeXBlIiwicHJldmVudERlZmF1bHRFeGNlcHRpb24iLCJleGNlcHRpb25zIiwibW9tZW50dW0iLCJjdXJyZW50Iiwic3RhcnQiLCJ0aW1lIiwibG93ZXJNYXJnaW4iLCJ3cmFwcGVyU2l6ZSIsImRlY2VsZXJhdGlvbiIsImRpc3RhbmNlIiwic3BlZWQiLCJhYnMiLCJkZXN0aW5hdGlvbiIsImR1cmF0aW9uIiwidW5kZWZpbmVkIiwicm91bmQiLCJyQUYiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ3ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJtb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJvUmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwibXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJjYWxsYmFjayIsInNldFRpbWVvdXQiLCJJc2Nyb2xsIiwiZWxlbSIsIm9wdGlvbnMiLCJ3cmFwcGVyIiwicXVlcnlTZWxlY3RvciIsInNjcm9sbGVyIiwiY2hpbGRyZW4iLCJzY3JvbGxlclN0eWxlIiwib25tb3VzZWRvd24iLCJ0YWdOYW1lIiwic2Nyb2xsWSIsInNjcm9sbFgiLCJmcmVlU2Nyb2xsIiwiZGlyZWN0aW9uTG9ja1RocmVzaG9sZCIsImJvdW5jZUVhc2luZyIsImNpcmN1bGFyIiwicmVzaXplUG9sbGluZyIsIngiLCJ5IiwiZGlyZWN0aW9uWCIsImRpcmVjdGlvblkiLCJfZXZlbnRzIiwiX2luaXQiLCJyZWZyZXNoIiwic2Nyb2xsVG8iLCJzdGFydFgiLCJzdGFydFkiLCJlbmFibGUiLCJwcm90b3R5cGUiLCJfaW5pdEV2ZW50cyIsInJlbW92ZSIsInRhcmdldCIsImJpbmRUb1dyYXBwZXIiLCJjbGljayIsImRpc2FibGVNb3VzZSIsImRpc2FibGVQb2ludGVyIiwiZGlzYWJsZVRvdWNoIiwiX3N0YXJ0IiwiX21vdmUiLCJfZW5kIiwiX3Jlc2l6ZSIsIl90cmFuc2l0aW9uRW5kIiwibG9nIiwiYnV0dG9uIiwid2hpY2giLCJlbmFibGVkIiwiaW5pdGlhdGVkIiwicHJldmVudERlZmF1bHQiLCJwb2ludCIsInRvdWNoZXMiLCJwb3MiLCJtb3ZlZCIsImRpc3RYIiwiZGlzdFkiLCJkaXJlY3Rpb25Mb2NrZWQiLCJzdGFydFRpbWUiLCJ1c2VUcmFuc2l0aW9uIiwiaXNJblRyYW5zaXRpb24iLCJfdHJhbnNpdGlvblRpbWUiLCJnZXRDb21wdXRlZFBvc2l0aW9uIiwiX3RyYW5zbGF0ZSIsImlzQW5pbWF0aW5nIiwiYWJzU3RhcnRYIiwiYWJzU3RhcnRZIiwicG9pbnRYIiwicGFnZVgiLCJwb2ludFkiLCJwYWdlWSIsImRlbHRhWCIsInRpbWVzdGFtcCIsIm5ld1giLCJuZXdZIiwiYWJzRGlzdFgiLCJhYnNEaXN0WSIsImRlbHRhWSIsImVuZFRpbWUiLCJoYXNIb3Jpem9udGFsU2Nyb2xsIiwiaGFzVmVydGljYWxTY3JvbGwiLCJtYXhTY3JvbGxYIiwiYm91bmNlIiwibWF4U2Nyb2xsWSIsImNoYW5nZWRUb3VjaGVzIiwibW9tZW50dW1YIiwibW9tZW50dW1ZIiwiZGlzdGFuY2VYIiwiZGlzdGFuY2VZIiwiZWFzaW5nIiwicmVzZXRQb3NpdGlvbiIsImJvdW5jZVRpbWUiLCJ0YXAiLCJmbGljayIsIndyYXBwZXJXaWR0aCIsIndyYXBwZXJIZWlnaHQiLCJtYXgiLCJzbmFwIiwicXVhZHJhdGljIiwidGhhdCIsInJlc2l6ZVRpbWVvdXQiLCJtYXRyaXgiLCJnZXRDb21wdXRlZFN0eWxlIiwidXNlVHJhbnNmb3JtIiwic3R5bGVVdGlscyIsInNwbGl0IiwicmVwbGFjZSIsInRyYW5zaXRpb25UeXBlIiwiX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiIsIl9hbmltYXRlIiwib2Zmc2V0WCIsIm9mZnNldFkiLCJub2RlVHlwZSIsIm9mZnNldFV0aWxzIiwiZWFzaW5nU3R5bGUiLCJ0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJkdXJhdGlvblByb3AiLCJ0cmFuc2l0aW9uRHVyYXRpb24iLCJzZWxmIiwiZGVzdFgiLCJkZXN0WSIsImVhc2luZ0ZuIiwiZGVzdFRpbWUiLCJzdGVwIiwiY2xpZW50V2lkdGgiLCJjbGllbnRIZWlnaHQiLCJzY3JvbGxlcldpZHRoIiwic2Nyb2xsZXJIZWlnaHQiLCJ3cmFwcGVyT2Zmc2V0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxJQUFJQSxVQUFVO2FBQ0Q7V0FDRixzQ0FERTtRQUVMLFVBQVVDLENBQVYsRUFBYTthQUNSQSxLQUFLLElBQUlBLENBQVQsQ0FBUDs7R0FKUTtZQU9GO1dBQ0QsaUNBREM7UUFFSixVQUFVQSxDQUFWLEVBQWE7YUFDUkMsS0FBS0MsSUFBTCxDQUFVLElBQUssRUFBRUYsQ0FBRixHQUFNQSxDQUFyQixDQUFQOztHQVZRO1FBYU47V0FDRyx5Q0FESDtRQUVBLFVBQVVBLENBQVYsRUFBYTtVQUNYRyxJQUFJLENBQVI7YUFDTyxDQUFDSCxJQUFJQSxJQUFJLENBQVQsSUFBY0EsQ0FBZCxJQUFtQixDQUFDRyxJQUFJLENBQUwsSUFBVUgsQ0FBVixHQUFjRyxDQUFqQyxJQUFzQyxDQUE3Qzs7R0FqQlE7VUFvQko7V0FDQyxFQUREO1FBRUYsVUFBVUgsQ0FBVixFQUFhO1VBQ1gsQ0FBQ0EsS0FBSyxDQUFOLElBQVksSUFBSSxJQUFwQixFQUEyQjtlQUNsQixTQUFTQSxDQUFULEdBQWFBLENBQXBCO09BREYsTUFFTyxJQUFJQSxJQUFLLElBQUksSUFBYixFQUFvQjtlQUNsQixVQUFVQSxLQUFNLE1BQU0sSUFBdEIsSUFBK0JBLENBQS9CLEdBQW1DLElBQTFDO09BREssTUFFQSxJQUFJQSxJQUFLLE1BQU0sSUFBZixFQUFzQjtlQUNwQixVQUFVQSxLQUFNLE9BQU8sSUFBdkIsSUFBZ0NBLENBQWhDLEdBQW9DLE1BQTNDO09BREssTUFFQTtlQUNFLFVBQVVBLEtBQU0sUUFBUSxJQUF4QixJQUFpQ0EsQ0FBakMsR0FBcUMsUUFBNUM7OztHQTlCTTtXQWtDSDtXQUNBLEVBREE7UUFFSCxVQUFVQSxD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

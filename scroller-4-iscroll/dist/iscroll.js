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
      this._execEvent('scrollEnd');
    } else if (!this.options.useTransition && this.isAnimating) {
      this.isAnimating = false;
      this._execEvent('scrollEnd');
    }

    this.startX = this.x;
    this.startY = this.y;
    this.absStartX = this.x;
    this.absStartY = this.y;
    this.pointX = point.pageX;
    this.pointY = point.pageY;

    this._execEvent('beforeScrollStart');
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
      console.log('xxxxxxxx');
      newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX;
    }
    if (newY > 0 || newY < this.maxScrollY) {
      console.log('yyyyyyyy');
      newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY;
    }

    this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
    this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

    if (!this.moved) {
      this._execEvent('scrollStart');
    }

    this.moved = true;

    console.log('newX: ', newX, 'newY: ', newY);
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

      if (this.options.click) {
        // utils.click(e);
      }

      this._execEvent('scrollCancel');
      return;
    }

    if (this._events.flick && duration < 200 && distanceX < 100 && distanceY < 100) {
      this._execEvent('flick');
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

    this._execEvent('scrollEnd');
  },

  _transitionEnd: function (e) {
    if (e.target != this.scroller || !this.isInTransition) {
      return;
    }

    this._transitionTime();
    if (!this.resetPosition(this.options.bounceTime)) {
      this.isInTransition = false;
      this._execEvent('scrollEnd');
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

  on: function (type, fn) {
    if (!this._events[type]) {
      this._events[type] = [];
    }

    this._events[type].push(fn);
  },

  off: function (type, fn) {
    if (!this._events[type]) {
      return;
    }

    var index = this._events[type].indexOf(fn);

    if (index > -1) {
      this._events[type].splice(index, 1);
    }
  },

  _execEvent: function (type) {
    if (!this._events[type]) {
      return;
    }

    var i = 0,
        l = this._events[type].length;

    if (!l) {
      return;
    }

    for (; i < l; i++) {
      this._events[type][i].apply(this, [].slice.call(arguments, 1));
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

    pos.left -= this.wrapperOffset.left;
    pos.top -= this.wrapperOffset.top;

    // if offsetX/Y are true we center the element to the screen
    var elRect = getRect(el);
    var wrapperRect = getRect(this.wrapper);
    if (offsetX === true) {
      offsetX = Math.round(elRect.width / 2 - wrapperRect.width / 2);
    }
    if (offsetY === true) {
      offsetY = Math.round(elRect.height / 2 - wrapperRect.height / 2);
    }

    pos.left -= offsetX || 0;
    pos.top -= offsetY || 0;

    pos.left = pos.left > 0 ? 0 : pos.left < this.maxScrollX ? this.maxScrollX : pos.left;
    pos.top = pos.top > 0 ? 0 : pos.top < this.maxScrollY ? this.maxScrollY : pos.top;

    time = time === undefined || time === null || time === 'auto' ? Math.max(Math.abs(this.x - pos.left), Math.abs(this.y - pos.top)) : time;

    this.scrollTo(pos.left, pos.top, time, easing);
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

    this._execEvent('refresh');

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL3V0aWxzL2Vhc2luZ3MuanMiLCIuLi9zcmMvdXRpbHMvc3R5bGUuanMiLCIuLi9zcmMvdXRpbHMvaXNCYWRBbmRyb2lkLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRpbWUuanMiLCIuLi9zcmMvdXRpbHMvb2Zmc2V0LmpzIiwiLi4vc3JjL3V0aWxzL2dldFJlY3QuanMiLCIuLi9zcmMvdXRpbHMvZGV0ZWN0b3IuanMiLCIuLi9zcmMvdXRpbHMvZ2V0VG91Y2hBY3Rpb24uanMiLCIuLi9zcmMvdXRpbHMvZXZlbnRIYW5kbGVyLmpzIiwiLi4vc3JjL3V0aWxzL3ByZWZpeFBvaW50ZXJFdmVudC5qcyIsIi4uL3NyYy91dGlscy9ldmVudFR5cGUuanMiLCIuLi9zcmMvdXRpbHMvcHJldmVudERlZmF1bHRFeGNlcHRpb24uanMiLCIuLi9zcmMvdXRpbHMvbW9tZW50dW0uanMiLCIuLi9zcmMvbXktaXNjcm9sbC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZWFzaW5ncyA9IHtcbiAgcXVhZHJhdGljOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4yNSwgMC40NiwgMC40NSwgMC45NCknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIGsgKiAoMiAtIGspO1xuICAgIH1cbiAgfSxcbiAgY2lyY3VsYXI6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjEsIDAuNTcsIDAuMSwgMSknLFx0Ly8gTm90IHByb3Blcmx5IFwiY2lyY3VsYXJcIiBidXQgdGhpcyBsb29rcyBiZXR0ZXIsIGl0IHNob3VsZCBiZSAoMC4wNzUsIDAuODIsIDAuMTY1LCAxKVxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIE1hdGguc3FydCgxIC0gKC0tayAqIGspKTtcbiAgICB9XG4gIH0sXG4gIGJhY2s6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjE3NSwgMC44ODUsIDAuMzIsIDEuMjc1KScsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICB2YXIgYiA9IDQ7XG4gICAgICByZXR1cm4gKGsgPSBrIC0gMSkgKiBrICogKChiICsgMSkgKiBrICsgYikgKyAxO1xuICAgIH1cbiAgfSxcbiAgYm91bmNlOiB7XG4gICAgc3R5bGU6ICcnLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgaWYgKChrIC89IDEpIDwgKDEgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogayAqIGs7XG4gICAgICB9IGVsc2UgaWYgKGsgPCAoMiAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMS41IC8gMi43NSkpICogayArIDAuNzU7XG4gICAgICB9IGVsc2UgaWYgKGsgPCAoMi41IC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjI1IC8gMi43NSkpICogayArIDAuOTM3NTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi42MjUgLyAyLjc1KSkgKiBrICsgMC45ODQzNzU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBlbGFzdGljOiB7XG4gICAgc3R5bGU6ICcnLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGYgPSAwLjIyLFxuICAgICAgICBlID0gMC40O1xuXG4gICAgICBpZiAoayA9PT0gMCkgeyByZXR1cm4gMDsgfVxuICAgICAgaWYgKGsgPT0gMSkgeyByZXR1cm4gMTsgfVxuXG4gICAgICByZXR1cm4gKGUgKiBNYXRoLnBvdygyLCAtIDEwICogaykgKiBNYXRoLnNpbigoayAtIGYgLyA0KSAqICgyICogTWF0aC5QSSkgLyBmKSArIDEpO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgZWFzaW5nczsiLCJ2YXIgX2VsZW1lbnRTdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlO1xuXG52YXIgX3ZlbmRvciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciB2ZW5kb3JzID0gWyd0JywgJ3dlYmtpdFQnLCAnTW96VCcsICdtc1QnLCAnT1QnXSxcbiAgICB0cmFuc2Zvcm0sXG4gICAgaSA9IDAsXG4gICAgbCA9IHZlbmRvcnMubGVuZ3RoO1xuXG4gIHdoaWxlIChpIDwgbCkge1xuICAgIHRyYW5zZm9ybSA9IHZlbmRvcnNbaV0gKyAncmFuc2Zvcm0nO1xuICAgIGlmICh0cmFuc2Zvcm0gaW4gX2VsZW1lbnRTdHlsZSkge1xuICAgICAgcmV0dXJuIHZlbmRvcnNbaV0uc3Vic3RyKDAsIHZlbmRvcnNbaV0ubGVuZ3RoIC0gMSk7XG4gICAgfVxuICAgIGkrKztcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn0pKCk7XG5cbmZ1bmN0aW9uIF9wcmVmaXhTdHlsZSAoc3R5bGUpIHtcbiAgaWYgKCBfdmVuZG9yID09PSBmYWxzZSApIHJldHVybiBmYWxzZTsgLy8gbm8gdmVuZG9yIGZvdW5kXG4gIGlmICggX3ZlbmRvciA9PT0gJycgKSByZXR1cm4gc3R5bGU7IC8vIG5vIHByZWZpeCBuZWVkZWRcbiAgcmV0dXJuIF92ZW5kb3IgKyBzdHlsZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0eWxlLnN1YnN0cigxKTsgLy8gb3RoZXJ3aXNlIGFkZCBwcmVmaXhcbn1cblxuLy8gc3R5bGUgdGhhdCBoYXMgdmVuZG9yIHByZWZpeCwgZWc6IHdlYmtpdFRyYW5zZm9ybVxudmFyIHN0eWxlID0ge1xuICB0cmFuc2Zvcm06IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtJyksXG4gIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24nKSxcbiAgdHJhbnNpdGlvbkR1cmF0aW9uOiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EdXJhdGlvbicpLFxuICB0cmFuc2l0aW9uRGVsYXk6IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvbkRlbGF5JyksXG4gIHRyYW5zZm9ybU9yaWdpbjogX3ByZWZpeFN0eWxlKCd0cmFuc2Zvcm1PcmlnaW4nKSxcbiAgdG91Y2hBY3Rpb246IF9wcmVmaXhTdHlsZSgndG91Y2hBY3Rpb24nKVxufTtcblxuZXhwb3J0IGRlZmF1bHQgc3R5bGU7IiwidmFyIGlzQmFkQW5kcm9pZCA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBhcHBWZXJzaW9uID0gd2luZG93Lm5hdmlnYXRvci5hcHBWZXJzaW9uO1xuXG4gIGlmICgvQW5kcm9pZC8udGVzdChhcHBWZXJzaW9uKSAmJiAhKC9DaHJvbWVcXC9cXGQvLnRlc3QoYXBwVmVyc2lvbikpKSB7XG4gICAgdmFyIHNhZmFyaVZlcnNpb24gPSBhcHBWZXJzaW9uLm1hdGNoKC9TYWZhcmlcXC8oXFxkKy5cXGQpLyk7XG4gICAgaWYoc2FmYXJpVmVyc2lvbiAmJiB0eXBlb2Ygc2FmYXJpVmVyc2lvbiA9PT0gXCJvYmplY3RcIiAmJiBzYWZhcmlWZXJzaW9uLmxlbmd0aCA+PSAyKSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdChzYWZhcmlWZXJzaW9uWzFdKSA8IDUzNS4xOTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSkoKTtcblxuZXhwb3J0IGRlZmF1bHQgaXNCYWRBbmRyb2lkOyIsIi8qKlxuICogMS4gRGF0ZS5wcm90b3R5cGUuZ2V0VGltZSBoYXMgQkVUVEVSIGNvbXBhdGliaWxpdHkgdGhhbiBEYXRlLm5vd1xuICogcmVmZXJlbmNlOiBcbiAqICBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9EYXRlL2dldFRpbWUjQnJvd3Nlcl9jb21wYXRpYmlsaXR5XG4gKiAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9ub3cjQnJvd3Nlcl9jb21wYXRpYmlsaXR5XG4gKiBcbiAqIDIuIERhdGUucHJvdG90eXBlLmdldFRpbWUgc3BlZWQgaXMgU0xPV1NFUiB0aGFuIERhdGUubm93XG4gKiByZWZlcmVuY2U6XG4gKiAgaHR0cHM6Ly9qc3BlcmYuY29tL2RhdGUtbm93LXZzLWRhdGUtZ2V0dGltZS83XG4gKi9cblxudmFyIGdldFRpbWUgPSBEYXRlLm5vdyB8fFxuICBmdW5jdGlvbiBnZXRUaW1lKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfTtcblxuZXhwb3J0IGRlZmF1bHQgZ2V0VGltZTsiLCJ2YXIgb2Zmc2V0ID0gZnVuY3Rpb24gKGVsKSB7XG4gIHZhciBsZWZ0ID0gLWVsLm9mZnNldExlZnQsXG4gIHRvcCA9IC1lbC5vZmZzZXRUb3A7XG5cbiAgLyoqXG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9IVE1MRWxlbWVudC9vZmZzZXRQYXJlbnRcbiAgICogUmV0dXJucyBudWxsIHdoZW4gdGhlIGVsZW1lbnQgaGFzIHN0eWxlLmRpc3BsYXkgc2V0IHRvIFwibm9uZVwiLiBUaGUgb2Zmc2V0UGFyZW50IFxuICAgKiBpcyB1c2VmdWwgYmVjYXVzZSBvZmZzZXRUb3AgYW5kIG9mZnNldExlZnQgYXJlIHJlbGF0aXZlIHRvIGl0cyBwYWRkaW5nIGVkZ2UuXG4gICAqL1xuICB3aGlsZSAoZWwgPSBlbC5vZmZzZXRQYXJlbnQpIHtcbiAgICBsZWZ0IC09IGVsLm9mZnNldExlZnQ7XG4gICAgdG9wIC09IGVsLm9mZnNldFRvcDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbGVmdDogbGVmdCxcbiAgICB0b3A6IHRvcFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBvZmZzZXQ7IiwiZnVuY3Rpb24gZ2V0UmVjdChlbCkge1xuICBpZiAoZWwgaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB7XG4gICAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIHJldHVybiB7XG4gICAgICB0b3AgOiByZWN0LnRvcCxcbiAgICAgIGxlZnQgOiByZWN0LmxlZnQsXG4gICAgICB3aWR0aCA6IHJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQgOiByZWN0LmhlaWdodFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgdG9wIDogZWwub2Zmc2V0VG9wLFxuICAgICAgbGVmdCA6IGVsLm9mZnNldExlZnQsXG4gICAgICB3aWR0aCA6IGVsLm9mZnNldFdpZHRoLFxuICAgICAgaGVpZ2h0IDogZWwub2Zmc2V0SGVpZ2h0XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRSZWN0OyIsInZhciBoYXNQb2ludGVyID0gISEod2luZG93LlBvaW50ZXJFdmVudCB8fCB3aW5kb3cuTVNQb2ludGVyRXZlbnQpOyAvLyBJRTEwIGlzIHByZWZpeGVkXG52YXIgaGFzVG91Y2ggPSAnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3c7XG5cbmV4cG9ydCB7XG4gIGhhc1BvaW50ZXIsXG4gIGhhc1RvdWNoXG59IiwidmFyIGdldFRvdWNoQWN0aW9uID0gZnVuY3Rpb24gKGV2ZW50UGFzc3Rocm91Z2gsIGFkZFBpbmNoKSB7XG4gIHZhciB0b3VjaEFjdGlvbiA9ICdub25lJztcbiAgaWYgKGV2ZW50UGFzc3Rocm91Z2ggPT09ICd2ZXJ0aWNhbCcpIHtcbiAgICB0b3VjaEFjdGlvbiA9ICdwYW4teSc7XG4gIH0gZWxzZSBpZiAoZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ2hvcml6b250YWwnKSB7XG4gICAgdG91Y2hBY3Rpb24gPSAncGFuLXgnO1xuICB9XG5cbiAgaWYgKGFkZFBpbmNoICYmIHRvdWNoQWN0aW9uICE9ICdub25lJykge1xuICAgIC8vIGFkZCBwaW5jaC16b29tIHN1cHBvcnQgaWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgaXQsIGJ1dCBpZiBub3QgKGVnLiBDaHJvbWUgPDU1KSBkbyBub3RoaW5nXG4gICAgdG91Y2hBY3Rpb24gKz0gJyBwaW5jaC16b29tJztcbiAgfVxuICByZXR1cm4gdG91Y2hBY3Rpb247XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdldFRvdWNoQWN0aW9uOyIsImZ1bmN0aW9uIGFkZEV2ZW50IChlbCwgdHlwZSwgZm4sIGNhcHR1cmUpIHtcbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgISFjYXB0dXJlKTtcbn07XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50IChlbCwgdHlwZSwgZm4sIGNhcHR1cmUpIHtcbiAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgISFjYXB0dXJlKTtcbn1cblxuZXhwb3J0IHtcbiAgYWRkRXZlbnQsXG4gIHJlbW92ZUV2ZW50XG59OyIsImZ1bmN0aW9uIHByZWZpeFBvaW50ZXJFdmVudCAocG9pbnRlckV2ZW50KSB7XG4gIHJldHVybiB3aW5kb3cuTVNQb2ludGVyRXZlbnQgPyBcbiAgICAnTVNQb2ludGVyJyArIHBvaW50ZXJFdmVudC5jaGFyQXQoNykudG9VcHBlckNhc2UoKSArIHBvaW50ZXJFdmVudC5zdWJzdHIoOCkgOlxuICAgIHBvaW50ZXJFdmVudDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgcHJlZml4UG9pbnRlckV2ZW50OyIsInZhciBldmVudFR5cGUgPSB7XG4gIHRvdWNoc3RhcnQ6IDEsXG4gIHRvdWNobW92ZTogMSxcbiAgdG91Y2hlbmQ6IDEsXG5cbiAgbW91c2Vkb3duOiAyLFxuICBtb3VzZW1vdmU6IDIsXG4gIG1vdXNldXA6IDIsXG5cbiAgcG9pbnRlcmRvd246IDMsXG4gIHBvaW50ZXJtb3ZlOiAzLFxuICBwb2ludGVydXA6IDMsXG5cbiAgTVNQb2ludGVyRG93bjogMyxcbiAgTVNQb2ludGVyTW92ZTogMyxcbiAgTVNQb2ludGVyVXA6IDNcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGV2ZW50VHlwZTsiLCJ2YXIgcHJldmVudERlZmF1bHRFeGNlcHRpb24gPSBmdW5jdGlvbiAoZWwsIGV4Y2VwdGlvbnMpIHtcbiAgZm9yICh2YXIgaSBpbiBleGNlcHRpb25zKSB7XG4gICAgaWYgKCBleGNlcHRpb25zW2ldLnRlc3QoZWxbaV0pICkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgcHJldmVudERlZmF1bHRFeGNlcHRpb247IiwidmFyIG1vbWVudHVtID0gZnVuY3Rpb24gKGN1cnJlbnQsIHN0YXJ0LCB0aW1lLCBsb3dlck1hcmdpbiwgd3JhcHBlclNpemUsIGRlY2VsZXJhdGlvbikge1xuICB2YXIgZGlzdGFuY2UgPSBjdXJyZW50IC0gc3RhcnQsXG4gICAgc3BlZWQgPSBNYXRoLmFicyhkaXN0YW5jZSkgLyB0aW1lLFxuICAgIGRlc3RpbmF0aW9uLFxuICAgIGR1cmF0aW9uO1xuXG4gIGRlY2VsZXJhdGlvbiA9IGRlY2VsZXJhdGlvbiA9PT0gdW5kZWZpbmVkID8gMC4wMDA2IDogZGVjZWxlcmF0aW9uO1xuXG4gIGRlc3RpbmF0aW9uID0gY3VycmVudCArICggc3BlZWQgKiBzcGVlZCApIC8gKCAyICogZGVjZWxlcmF0aW9uICkgKiAoIGRpc3RhbmNlIDwgMCA/IC0xIDogMSApO1xuICBkdXJhdGlvbiA9IHNwZWVkIC8gZGVjZWxlcmF0aW9uO1xuXG4gIGlmICggZGVzdGluYXRpb24gPCBsb3dlck1hcmdpbiApIHtcbiAgICBkZXN0aW5hdGlvbiA9IHdyYXBwZXJTaXplID8gbG93ZXJNYXJnaW4gLSAoIHdyYXBwZXJTaXplIC8gMi41ICogKCBzcGVlZCAvIDggKSApIDogbG93ZXJNYXJnaW47XG4gICAgZGlzdGFuY2UgPSBNYXRoLmFicyhkZXN0aW5hdGlvbiAtIGN1cnJlbnQpO1xuICAgIGR1cmF0aW9uID0gZGlzdGFuY2UgLyBzcGVlZDtcbiAgfSBlbHNlIGlmICggZGVzdGluYXRpb24gPiAwICkge1xuICAgIGRlc3RpbmF0aW9uID0gd3JhcHBlclNpemUgPyB3cmFwcGVyU2l6ZSAvIDIuNSAqICggc3BlZWQgLyA4ICkgOiAwO1xuICAgIGRpc3RhbmNlID0gTWF0aC5hYnMoY3VycmVudCkgKyBkZXN0aW5hdGlvbjtcbiAgICBkdXJhdGlvbiA9IGRpc3RhbmNlIC8gc3BlZWQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGRlc3RpbmF0aW9uOiBNYXRoLnJvdW5kKGRlc3RpbmF0aW9uKSxcbiAgICBkdXJhdGlvbjogZHVyYXRpb25cbiAgfTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgbW9tZW50dW07IiwiaW1wb3J0IGVhc2luZ3MgZnJvbSAnLi91dGlscy9lYXNpbmdzJztcbmltcG9ydCBzdHlsZVV0aWxzIGZyb20gJy4vdXRpbHMvc3R5bGUnO1xuaW1wb3J0IGlzQmFkQW5kcm9pZCBmcm9tICcuL3V0aWxzL2lzQmFkQW5kcm9pZCc7XG5pbXBvcnQgZ2V0VGltZSBmcm9tICcuL3V0aWxzL2dldFRpbWUnO1xuaW1wb3J0IG9mZnNldFV0aWxzIGZyb20gJy4vdXRpbHMvb2Zmc2V0JztcbmltcG9ydCBnZXRSZWN0IGZyb20gJy4vdXRpbHMvZ2V0UmVjdCc7XG5pbXBvcnQgeyBoYXNQb2ludGVyLCBoYXNUb3VjaCB9IGZyb20gJy4vdXRpbHMvZGV0ZWN0b3InO1xuaW1wb3J0IGdldFRvdWNoQWN0aW9uIGZyb20gJy4vdXRpbHMvZ2V0VG91Y2hBY3Rpb24nO1xuaW1wb3J0IHsgYWRkRXZlbnQsIHJlbW92ZUV2ZW50IH0gZnJvbSAnLi91dGlscy9ldmVudEhhbmRsZXInO1xuaW1wb3J0IHByZWZpeFBvaW50ZXJFdmVudCBmcm9tICcuL3V0aWxzL3ByZWZpeFBvaW50ZXJFdmVudCc7XG5pbXBvcnQgZXZlbnRUeXBlIGZyb20gJy4vdXRpbHMvZXZlbnRUeXBlJztcbmltcG9ydCBwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbiBmcm9tICcuL3V0aWxzL3ByZXZlbnREZWZhdWx0RXhjZXB0aW9uJztcbmltcG9ydCBtb21lbnR1bSBmcm9tICcuL3V0aWxzL21vbWVudHVtJztcblxuLy8gZGVhbCB3aXRoIHJlcXVlc3RBbmltYXRpb25GcmFtZSBjb21wYXRiaWxpdHlcbnZhciByQUYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7IHdpbmRvdy5zZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApOyB9O1xuXG5mdW5jdGlvbiBJc2Nyb2xsKGVsZW0sIG9wdGlvbnMpIHtcbiAgLyoqXG4gICAqIGdldCBzY3JvbGwgbm9kZSBlbGVtZW50XG4gICAqL1xuICB0aGlzLndyYXBwZXIgPSB0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pIDogZWxlbTtcbiAgdGhpcy5zY3JvbGxlciA9IHRoaXMud3JhcHBlci5jaGlsZHJlblswXTtcbiAgdGhpcy5zY3JvbGxlclN0eWxlID0gdGhpcy5zY3JvbGxlci5zdHlsZTtcblxuICAvKipcbiAgICogbWVyZ2UgZGVmYXVsdCBvcHRpb25zIGFuZCBjdXN0b21pemVkIG9wdGlvbnNcbiAgICovXG4gIHRoaXMub3B0aW9ucyA9IHtcbiAgICBkaXNhYmxlUG9pbnRlcjogIWhhc1BvaW50ZXIsXG4gICAgZGlzYWJsZVRvdWNoOiBoYXNQb2ludGVyIHx8ICFoYXNUb3VjaCxcbiAgICBkaXNhYmxlTW91c2U6IGhhc1BvaW50ZXIgfHwgIWhhc1RvdWNoLFxuICAgIHVzZVRyYW5zaXRpb246IHRydWUsXG4gICAgdXNlVHJhbnNmb3JtOiB0cnVlLFxuICAgIHNjcm9sbFk6IHRydWUsXG4gICAgc3RhcnRYOiAwLFxuICAgIHN0YXJ0WTogMCxcbiAgICBiaW5kVG9XcmFwcGVyOiB0eXBlb2Ygd2luZG93Lm9ubW91c2Vkb3duID09PSBcInVuZGVmaW5lZFwiLFxuICAgIHByZXZlbnREZWZhdWx0OiB0cnVlLFxuICAgIHByZXZlbnREZWZhdWx0RXhjZXB0aW9uOiB7IHRhZ05hbWU6IC9eKElOUFVUfFRFWFRBUkVBfEJVVFRPTnxTRUxFQ1QpJC8gfSxcbiAgICBkaXJlY3Rpb25Mb2NrVGhyZXNob2xkOiA1LFxuICAgIGJvdW5jZTogdHJ1ZSxcbiAgICBib3VuY2VUaW1lOiA2MDAsXG4gICAgYm91bmNlRWFzaW5nOiAnJyxcbiAgICBtb21lbnR1bTogdHJ1ZVxuICB9O1xuXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9uc1tpXSA9IG9wdGlvbnNbaV07XG4gIH1cblxuICB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSB0cnVlID8gJ3ZlcnRpY2FsJyA6IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoO1xuXG4gIC8vIElmIHlvdSB3YW50IGV2ZW50UGFzc3Rocm91Z2ggSSBoYXZlIHRvIGxvY2sgb25lIG9mIHRoZSBheGVzXG4gIHRoaXMub3B0aW9ucy5zY3JvbGxZID0gdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT09ICd2ZXJ0aWNhbCcgPyBmYWxzZSA6IHRoaXMub3B0aW9ucy5zY3JvbGxZO1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSAnaG9yaXpvbnRhbCcgPyBmYWxzZSA6IHRoaXMub3B0aW9ucy5zY3JvbGxYO1xuXG4gIHRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsID0gdGhpcy5vcHRpb25zLmZyZWVTY3JvbGwgJiYgIXRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoO1xuICB0aGlzLm9wdGlvbnMuZGlyZWN0aW9uTG9ja1RocmVzaG9sZCA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID8gMCA6IHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkO1xuXG4gIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcgPSB0eXBlb2YgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyA9PSAnc3RyaW5nJyA/XG4gICAgZWFzaW5nc1t0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nXSB8fCBlYXNpbmdzLmNpcmN1bGFyIDpcbiAgICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nO1xuXG4gIHRoaXMub3B0aW9ucy5yZXNpemVQb2xsaW5nID0gdGhpcy5vcHRpb25zLnJlc2l6ZVBvbGxpbmcgPT09IHVuZGVmaW5lZCA/IDYwIDogdGhpcy5vcHRpb25zLnJlc2l6ZVBvbGxpbmc7XG5cbiAgdGhpcy54ID0gMDtcbiAgdGhpcy55ID0gMDtcbiAgdGhpcy5kaXJlY3Rpb25YID0gMDtcbiAgdGhpcy5kaXJlY3Rpb25ZID0gMDtcbiAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgdGhpcy5faW5pdCgpO1xuICB0aGlzLnJlZnJlc2goKTtcbiAgdGhpcy5zY3JvbGxUbyh0aGlzLm9wdGlvbnMuc3RhcnRYLCB0aGlzLm9wdGlvbnMuc3RhcnRZKTtcbiAgdGhpcy5lbmFibGUoKTtcbn1cblxuSXNjcm9sbC5wcm90b3R5cGUgPSB7XG5cbiAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pbml0RXZlbnRzKCk7XG4gIH0sXG5cbiAgX2luaXRFdmVudHM6IGZ1bmN0aW9uIChyZW1vdmUpIHtcbiAgICB2YXIgZXZlbnRUeXBlID0gcmVtb3ZlID8gcmVtb3ZlRXZlbnQgOiBhZGRFdmVudCxcbiAgICAgIHRhcmdldCA9IHRoaXMub3B0aW9ucy5iaW5kVG9XcmFwcGVyID8gdGhpcy53cmFwcGVyIDogd2luZG93O1xuXG4gICAgZXZlbnRUeXBlKHdpbmRvdywgJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHdpbmRvdywgJ3Jlc2l6ZScsIHRoaXMpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbGljaykge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ2NsaWNrJywgdGhpcywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZU1vdXNlKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCAnbW91c2Vkb3duJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAnbW91c2Vtb3ZlJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAnbW91c2VjYW5jZWwnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICdtb3VzZXVwJywgdGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKGhhc1BvaW50ZXIgJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlUG9pbnRlcikge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVyZG93bicpLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsIHByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcm1vdmUnKSwgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJjYW5jZWwnKSwgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJ1cCcpLCB0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAoaGFzVG91Y2ggJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlVG91Y2gpIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsICd0b3VjaHN0YXJ0JywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAndG91Y2htb3ZlJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAndG91Y2hjYW5jZWwnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICd0b3VjaGVuZCcsIHRoaXMpO1xuICAgIH1cblxuICAgIGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAndHJhbnNpdGlvbmVuZCcsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAnd2Via2l0VHJhbnNpdGlvbkVuZCcsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAnb1RyYW5zaXRpb25FbmQnLCB0aGlzKTtcbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ01TVHJhbnNpdGlvbkVuZCcsIHRoaXMpO1xuICB9LFxuXG4gIGhhbmRsZUV2ZW50OiBmdW5jdGlvbiAoZSkge1xuICAgIHN3aXRjaCAoZS50eXBlKSB7XG4gICAgICBjYXNlICd0b3VjaHN0YXJ0JzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJkb3duJzpcbiAgICAgIGNhc2UgJ01TUG9pbnRlckRvd24nOlxuICAgICAgY2FzZSAnbW91c2Vkb3duJzpcbiAgICAgICAgdGhpcy5fc3RhcnQoZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd0b3VjaG1vdmUnOlxuICAgICAgY2FzZSAncG9pbnRlcm1vdmUnOlxuICAgICAgY2FzZSAnTVNQb2ludGVyTW92ZSc6XG4gICAgICBjYXNlICdtb3VzZW1vdmUnOlxuICAgICAgICB0aGlzLl9tb3ZlKGUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndG91Y2hlbmQnOlxuICAgICAgY2FzZSAncG9pbnRlcnVwJzpcbiAgICAgIGNhc2UgJ01TUG9pbnRlclVwJzpcbiAgICAgIGNhc2UgJ21vdXNldXAnOlxuICAgICAgY2FzZSAndG91Y2hjYW5jZWwnOlxuICAgICAgY2FzZSAncG9pbnRlcmNhbmNlbCc6XG4gICAgICBjYXNlICdNU1BvaW50ZXJDYW5jZWwnOlxuICAgICAgY2FzZSAnbW91c2VjYW5jZWwnOlxuICAgICAgICB0aGlzLl9lbmQoZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnb3JpZW50YXRpb25jaGFuZ2UnOlxuICAgICAgY2FzZSAncmVzaXplJzpcbiAgICAgICAgdGhpcy5fcmVzaXplKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndHJhbnNpdGlvbmVuZCc6XG4gICAgICBjYXNlICd3ZWJraXRUcmFuc2l0aW9uRW5kJzpcbiAgICAgIGNhc2UgJ29UcmFuc2l0aW9uRW5kJzpcbiAgICAgIGNhc2UgJ01TVHJhbnNpdGlvbkVuZCc6XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25FbmQoZSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSxcblxuICBfc3RhcnQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgY29uc29sZS5sb2coJ3N0YXJ0IGV2ZW50IHR5cGU6ICcsIGUudHlwZSk7XG4gICAgLy8gUmVhY3QgdG8gbGVmdCBtb3VzZSBidXR0b24gb25seVxuICAgIGlmIChldmVudFR5cGVbZS50eXBlXSAhPT0gMSkgeyAvLyBub3QgdG91Y2ggZXZlbnRcbiAgICAgIHZhciBidXR0b247XG4gICAgICBpZiAoIWUud2hpY2gpIHtcbiAgICAgICAgLyogSUUgY2FzZSAqL1xuICAgICAgICBidXR0b24gPSAoZS5idXR0b24gPCAyKSA/IDAgOlxuICAgICAgICAgICgoZS5idXR0b24gPT0gNCkgPyAxIDogMik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvKiBBbGwgb3RoZXJzICovXG4gICAgICAgIGJ1dHRvbiA9IGUuYnV0dG9uO1xuICAgICAgfVxuXG4gICAgICAvLyBub3QgbGVmdCBtb3VzZSBidXR0b25cbiAgICAgIGlmIChidXR0b24gIT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdGhpcy5lbmFibGVkIHx8ICh0aGlzLmluaXRpYXRlZCAmJiBldmVudFR5cGVbZS50eXBlXSAhPT0gdGhpcy5pbml0aWF0ZWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdCAmJiAhaXNCYWRBbmRyb2lkICYmICFwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbihlLnRhcmdldCwgdGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0RXhjZXB0aW9uKSkge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIHZhciBwb2ludCA9IGUudG91Y2hlcyA/IGUudG91Y2hlc1swXSA6IGUsXG4gICAgICBwb3M7XG5cbiAgICB0aGlzLmluaXRpYXRlZCA9IGV2ZW50VHlwZVtlLnR5cGVdO1xuICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmRpc3RYID0gMDtcbiAgICB0aGlzLmRpc3RZID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblggPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAwO1xuXG4gICAgdGhpcy5zdGFydFRpbWUgPSBnZXRUaW1lKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgdGhpcy5pc0luVHJhbnNpdGlvbikge1xuICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWUoKTtcbiAgICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSBmYWxzZTtcbiAgICAgIHBvcyA9IHRoaXMuZ2V0Q29tcHV0ZWRQb3NpdGlvbigpO1xuICAgICAgdGhpcy5fdHJhbnNsYXRlKE1hdGgucm91bmQocG9zLngpLCBNYXRoLnJvdW5kKHBvcy55KSk7XG4gICAgICB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRoaXMuaXNBbmltYXRpbmcpIHtcbiAgICAgIHRoaXMuaXNBbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsRW5kJyk7XG4gICAgfVxuXG4gICAgdGhpcy5zdGFydFggPSB0aGlzLng7XG4gICAgdGhpcy5zdGFydFkgPSB0aGlzLnk7XG4gICAgdGhpcy5hYnNTdGFydFggPSB0aGlzLng7XG4gICAgdGhpcy5hYnNTdGFydFkgPSB0aGlzLnk7XG4gICAgdGhpcy5wb2ludFggPSBwb2ludC5wYWdlWDtcbiAgICB0aGlzLnBvaW50WSA9IHBvaW50LnBhZ2VZO1xuXG4gICAgdGhpcy5fZXhlY0V2ZW50KCdiZWZvcmVTY3JvbGxTdGFydCcpO1xuICB9LFxuXG4gIF9tb3ZlOiBmdW5jdGlvbiAoZSkge1xuICAgIGlmICghdGhpcy5lbmFibGVkIHx8IGV2ZW50VHlwZVtlLnR5cGVdICE9PSB0aGlzLmluaXRpYXRlZCkge1xuICAgICAgY29uc29sZS5sb2coJ2RvIG5vdCBtb3ZlIHNjcm9sbCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHQpIHtcdC8vIGluY3JlYXNlcyBwZXJmb3JtYW5jZSBvbiBBbmRyb2lkPyBUT0RPOiBjaGVjayFcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnQgPSBlLnRvdWNoZXMgPyBlLnRvdWNoZXNbMF0gOiBlLFxuICAgICAgZGVsdGFYID0gcG9pbnQucGFnZVggLSB0aGlzLnBvaW50WCwgLy8gdGhlIG1vdmVkIGRpc3RhbmNlXG4gICAgICBkZWx0YVkgPSBwb2ludC5wYWdlWSAtIHRoaXMucG9pbnRZLFxuICAgICAgdGltZXN0YW1wID0gZ2V0VGltZSgpLFxuICAgICAgbmV3WCwgbmV3WSxcbiAgICAgIGFic0Rpc3RYLCBhYnNEaXN0WTtcblxuICAgIHRoaXMucG9pbnRYID0gcG9pbnQucGFnZVg7XG4gICAgdGhpcy5wb2ludFkgPSBwb2ludC5wYWdlWTtcblxuICAgIHRoaXMuZGlzdFggKz0gZGVsdGFYO1xuICAgIHRoaXMuZGlzdFkgKz0gZGVsdGFZO1xuICAgIGFic0Rpc3RYID0gTWF0aC5hYnModGhpcy5kaXN0WCk7IC8vIGFic29sdXRlIG1vdmVkIGRpc3RhbmNlXG4gICAgYWJzRGlzdFkgPSBNYXRoLmFicyh0aGlzLmRpc3RZKTtcblxuICAgIC8qKlxuICAgICAqICBXZSBuZWVkIHRvIG1vdmUgYXQgbGVhc3QgMTAgcGl4ZWxzIGZvciB0aGUgc2Nyb2xsaW5nIHRvIGluaXRpYXRlXG4gICAgICogIHRoaXMuZW5kVGltZSBpcyBpbml0aWF0ZWQgaW4gdGhpcy5wcm90b3R5cGUucmVmcmVzaCBtZXRob2RcbiAgICAgKi9cbiAgICBpZiAodGltZXN0YW1wIC0gdGhpcy5lbmRUaW1lID4gMzAwICYmIChhYnNEaXN0WCA8IDEwICYmIGFic0Rpc3RZIDwgMTApKSB7XG4gICAgICBjb25zb2xlLmxvZygnbGVzcyB0aGFuIDEwIHB4Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgeW91IGFyZSBzY3JvbGxpbmcgaW4gb25lIGRpcmVjdGlvbiBsb2NrIHRoZSBvdGhlclxuICAgIGlmICghdGhpcy5kaXJlY3Rpb25Mb2NrZWQgJiYgIXRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsKSB7XG5cbiAgICAgIGlmIChhYnNEaXN0WCA+IGFic0Rpc3RZICsgdGhpcy5vcHRpb25zLmRpcmVjdGlvbkxvY2tUaHJlc2hvbGQpIHtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAnaCc7XHRcdC8vIGxvY2sgaG9yaXpvbnRhbGx5XG4gICAgICB9IGVsc2UgaWYgKGFic0Rpc3RZID49IGFic0Rpc3RYICsgdGhpcy5vcHRpb25zLmRpcmVjdGlvbkxvY2tUaHJlc2hvbGQpIHtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAndic7XHRcdC8vIGxvY2sgdmVydGljYWxseVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25Mb2NrZWQgPSAnbic7XHRcdC8vIG5vIGxvY2tcbiAgICAgIH1cblxuICAgIH1cblxuICAgIGlmICh0aGlzLmRpcmVjdGlvbkxvY2tlZCA9PSAnaCcpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAndmVydGljYWwnKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ2hvcml6b250YWwnKSB7XG4gICAgICAgIHRoaXMuaW5pdGlhdGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZGVsdGFZID0gMDtcbiAgICB9IGVsc2UgaWYgKHRoaXMuZGlyZWN0aW9uTG9ja2VkID09ICd2Jykge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICdob3Jpem9udGFsJykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICd2ZXJ0aWNhbCcpIHtcbiAgICAgICAgdGhpcy5pbml0aWF0ZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBkZWx0YVggPSAwO1xuICAgIH1cblxuICAgIGRlbHRhWCA9IHRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCA/IGRlbHRhWCA6IDA7XG4gICAgZGVsdGFZID0gdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCA/IGRlbHRhWSA6IDA7XG5cbiAgICBuZXdYID0gdGhpcy54ICsgZGVsdGFYO1xuICAgIG5ld1kgPSB0aGlzLnkgKyBkZWx0YVk7XG5cbiAgICAvLyBTbG93IGRvd24gaWYgb3V0c2lkZSBvZiB0aGUgYm91bmRhcmllc1xuICAgIGlmIChuZXdYID4gMCB8fCBuZXdYIDwgdGhpcy5tYXhTY3JvbGxYKSB7XG4gICAgICBjb25zb2xlLmxvZygneHh4eHh4eHgnKTtcbiAgICAgIG5ld1ggPSB0aGlzLm9wdGlvbnMuYm91bmNlID8gdGhpcy54ICsgZGVsdGFYIC8gMyA6IG5ld1ggPiAwID8gMCA6IHRoaXMubWF4U2Nyb2xsWDtcbiAgICB9XG4gICAgaWYgKG5ld1kgPiAwIHx8IG5ld1kgPCB0aGlzLm1heFNjcm9sbFkpIHtcbiAgICAgIGNvbnNvbGUubG9nKCd5eXl5eXl5eScpO1xuICAgICAgbmV3WSA9IHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLnkgKyBkZWx0YVkgLyAzIDogbmV3WSA+IDAgPyAwIDogdGhpcy5tYXhTY3JvbGxZO1xuICAgIH1cblxuICAgIHRoaXMuZGlyZWN0aW9uWCA9IGRlbHRhWCA+IDAgPyAtMSA6IGRlbHRhWCA8IDAgPyAxIDogMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSBkZWx0YVkgPiAwID8gLTEgOiBkZWx0YVkgPCAwID8gMSA6IDA7XG5cbiAgICBpZiAoIXRoaXMubW92ZWQpIHtcbiAgICAgIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsU3RhcnQnKTtcbiAgICB9XG5cbiAgICB0aGlzLm1vdmVkID0gdHJ1ZTtcblxuICAgIGNvbnNvbGUubG9nKCduZXdYOiAnLG5ld1gsICduZXdZOiAnLCBuZXdZKTtcbiAgICB0aGlzLl90cmFuc2xhdGUobmV3WCwgbmV3WSk7XG5cbiAgICBpZiAodGltZXN0YW1wIC0gdGhpcy5zdGFydFRpbWUgPiAzMDApIHtcbiAgICAgIHRoaXMuc3RhcnRUaW1lID0gdGltZXN0YW1wO1xuICAgICAgdGhpcy5zdGFydFggPSB0aGlzLng7XG4gICAgICB0aGlzLnN0YXJ0WSA9IHRoaXMueTtcbiAgICB9XG4gIH0sXG5cbiAgX2VuZDogZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCB8fCBldmVudFR5cGVbZS50eXBlXSAhPT0gdGhpcy5pbml0aWF0ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0ICYmICFwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbihlLnRhcmdldCwgdGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0RXhjZXB0aW9uKSkge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIHZhciBwb2ludCA9IGUuY2hhbmdlZFRvdWNoZXMgPyBlLmNoYW5nZWRUb3VjaGVzWzBdIDogZSxcbiAgICAgIG1vbWVudHVtWCxcbiAgICAgIG1vbWVudHVtWSxcbiAgICAgIGR1cmF0aW9uID0gZ2V0VGltZSgpIC0gdGhpcy5zdGFydFRpbWUsXG4gICAgICBuZXdYID0gTWF0aC5yb3VuZCh0aGlzLngpLFxuICAgICAgbmV3WSA9IE1hdGgucm91bmQodGhpcy55KSxcbiAgICAgIGRpc3RhbmNlWCA9IE1hdGguYWJzKG5ld1ggLSB0aGlzLnN0YXJ0WCksXG4gICAgICBkaXN0YW5jZVkgPSBNYXRoLmFicyhuZXdZIC0gdGhpcy5zdGFydFkpLFxuICAgICAgdGltZSA9IDAsXG4gICAgICBlYXNpbmcgPSAnJztcblxuICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSAwO1xuICAgIHRoaXMuaW5pdGlhdGVkID0gMDtcbiAgICB0aGlzLmVuZFRpbWUgPSBnZXRUaW1lKCk7XG5cbiAgICAvLyByZXNldCBpZiB3ZSBhcmUgb3V0c2lkZSBvZiB0aGUgYm91bmRhcmllc1xuICAgIGlmICh0aGlzLnJlc2V0UG9zaXRpb24odGhpcy5vcHRpb25zLmJvdW5jZVRpbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zY3JvbGxUbyhuZXdYLCBuZXdZKTtcdC8vIGVuc3VyZXMgdGhhdCB0aGUgbGFzdCBwb3NpdGlvbiBpcyByb3VuZGVkXG5cbiAgICAvLyB3ZSBzY3JvbGxlZCBsZXNzIHRoYW4gMTAgcGl4ZWxzXG4gICAgaWYgKCF0aGlzLm1vdmVkKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLnRhcCkge1xuICAgICAgICAvLyB1dGlscy50YXAoZSwgdGhpcy5vcHRpb25zLnRhcCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2spIHtcbiAgICAgICAgLy8gdXRpbHMuY2xpY2soZSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsQ2FuY2VsJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5mbGljayAmJiBkdXJhdGlvbiA8IDIwMCAmJiBkaXN0YW5jZVggPCAxMDAgJiYgZGlzdGFuY2VZIDwgMTAwKSB7XG4gICAgICB0aGlzLl9leGVjRXZlbnQoJ2ZsaWNrJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gc3RhcnQgbW9tZW50dW0gYW5pbWF0aW9uIGlmIG5lZWRlZFxuICAgIGlmICh0aGlzLm9wdGlvbnMubW9tZW50dW0gJiYgZHVyYXRpb24gPCAzMDApIHtcbiAgICAgIG1vbWVudHVtWCA9IHRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCA/IG1vbWVudHVtKHRoaXMueCwgdGhpcy5zdGFydFgsIGR1cmF0aW9uLCB0aGlzLm1heFNjcm9sbFgsIHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLndyYXBwZXJXaWR0aCA6IDAsIHRoaXMub3B0aW9ucy5kZWNlbGVyYXRpb24pIDogeyBkZXN0aW5hdGlvbjogbmV3WCwgZHVyYXRpb246IDAgfTtcbiAgICAgIG1vbWVudHVtWSA9IHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPyBtb21lbnR1bSh0aGlzLnksIHRoaXMuc3RhcnRZLCBkdXJhdGlvbiwgdGhpcy5tYXhTY3JvbGxZLCB0aGlzLm9wdGlvbnMuYm91bmNlID8gdGhpcy53cmFwcGVySGVpZ2h0IDogMCwgdGhpcy5vcHRpb25zLmRlY2VsZXJhdGlvbikgOiB7IGRlc3RpbmF0aW9uOiBuZXdZLCBkdXJhdGlvbjogMCB9O1xuICAgICAgbmV3WCA9IG1vbWVudHVtWC5kZXN0aW5hdGlvbjtcbiAgICAgIG5ld1kgPSBtb21lbnR1bVkuZGVzdGluYXRpb247XG4gICAgICB0aW1lID0gTWF0aC5tYXgobW9tZW50dW1YLmR1cmF0aW9uLCBtb21lbnR1bVkuZHVyYXRpb24pO1xuICAgICAgdGhpcy5pc0luVHJhbnNpdGlvbiA9IDE7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zbmFwKSB7XG4gICAgICAvLyBkbyBzb21ldGluZ1xuICAgIH1cblxuICAgIGlmIChuZXdYICE9IHRoaXMueCB8fCBuZXdZICE9IHRoaXMueSkge1xuICAgICAgLy8gY2hhbmdlIGVhc2luZyBmdW5jdGlvbiB3aGVuIHNjcm9sbGVyIGdvZXMgb3V0IG9mIHRoZSBib3VuZGFyaWVzXG4gICAgICBpZiAobmV3WCA+IDAgfHwgbmV3WCA8IHRoaXMubWF4U2Nyb2xsWCB8fCBuZXdZID4gMCB8fCBuZXdZIDwgdGhpcy5tYXhTY3JvbGxZKSB7XG4gICAgICAgIGVhc2luZyA9IGVhc2luZ3MucXVhZHJhdGljO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coJ2VuZCBlbmQgZW5kIGVuZCEnKTtcbiAgICAgIHRoaXMuc2Nyb2xsVG8obmV3WCwgbmV3WSwgdGltZSwgZWFzaW5nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuXG4gIH0sXG5cbiAgX3RyYW5zaXRpb25FbmQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUudGFyZ2V0ICE9IHRoaXMuc2Nyb2xsZXIgfHwgIXRoaXMuaXNJblRyYW5zaXRpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl90cmFuc2l0aW9uVGltZSgpO1xuICAgIGlmICghdGhpcy5yZXNldFBvc2l0aW9uKHRoaXMub3B0aW9ucy5ib3VuY2VUaW1lKSkge1xuICAgICAgdGhpcy5pc0luVHJhbnNpdGlvbiA9IGZhbHNlO1xuICAgICAgdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxFbmQnKTtcbiAgICB9XG4gIH0sXG5cbiAgX3Jlc2l6ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIGNsZWFyVGltZW91dCh0aGlzLnJlc2l6ZVRpbWVvdXQpO1xuXG4gICAgdGhpcy5yZXNpemVUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zb2xlLmxvZygncmVzaXplIG5vdycpO1xuICAgICAgdGhhdC5yZWZyZXNoKCk7XG4gICAgfSwgdGhpcy5vcHRpb25zLnJlc2l6ZVBvbGxpbmcpO1xuICB9LFxuXG5cdG9uOiBmdW5jdGlvbiAodHlwZSwgZm4pIHtcblx0XHRpZiAoICF0aGlzLl9ldmVudHNbdHlwZV0gKSB7XG5cdFx0XHR0aGlzLl9ldmVudHNbdHlwZV0gPSBbXTtcblx0XHR9XG5cblx0XHR0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChmbik7XG4gIH0sXG4gIFxuXHRvZmY6IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHRcdGlmICggIXRoaXMuX2V2ZW50c1t0eXBlXSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgaW5kZXggPSB0aGlzLl9ldmVudHNbdHlwZV0uaW5kZXhPZihmbik7XG5cblx0XHRpZiAoIGluZGV4ID4gLTEgKSB7XG5cdFx0XHR0aGlzLl9ldmVudHNbdHlwZV0uc3BsaWNlKGluZGV4LCAxKTtcblx0XHR9XG5cdH0sXG5cbiAgX2V4ZWNFdmVudDogZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBpID0gMCxcbiAgICAgIGwgPSB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuXG4gICAgaWYgKCFsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG5cdFx0Zm9yICggOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0dGhpcy5fZXZlbnRzW3R5cGVdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG5cdFx0fVxuXG4gIH0sXG5cbiAgZ2V0Q29tcHV0ZWRQb3NpdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBtYXRyaXggPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLnNjcm9sbGVyLCBudWxsKSxcbiAgICAgIHgsIHk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zZm9ybSkge1xuICAgICAgbWF0cml4ID0gbWF0cml4W3N0eWxlVXRpbHMudHJhbnNmb3JtXS5zcGxpdCgnKScpWzBdLnNwbGl0KCcsICcpO1xuICAgICAgeCA9ICsobWF0cml4WzEyXSB8fCBtYXRyaXhbNF0pO1xuICAgICAgeSA9ICsobWF0cml4WzEzXSB8fCBtYXRyaXhbNV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBlZy4gdHJhbnNmb3JtICcwcHgnIHRvIDBcbiAgICAgIHggPSArbWF0cml4LmxlZnQucmVwbGFjZSgvW14tXFxkLl0vZywgJycpO1xuICAgICAgeSA9ICttYXRyaXgudG9wLnJlcGxhY2UoL1teLVxcZC5dL2csICcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyB4OiB4LCB5OiB5IH07XG4gIH0sXG5cbiAgc2Nyb2xsVG86IGZ1bmN0aW9uICh4LCB5LCB0aW1lLCBlYXNpbmcpIHtcbiAgICBlYXNpbmcgPSBlYXNpbmcgfHwgZWFzaW5ncy5jaXJjdWxhcjtcbiAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgdGltZSA+IDA7XG4gICAgdmFyIHRyYW5zaXRpb25UeXBlID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgZWFzaW5nLnN0eWxlO1xuXG4gICAgaWYgKCF0aW1lIHx8IHRyYW5zaXRpb25UeXBlKSB7XG4gICAgICBpZiAodHJhbnNpdGlvblR5cGUpIHtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uKGVhc2luZy5zdHlsZSk7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1lKHRpbWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5fdHJhbnNsYXRlKHgsIHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hbmltYXRlKHgsIHksIHRpbWUsIGVhc2luZy5mbik7XG4gICAgfVxuICB9LFxuXG4gIHNjcm9sbFRvRWxlbWVudDogZnVuY3Rpb24gKGVsLCB0aW1lLCBvZmZzZXRYLCBvZmZzZXRZLCBlYXNpbmcpIHtcbiAgICBlbCA9IGVsLm5vZGVUeXBlID8gZWwgOiB0aGlzLnNjcm9sbGVyLnF1ZXJ5U2VsZWN0b3IoZWwpO1xuXG4gICAgLy8gaWYgbm8gZWxlbWVudCBzZWxlY3RlZCwgdGhlbiByZXR1cm5cbiAgICBpZiAoIWVsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHBvcyA9IG9mZnNldFV0aWxzKGVsKTtcblxuICAgIHBvcy5sZWZ0IC09IHRoaXMud3JhcHBlck9mZnNldC5sZWZ0O1xuICAgIHBvcy50b3AgLT0gdGhpcy53cmFwcGVyT2Zmc2V0LnRvcDtcblxuICAgIC8vIGlmIG9mZnNldFgvWSBhcmUgdHJ1ZSB3ZSBjZW50ZXIgdGhlIGVsZW1lbnQgdG8gdGhlIHNjcmVlblxuICAgIHZhciBlbFJlY3QgPSBnZXRSZWN0KGVsKTtcbiAgICB2YXIgd3JhcHBlclJlY3QgPSBnZXRSZWN0KHRoaXMud3JhcHBlcik7XG4gICAgaWYgKG9mZnNldFggPT09IHRydWUpIHtcbiAgICAgIG9mZnNldFggPSBNYXRoLnJvdW5kKGVsUmVjdC53aWR0aCAvIDIgLSB3cmFwcGVyUmVjdC53aWR0aCAvIDIpO1xuICAgIH1cbiAgICBpZiAob2Zmc2V0WSA9PT0gdHJ1ZSkge1xuICAgICAgb2Zmc2V0WSA9IE1hdGgucm91bmQoZWxSZWN0LmhlaWdodCAvIDIgLSB3cmFwcGVyUmVjdC5oZWlnaHQgLyAyKTtcbiAgICB9XG5cbiAgICBwb3MubGVmdCAtPSBvZmZzZXRYIHx8IDA7XG4gICAgcG9zLnRvcCAtPSBvZmZzZXRZIHx8IDA7XG5cbiAgICBwb3MubGVmdCA9IHBvcy5sZWZ0ID4gMCA/IDAgOiBwb3MubGVmdCA8IHRoaXMubWF4U2Nyb2xsWCA/IHRoaXMubWF4U2Nyb2xsWCA6IHBvcy5sZWZ0O1xuICAgIHBvcy50b3AgPSBwb3MudG9wID4gMCA/IDAgOiBwb3MudG9wIDwgdGhpcy5tYXhTY3JvbGxZID8gdGhpcy5tYXhTY3JvbGxZIDogcG9zLnRvcDtcblxuICAgIHRpbWUgPSB0aW1lID09PSB1bmRlZmluZWQgfHwgdGltZSA9PT0gbnVsbCB8fCB0aW1lID09PSAnYXV0bycgPyBNYXRoLm1heChNYXRoLmFicyh0aGlzLnggLSBwb3MubGVmdCksIE1hdGguYWJzKHRoaXMueSAtIHBvcy50b3ApKSA6IHRpbWU7XG5cbiAgICB0aGlzLnNjcm9sbFRvKHBvcy5sZWZ0LCBwb3MudG9wLCB0aW1lLCBlYXNpbmcpO1xuXG4gIH0sXG5cbiAgX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogZnVuY3Rpb24gKGVhc2luZ1N0eWxlKSB7XG4gICAgLy8gYXNzaWduIGVhc2luZyBjc3Mgc3R5bGUgdG8gc2Nyb2xsIGNvbnRhaW5lciB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24gcHJvcGVydHlcbiAgICAvLyBleGFtcGxlOiBjdWJpYy1iZXppZXIoMC4yNSwgMC40NiwgMC40NSwgMC45NClcbiAgICB0aGlzLnNjcm9sbGVyU3R5bGVbc3R5bGVVdGlscy50cmFuc2l0aW9uVGltaW5nRnVuY3Rpb25dID0gZWFzaW5nU3R5bGU7XG4gIH0sXG5cbiAgX3RyYW5zaXRpb25UaW1lOiBmdW5jdGlvbiAodGltZSkge1xuICAgIC8vIGlmIGRvIG5vdCB1c2UgdHJhbnNpdGlvbiB0byBzY3JvbGwsIHJldHVyblxuICAgIGlmICghdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aW1lID0gdGltZSB8fCAwO1xuICAgIC8vIHRyYW5zaXRpb25EdXJhdGlvbiB3aGljaCBoYXMgdmVuZG9yIHByZWZpeFxuICAgIHZhciBkdXJhdGlvblByb3AgPSBzdHlsZVV0aWxzLnRyYW5zaXRpb25EdXJhdGlvbjtcbiAgICBpZiAoIWR1cmF0aW9uUHJvcCkgeyAvLyBpZiBubyB2ZW5kb3IgZm91bmQsIGR1cmF0aW9uUHJvcCB3aWxsIGJlIGZhbHNlXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSB0aW1lICsgJ21zJzsgLy8gYXNzaWduIG1zIHRvIHRyYW5zaXRpb25EdXJhdGlvbiBwcm9wXG5cbiAgICBpZiAoIXRpbWUgJiYgaXNCYWRBbmRyb2lkKSB7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9ICcwLjAwMDFtcyc7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHJBRihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzZWxmLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9PT0gJzAuMDAwMW1zJykge1xuICAgICAgICAgIHNlbGYuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gJzBzJztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIF90cmFuc2xhdGU6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgY29uc29sZS5sb2coJ3RyYW5zbGF0ZSBub3chITogJywgeCwgJyAnLCB5KTtcbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zZm9ybSkge1xuXG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGVbc3R5bGVVdGlscy50cmFuc2Zvcm1dID1cbiAgICAgICAgJ3RyYW5zbGF0ZSgnICsgeCArICdweCwnICsgeSArICdweCknICsgJ3RyYW5zbGF0ZVooMCknO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHggPSBNYXRoLnJvdW5kKHgpO1xuICAgICAgeSA9IE1hdGgucm91bmQoeSk7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGUubGVmdCA9IHggKyAncHgnO1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlLnRvcCA9IHkgKyAncHgnO1xuICAgIH1cblxuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgfSxcblxuICBfYW5pbWF0ZTogZnVuY3Rpb24gKGRlc3RYLCBkZXN0WSwgZHVyYXRpb24sIGVhc2luZ0ZuKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzLFxuICAgICAgc3RhcnRYID0gdGhpcy54LFxuICAgICAgc3RhcnRZID0gdGhpcy55LFxuICAgICAgc3RhcnRUaW1lID0gZ2V0VGltZSgpLFxuICAgICAgZGVzdFRpbWUgPSBzdGFydFRpbWUgKyBkdXJhdGlvbjtcblxuICAgIGZ1bmN0aW9uIHN0ZXAoKSB7XG4gICAgICB2YXIgbm93ID0gZ2V0VGltZSgpLFxuICAgICAgICBuZXdYLCBuZXdZLFxuICAgICAgICBlYXNpbmc7XG5cbiAgICAgIGlmIChub3cgPj0gZGVzdFRpbWUpIHtcbiAgICAgICAgdGhhdC5pc0FuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICB0aGF0Ll90cmFuc2xhdGUoZGVzdFgsIGRlc3RZKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIG5vdyA9IChub3cgLSBzdGFydFRpbWUpIC8gZHVyYXRpb247XG4gICAgICBlYXNpbmcgPSBlYXNpbmdGbihub3cpO1xuICAgICAgbmV3WCA9IChkZXN0WCAtIHN0YXJ0WCkgKiBlYXNpbmcgKyBzdGFydFg7XG4gICAgICBuZXdZID0gKGRlc3RZIC0gc3RhcnRZKSAqIGVhc2luZyArIHN0YXJ0WTtcbiAgICAgIHRoYXQuX3RyYW5zbGF0ZShuZXdYLCBuZXdZKTtcblxuICAgICAgaWYgKHRoYXQuaXNBbmltYXRpbmcpIHtcbiAgICAgICAgckFGKHN0ZXApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNBbmltYXRpbmcgPSB0cnVlO1xuICAgIHN0ZXAoKTtcbiAgfSxcblxuICByZWZyZXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgZ2V0UmVjdCh0aGlzLndyYXBwZXIpOyAvLyBGb3JjZSByZWZsb3dcblxuICAgIHRoaXMud3JhcHBlcldpZHRoID0gdGhpcy53cmFwcGVyLmNsaWVudFdpZHRoO1xuICAgIHRoaXMud3JhcHBlckhlaWdodCA9IHRoaXMud3JhcHBlci5jbGllbnRIZWlnaHQ7XG5cbiAgICB2YXIgcmVjdCA9IGdldFJlY3QodGhpcy5zY3JvbGxlcik7XG5cbiAgICB0aGlzLnNjcm9sbGVyV2lkdGggPSByZWN0LndpZHRoO1xuICAgIHRoaXMuc2Nyb2xsZXJIZWlnaHQgPSByZWN0LmhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIHRoaXMubWF4U2Nyb2xsWCBvciB0aGlzLm1heFNjcm9sbFkgc21hbGxlciB0aGFuIDAsIG1lYW5pbmdcbiAgICAgKiBvdmVyZmxvdyBoYXBwZW5lZC5cbiAgICAgKi9cbiAgICB0aGlzLm1heFNjcm9sbFggPSB0aGlzLndyYXBwZXJXaWR0aCAtIHRoaXMuc2Nyb2xsZXJXaWR0aDtcbiAgICB0aGlzLm1heFNjcm9sbFkgPSB0aGlzLndyYXBwZXJIZWlnaHQgLSB0aGlzLnNjcm9sbGVySGVpZ2h0O1xuXG4gICAgLyoqXG4gICAgICogb3B0aW9uIGVuYWJsZXMgc2Nyb2xsIEFORCBvdmVyZmxvdyBleGlzdHNcbiAgICAgKi9cbiAgICB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPSB0aGlzLm9wdGlvbnMuc2Nyb2xsWCAmJiB0aGlzLm1heFNjcm9sbFggPCAwO1xuICAgIHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPSB0aGlzLm9wdGlvbnMuc2Nyb2xsWSAmJiB0aGlzLm1heFNjcm9sbFkgPCAwO1xuXG4gICAgaWYgKCF0aGlzLmhhc0hvcml6b250YWxTY3JvbGwpIHtcbiAgICAgIHRoaXMubWF4U2Nyb2xsWCA9IDA7XG4gICAgICB0aGlzLnNjcm9sbGVyV2lkdGggPSB0aGlzLndyYXBwZXJXaWR0aDtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaGFzVmVydGljYWxTY3JvbGwpIHtcbiAgICAgIHRoaXMubWF4U2Nyb2xsWSA9IDA7XG4gICAgICB0aGlzLnNjcm9sbGVySGVpZ2h0ID0gdGhpcy53cmFwcGVySGVpZ2h0O1xuICAgIH1cblxuICAgIHRoaXMuZW5kVGltZSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25YID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSAwO1xuXG4gICAgaWYgKGhhc1BvaW50ZXIgJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlUG9pbnRlcikge1xuICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dID1cbiAgICAgICAgZ2V0VG91Y2hBY3Rpb24odGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2gsIHRydWUpO1xuXG4gICAgICBpZiAoIXRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSkge1xuICAgICAgICB0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0gPVxuICAgICAgICAgIGdldFRvdWNoQWN0aW9uKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy53cmFwcGVyT2Zmc2V0ID0gb2Zmc2V0VXRpbHModGhpcy53cmFwcGVyKTtcblxuICAgIHRoaXMuX2V4ZWNFdmVudCgncmVmcmVzaCcpO1xuXG4gICAgdGhpcy5yZXNldFBvc2l0aW9uKCk7XG4gIH0sXG5cbiAgcmVzZXRQb3NpdGlvbjogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgIHkgPSB0aGlzLnk7XG5cbiAgICB0aW1lID0gdGltZSB8fCAwO1xuXG4gICAgaWYgKCF0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgfHwgdGhpcy54ID4gMCkge1xuICAgICAgeCA9IDA7XG4gICAgfSBlbHNlIGlmICh0aGlzLnggPCB0aGlzLm1heFNjcm9sbFgpIHtcbiAgICAgIHggPSB0aGlzLm1heFNjcm9sbFg7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsIHx8IHRoaXMueSA+IDApIHtcbiAgICAgIHkgPSAwO1xuICAgIH0gZWxzZSBpZiAodGhpcy55IDwgdGhpcy5tYXhTY3JvbGxZKSB7XG4gICAgICB5ID0gdGhpcy5tYXhTY3JvbGxZO1xuICAgIH1cblxuICAgIGlmICh4ID09PSB0aGlzLnggJiYgeSA9PT0gdGhpcy55KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy5zY3JvbGxUbyh4LCB5LCB0aW1lLCB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGRpc2FibGU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVuYWJsZWQgPSBmYWxzZTtcbiAgfSxcblxuICBlbmFibGU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVuYWJsZWQgPSB0cnVlO1xuICB9XG5cblxufTtcblxuZXhwb3J0IGRlZmF1bHQgSXNjcm9sbDsiXSwibmFtZXMiOlsiZWFzaW5ncyIsImsiLCJNYXRoIiwic3FydCIsImIiLCJmIiwiZSIsInBvdyIsInNpbiIsIlBJIiwiX2VsZW1lbnRTdHlsZSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInN0eWxlIiwiX3ZlbmRvciIsInZlbmRvcnMiLCJ0cmFuc2Zvcm0iLCJpIiwibCIsImxlbmd0aCIsInN1YnN0ciIsIl9wcmVmaXhTdHlsZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwiaXNCYWRBbmRyb2lkIiwiYXBwVmVyc2lvbiIsIndpbmRvdyIsIm5hdmlnYXRvciIsInRlc3QiLCJzYWZhcmlWZXJzaW9uIiwibWF0Y2giLCJwYXJzZUZsb2F0IiwiZ2V0VGltZSIsIkRhdGUiLCJub3ciLCJvZmZzZXQiLCJlbCIsImxlZnQiLCJvZmZzZXRMZWZ0IiwidG9wIiwib2Zmc2V0VG9wIiwib2Zmc2V0UGFyZW50IiwiZ2V0UmVjdCIsIlNWR0VsZW1lbnQiLCJyZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0Iiwid2lkdGgiLCJoZWlnaHQiLCJvZmZzZXRXaWR0aCIsIm9mZnNldEhlaWdodCIsImhhc1BvaW50ZXIiLCJQb2ludGVyRXZlbnQiLCJNU1BvaW50ZXJFdmVudCIsImhhc1RvdWNoIiwiZ2V0VG91Y2hBY3Rpb24iLCJldmVudFBhc3N0aHJvdWdoIiwiYWRkUGluY2giLCJ0b3VjaEFjdGlvbiIsImFkZEV2ZW50IiwidHlwZSIsImZuIiwiY2FwdHVyZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZW1vdmVFdmVudCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJwcmVmaXhQb2ludGVyRXZlbnQiLCJwb2ludGVyRXZlbnQiLCJldmVudFR5cGUiLCJwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbiIsImV4Y2VwdGlvbnMiLCJtb21lbnR1bSIsImN1cnJlbnQiLCJzdGFydCIsInRpbWUiLCJsb3dlck1hcmdpbiIsIndyYXBwZXJTaXplIiwiZGVjZWxlcmF0aW9uIiwiZGlzdGFuY2UiLCJzcGVlZCIsImFicyIsImRlc3RpbmF0aW9uIiwiZHVyYXRpb24iLCJ1bmRlZmluZWQiLCJyb3VuZCIsInJBRiIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsIndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSIsIm1velJlcXVlc3RBbmltYXRpb25GcmFtZSIsIm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJtc1JlcXVlc3RBbmltYXRpb25GcmFtZSIsImNhbGxiYWNrIiwic2V0VGltZW91dCIsIklzY3JvbGwiLCJlbGVtIiwib3B0aW9ucyIsIndyYXBwZXIiLCJxdWVyeVNlbGVjdG9yIiwic2Nyb2xsZXIiLCJjaGlsZHJlbiIsInNjcm9sbGVyU3R5bGUiLCJvbm1vdXNlZG93biIsInRhZ05hbWUiLCJzY3JvbGxZIiwic2Nyb2xsWCIsImZyZWVTY3JvbGwiLCJkaXJlY3Rpb25Mb2NrVGhyZXNob2xkIiwiYm91bmNlRWFzaW5nIiwiY2lyY3VsYXIiLCJyZXNpemVQb2xsaW5nIiwieCIsInkiLCJkaXJlY3Rpb25YIiwiZGlyZWN0aW9uWSIsIl9ldmVudHMiLCJfaW5pdCIsInJlZnJlc2giLCJzY3JvbGxUbyIsInN0YXJ0WCIsInN0YXJ0WSIsImVuYWJsZSIsInByb3RvdHlwZSIsIl9pbml0RXZlbnRzIiwicmVtb3ZlIiwidGFyZ2V0IiwiYmluZFRvV3JhcHBlciIsImNsaWNrIiwiZGlzYWJsZU1vdXNlIiwiZGlzYWJsZVBvaW50ZXIiLCJkaXNhYmxlVG91Y2giLCJfc3RhcnQiLCJfbW92ZSIsIl9lbmQiLCJfcmVzaXplIiwiX3RyYW5zaXRpb25FbmQiLCJsb2ciLCJidXR0b24iLCJ3aGljaCIsImVuYWJsZWQiLCJpbml0aWF0ZWQiLCJwcmV2ZW50RGVmYXVsdCIsInBvaW50IiwidG91Y2hlcyIsInBvcyIsIm1vdmVkIiwiZGlzdFgiLCJkaXN0WSIsImRpcmVjdGlvbkxvY2tlZCIsInN0YXJ0VGltZSIsInVzZVRyYW5zaXRpb24iLCJpc0luVHJhbnNpdGlvbiIsIl90cmFuc2l0aW9uVGltZSIsImdldENvbXB1dGVkUG9zaXRpb24iLCJfdHJhbnNsYXRlIiwiX2V4ZWNFdmVudCIsImlzQW5pbWF0aW5nIiwiYWJzU3RhcnRYIiwiYWJzU3RhcnRZIiwicG9pbnRYIiwicGFnZVgiLCJwb2ludFkiLCJwYWdlWSIsImRlbHRhWCIsInRpbWVzdGFtcCIsIm5ld1giLCJuZXdZIiwiYWJzRGlzdFgiLCJhYnNEaXN0WSIsImRlbHRhWSIsImVuZFRpbWUiLCJoYXNIb3Jpem9udGFsU2Nyb2xsIiwiaGFzVmVydGljYWxTY3JvbGwiLCJtYXhTY3JvbGxYIiwiYm91bmNlIiwibWF4U2Nyb2xsWSIsImNoYW5nZWRUb3VjaGVzIiwibW9tZW50dW1YIiwibW9tZW50dW1ZIiwiZGlzdGFuY2VYIiwiZGlzdGFuY2VZIiwiZWFzaW5nIiwicmVzZXRQb3NpdGlvbiIsImJvdW5jZVRpbWUiLCJ0YXAiLCJmbGljayIsIndyYXBwZXJXaWR0aCIsIndyYXBwZXJIZWlnaHQiLCJtYXgiLCJzbmFwIiwicXVhZHJhdGljIiwidGhhdCIsInJlc2l6ZVRpbWVvdXQiLCJwdXNoIiwiaW5kZXgiLCJpbmRleE9mIiwic3BsaWNlIiwiYXBwbHkiLCJzbGljZSIsImNhbGwiLCJhcmd1bWVudHMiLCJtYXRyaXgiLCJnZXRDb21wdXRlZFN0eWxlIiwidXNlVHJhbnNmb3JtIiwic3R5bGVVdGlscyIsInNwbGl0IiwicmVwbGFjZSIsInRyYW5zaXRpb25UeXBlIiwiX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiIsIl9hbmltYXRlIiwib2Zmc2V0WCIsIm9mZnNldFkiLCJub2RlVHlwZSIsIm9mZnNldFV0aWxzIiwid3JhcHBlck9mZnNldCIsImVsUmVjdCIsIndyYXBwZXJSZWN0IiwiZWFzaW5nU3R5bGUiLCJ0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJkdXJhdGlvblByb3AiLCJ0cmFuc2l0aW9uRHVyYXRpb24iLCJzZWxmIiwiZGVzdFgiLCJkZXN0WSIsImVhc2luZ0ZuIiwiZGVzdFRpbWUiLCJzdGVwIiwiY2xpZW50V2lkdGgiLCJjbGllbnRIZWlnaHQiLCJzY3JvbGxlcldpZHRoIiwic2Nyb2xsZXJIZWlnaHQiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLElBQUlBLFVBQVU7YUFDRDtXQUNGLHNDQURFO1FBRUwsVUFBVUMsQ0FBVixFQUFhO2FBQ1JBLEtBQUssSUFBSUEsQ0FBVCxDQUFQOztHQUpRO1lBT0Y7V0FDRCxpQ0FEQztRQUVKLFVBQVVBLENBQVYsRUFBYTthQUNSQyxLQUFLQyxJQUFMLENBQVUsSUFBSyxFQUFFRixDQUFGLEdBQU1BLENBQXJCLENBQVA7O0dBVlE7UUFhTjtXQUNHLHlDQURIO1FBRUEsVUFBVUEsQ0FBVixFQUFhO1VBQ1hHLElBQUksQ0FBUjthQUNPLENBQUNILElBQUlBLElBQUksQ0FBVCxJQUFjQSxDQUFkLElBQW1CLENBQUNHLElBQUksQ0FBTCxJQUFVSCxDQUFWLEdBQWNHLENBQWpDLElBQXNDLENBQTdDOztHQWpCUTtVQW9CSjtXQUNDLEVBREQ7UUFFRixVQUFVSCxDQUFWLEVBQWE7VUFDWCxDQUFDQSxLQUFLLENBQU4sSUFBWSxJQUFJLElBQXBCLEVBQTJCO2VBQ2xCLFNBQVNBLENBQVQsR0FBYUEsQ0FBcEI7T0FERixNQUVPLElBQUlBLElBQUssSUFBSSxJQUFiLEVBQW9CO2VBQ2xCLFVBQVVBLEtBQU0sTUFBTSxJQUF0QixJQUErQkEsQ0FBL0IsR0FBbUMsSUFBMUM7T0FESyxNQUVBLElBQUlBLElBQUssTUFBTSxJQUFmLEVBQXNCO2VBQ3BCLFVBQVVBLEtBQU0sT0FBTyxJQUF2QixJQUFnQ0EsQ0FBaEMsR0FBb0MsTUFBM0M7T0FESyxNQUVBO2VBQ0UsVUFBVUEsS0FBTSxRQUFRLElBQXhCLElBQWlDQSxDQUFqQyxHQUFxQyxRQUE1Qzs7O0dBOUJNO1dBa0NIO1dBQ0EsRUFEQTtRQUVILFVBQVVBLENBQVYsRUFBYTtVQUNYSSxJQUFJLElBQVI7VUFDRUMsSUFBSSxHQUROOztVQUdJ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

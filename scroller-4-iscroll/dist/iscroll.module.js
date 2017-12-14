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
      newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX;
    }
    if (newY > 0 || newY < this.maxScrollY) {
      newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY;
    }

    this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
    this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

    if (!this.moved) {
      this._execEvent('scrollStart');
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

export default Iscroll;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5tb2R1bGUuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9lYXNpbmdzLmpzIiwiLi4vc3JjL3V0aWxzL3N0eWxlLmpzIiwiLi4vc3JjL3V0aWxzL2lzQmFkQW5kcm9pZC5qcyIsIi4uL3NyYy91dGlscy9nZXRUaW1lLmpzIiwiLi4vc3JjL3V0aWxzL29mZnNldC5qcyIsIi4uL3NyYy91dGlscy9nZXRSZWN0LmpzIiwiLi4vc3JjL3V0aWxzL2RldGVjdG9yLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRvdWNoQWN0aW9uLmpzIiwiLi4vc3JjL3V0aWxzL2V2ZW50SGFuZGxlci5qcyIsIi4uL3NyYy91dGlscy9wcmVmaXhQb2ludGVyRXZlbnQuanMiLCIuLi9zcmMvdXRpbHMvZXZlbnRUeXBlLmpzIiwiLi4vc3JjL3V0aWxzL3ByZXZlbnREZWZhdWx0RXhjZXB0aW9uLmpzIiwiLi4vc3JjL3V0aWxzL21vbWVudHVtLmpzIiwiLi4vc3JjL215LWlzY3JvbGwuanMiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIGVhc2luZ3MgPSB7XG4gIHF1YWRyYXRpYzoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBrICogKDIgLSBrKTtcbiAgICB9XG4gIH0sXG4gIGNpcmN1bGFyOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xLCAwLjU3LCAwLjEsIDEpJyxcdC8vIE5vdCBwcm9wZXJseSBcImNpcmN1bGFyXCIgYnV0IHRoaXMgbG9va3MgYmV0dGVyLCBpdCBzaG91bGQgYmUgKDAuMDc1LCAwLjgyLCAwLjE2NSwgMSlcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoMSAtICgtLWsgKiBrKSk7XG4gICAgfVxuICB9LFxuICBiYWNrOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xNzUsIDAuODg1LCAwLjMyLCAxLjI3NSknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGIgPSA0O1xuICAgICAgcmV0dXJuIChrID0gayAtIDEpICogayAqICgoYiArIDEpICogayArIGIpICsgMTtcbiAgICB9XG4gIH0sXG4gIGJvdW5jZToge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIGlmICgoayAvPSAxKSA8ICgxIC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIGsgKiBrO1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDEuNSAvIDIuNzUpKSAqIGsgKyAwLjc1O1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIuNSAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi4yNSAvIDIuNzUpKSAqIGsgKyAwLjkzNzU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuNjI1IC8gMi43NSkpICogayArIDAuOTg0Mzc1O1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZWxhc3RpYzoge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciBmID0gMC4yMixcbiAgICAgICAgZSA9IDAuNDtcblxuICAgICAgaWYgKGsgPT09IDApIHsgcmV0dXJuIDA7IH1cbiAgICAgIGlmIChrID09IDEpIHsgcmV0dXJuIDE7IH1cblxuICAgICAgcmV0dXJuIChlICogTWF0aC5wb3coMiwgLSAxMCAqIGspICogTWF0aC5zaW4oKGsgLSBmIC8gNCkgKiAoMiAqIE1hdGguUEkpIC8gZikgKyAxKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGVhc2luZ3M7IiwidmFyIF9lbGVtZW50U3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKS5zdHlsZTtcblxudmFyIF92ZW5kb3IgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgdmVuZG9ycyA9IFsndCcsICd3ZWJraXRUJywgJ01velQnLCAnbXNUJywgJ09UJ10sXG4gICAgdHJhbnNmb3JtLFxuICAgIGkgPSAwLFxuICAgIGwgPSB2ZW5kb3JzLmxlbmd0aDtcblxuICB3aGlsZSAoaSA8IGwpIHtcbiAgICB0cmFuc2Zvcm0gPSB2ZW5kb3JzW2ldICsgJ3JhbnNmb3JtJztcbiAgICBpZiAodHJhbnNmb3JtIGluIF9lbGVtZW50U3R5bGUpIHtcbiAgICAgIHJldHVybiB2ZW5kb3JzW2ldLnN1YnN0cigwLCB2ZW5kb3JzW2ldLmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICBpKys7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59KSgpO1xuXG5mdW5jdGlvbiBfcHJlZml4U3R5bGUgKHN0eWxlKSB7XG4gIGlmICggX3ZlbmRvciA9PT0gZmFsc2UgKSByZXR1cm4gZmFsc2U7IC8vIG5vIHZlbmRvciBmb3VuZFxuICBpZiAoIF92ZW5kb3IgPT09ICcnICkgcmV0dXJuIHN0eWxlOyAvLyBubyBwcmVmaXggbmVlZGVkXG4gIHJldHVybiBfdmVuZG9yICsgc3R5bGUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHlsZS5zdWJzdHIoMSk7IC8vIG90aGVyd2lzZSBhZGQgcHJlZml4XG59XG5cbi8vIHN0eWxlIHRoYXQgaGFzIHZlbmRvciBwcmVmaXgsIGVnOiB3ZWJraXRUcmFuc2Zvcm1cbnZhciBzdHlsZSA9IHtcbiAgdHJhbnNmb3JtOiBfcHJlZml4U3R5bGUoJ3RyYW5zZm9ybScpLFxuICB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uJyksXG4gIHRyYW5zaXRpb25EdXJhdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uRHVyYXRpb24nKSxcbiAgdHJhbnNpdGlvbkRlbGF5OiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EZWxheScpLFxuICB0cmFuc2Zvcm1PcmlnaW46IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtT3JpZ2luJyksXG4gIHRvdWNoQWN0aW9uOiBfcHJlZml4U3R5bGUoJ3RvdWNoQWN0aW9uJylcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHN0eWxlOyIsInZhciBpc0JhZEFuZHJvaWQgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgYXBwVmVyc2lvbiA9IHdpbmRvdy5uYXZpZ2F0b3IuYXBwVmVyc2lvbjtcblxuICBpZiAoL0FuZHJvaWQvLnRlc3QoYXBwVmVyc2lvbikgJiYgISgvQ2hyb21lXFwvXFxkLy50ZXN0KGFwcFZlcnNpb24pKSkge1xuICAgIHZhciBzYWZhcmlWZXJzaW9uID0gYXBwVmVyc2lvbi5tYXRjaCgvU2FmYXJpXFwvKFxcZCsuXFxkKS8pO1xuICAgIGlmKHNhZmFyaVZlcnNpb24gJiYgdHlwZW9mIHNhZmFyaVZlcnNpb24gPT09IFwib2JqZWN0XCIgJiYgc2FmYXJpVmVyc2lvbi5sZW5ndGggPj0gMikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoc2FmYXJpVmVyc2lvblsxXSkgPCA1MzUuMTk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzQmFkQW5kcm9pZDsiLCIvKipcbiAqIDEuIERhdGUucHJvdG90eXBlLmdldFRpbWUgaGFzIEJFVFRFUiBjb21wYXRpYmlsaXR5IHRoYW4gRGF0ZS5ub3dcbiAqIHJlZmVyZW5jZTogXG4gKiAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9nZXRUaW1lI0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0RhdGUvbm93I0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogXG4gKiAyLiBEYXRlLnByb3RvdHlwZS5nZXRUaW1lIHNwZWVkIGlzIFNMT1dTRVIgdGhhbiBEYXRlLm5vd1xuICogcmVmZXJlbmNlOlxuICogIGh0dHBzOi8vanNwZXJmLmNvbS9kYXRlLW5vdy12cy1kYXRlLWdldHRpbWUvN1xuICovXG5cbnZhciBnZXRUaW1lID0gRGF0ZS5ub3cgfHxcbiAgZnVuY3Rpb24gZ2V0VGltZSgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbmV4cG9ydCBkZWZhdWx0IGdldFRpbWU7IiwidmFyIG9mZnNldCA9IGZ1bmN0aW9uIChlbCkge1xuICB2YXIgbGVmdCA9IC1lbC5vZmZzZXRMZWZ0LFxuICB0b3AgPSAtZWwub2Zmc2V0VG9wO1xuXG4gIC8qKlxuICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvSFRNTEVsZW1lbnQvb2Zmc2V0UGFyZW50XG4gICAqIFJldHVybnMgbnVsbCB3aGVuIHRoZSBlbGVtZW50IGhhcyBzdHlsZS5kaXNwbGF5IHNldCB0byBcIm5vbmVcIi4gVGhlIG9mZnNldFBhcmVudCBcbiAgICogaXMgdXNlZnVsIGJlY2F1c2Ugb2Zmc2V0VG9wIGFuZCBvZmZzZXRMZWZ0IGFyZSByZWxhdGl2ZSB0byBpdHMgcGFkZGluZyBlZGdlLlxuICAgKi9cbiAgd2hpbGUgKGVsID0gZWwub2Zmc2V0UGFyZW50KSB7XG4gICAgbGVmdCAtPSBlbC5vZmZzZXRMZWZ0O1xuICAgIHRvcCAtPSBlbC5vZmZzZXRUb3A7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGxlZnQ6IGxlZnQsXG4gICAgdG9wOiB0b3BcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgb2Zmc2V0OyIsImZ1bmN0aW9uIGdldFJlY3QoZWwpIHtcbiAgaWYgKGVsIGluc3RhbmNlb2YgU1ZHRWxlbWVudCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wIDogcmVjdC50b3AsXG4gICAgICBsZWZ0IDogcmVjdC5sZWZ0LFxuICAgICAgd2lkdGggOiByZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0IDogcmVjdC5oZWlnaHRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcCA6IGVsLm9mZnNldFRvcCxcbiAgICAgIGxlZnQgOiBlbC5vZmZzZXRMZWZ0LFxuICAgICAgd2lkdGggOiBlbC5vZmZzZXRXaWR0aCxcbiAgICAgIGhlaWdodCA6IGVsLm9mZnNldEhlaWdodFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZ2V0UmVjdDsiLCJ2YXIgaGFzUG9pbnRlciA9ICEhKHdpbmRvdy5Qb2ludGVyRXZlbnQgfHwgd2luZG93Lk1TUG9pbnRlckV2ZW50KTsgLy8gSUUxMCBpcyBwcmVmaXhlZFxudmFyIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93O1xuXG5leHBvcnQge1xuICBoYXNQb2ludGVyLFxuICBoYXNUb3VjaFxufSIsInZhciBnZXRUb3VjaEFjdGlvbiA9IGZ1bmN0aW9uIChldmVudFBhc3N0aHJvdWdoLCBhZGRQaW5jaCkge1xuICB2YXIgdG91Y2hBY3Rpb24gPSAnbm9uZSc7XG4gIGlmIChldmVudFBhc3N0aHJvdWdoID09PSAndmVydGljYWwnKSB7XG4gICAgdG91Y2hBY3Rpb24gPSAncGFuLXknO1xuICB9IGVsc2UgaWYgKGV2ZW50UGFzc3Rocm91Z2ggPT09ICdob3Jpem9udGFsJykge1xuICAgIHRvdWNoQWN0aW9uID0gJ3Bhbi14JztcbiAgfVxuXG4gIGlmIChhZGRQaW5jaCAmJiB0b3VjaEFjdGlvbiAhPSAnbm9uZScpIHtcbiAgICAvLyBhZGQgcGluY2gtem9vbSBzdXBwb3J0IGlmIHRoZSBicm93c2VyIHN1cHBvcnRzIGl0LCBidXQgaWYgbm90IChlZy4gQ2hyb21lIDw1NSkgZG8gbm90aGluZ1xuICAgIHRvdWNoQWN0aW9uICs9ICcgcGluY2gtem9vbSc7XG4gIH1cbiAgcmV0dXJuIHRvdWNoQWN0aW9uO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRUb3VjaEFjdGlvbjsiLCJmdW5jdGlvbiBhZGRFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59O1xuXG5mdW5jdGlvbiByZW1vdmVFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59XG5cbmV4cG9ydCB7XG4gIGFkZEV2ZW50LFxuICByZW1vdmVFdmVudFxufTsiLCJmdW5jdGlvbiBwcmVmaXhQb2ludGVyRXZlbnQgKHBvaW50ZXJFdmVudCkge1xuICByZXR1cm4gd2luZG93Lk1TUG9pbnRlckV2ZW50ID8gXG4gICAgJ01TUG9pbnRlcicgKyBwb2ludGVyRXZlbnQuY2hhckF0KDcpLnRvVXBwZXJDYXNlKCkgKyBwb2ludGVyRXZlbnQuc3Vic3RyKDgpIDpcbiAgICBwb2ludGVyRXZlbnQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHByZWZpeFBvaW50ZXJFdmVudDsiLCJ2YXIgZXZlbnRUeXBlID0ge1xuICB0b3VjaHN0YXJ0OiAxLFxuICB0b3VjaG1vdmU6IDEsXG4gIHRvdWNoZW5kOiAxLFxuXG4gIG1vdXNlZG93bjogMixcbiAgbW91c2Vtb3ZlOiAyLFxuICBtb3VzZXVwOiAyLFxuXG4gIHBvaW50ZXJkb3duOiAzLFxuICBwb2ludGVybW92ZTogMyxcbiAgcG9pbnRlcnVwOiAzLFxuXG4gIE1TUG9pbnRlckRvd246IDMsXG4gIE1TUG9pbnRlck1vdmU6IDMsXG4gIE1TUG9pbnRlclVwOiAzXG59O1xuXG5leHBvcnQgZGVmYXVsdCBldmVudFR5cGU7IiwidmFyIHByZXZlbnREZWZhdWx0RXhjZXB0aW9uID0gZnVuY3Rpb24gKGVsLCBleGNlcHRpb25zKSB7XG4gIGZvciAodmFyIGkgaW4gZXhjZXB0aW9ucykge1xuICAgIGlmICggZXhjZXB0aW9uc1tpXS50ZXN0KGVsW2ldKSApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHByZXZlbnREZWZhdWx0RXhjZXB0aW9uOyIsInZhciBtb21lbnR1bSA9IGZ1bmN0aW9uIChjdXJyZW50LCBzdGFydCwgdGltZSwgbG93ZXJNYXJnaW4sIHdyYXBwZXJTaXplLCBkZWNlbGVyYXRpb24pIHtcbiAgdmFyIGRpc3RhbmNlID0gY3VycmVudCAtIHN0YXJ0LFxuICAgIHNwZWVkID0gTWF0aC5hYnMoZGlzdGFuY2UpIC8gdGltZSxcbiAgICBkZXN0aW5hdGlvbixcbiAgICBkdXJhdGlvbjtcblxuICBkZWNlbGVyYXRpb24gPSBkZWNlbGVyYXRpb24gPT09IHVuZGVmaW5lZCA/IDAuMDAwNiA6IGRlY2VsZXJhdGlvbjtcblxuICBkZXN0aW5hdGlvbiA9IGN1cnJlbnQgKyAoIHNwZWVkICogc3BlZWQgKSAvICggMiAqIGRlY2VsZXJhdGlvbiApICogKCBkaXN0YW5jZSA8IDAgPyAtMSA6IDEgKTtcbiAgZHVyYXRpb24gPSBzcGVlZCAvIGRlY2VsZXJhdGlvbjtcblxuICBpZiAoIGRlc3RpbmF0aW9uIDwgbG93ZXJNYXJnaW4gKSB7XG4gICAgZGVzdGluYXRpb24gPSB3cmFwcGVyU2l6ZSA/IGxvd2VyTWFyZ2luIC0gKCB3cmFwcGVyU2l6ZSAvIDIuNSAqICggc3BlZWQgLyA4ICkgKSA6IGxvd2VyTWFyZ2luO1xuICAgIGRpc3RhbmNlID0gTWF0aC5hYnMoZGVzdGluYXRpb24gLSBjdXJyZW50KTtcbiAgICBkdXJhdGlvbiA9IGRpc3RhbmNlIC8gc3BlZWQ7XG4gIH0gZWxzZSBpZiAoIGRlc3RpbmF0aW9uID4gMCApIHtcbiAgICBkZXN0aW5hdGlvbiA9IHdyYXBwZXJTaXplID8gd3JhcHBlclNpemUgLyAyLjUgKiAoIHNwZWVkIC8gOCApIDogMDtcbiAgICBkaXN0YW5jZSA9IE1hdGguYWJzKGN1cnJlbnQpICsgZGVzdGluYXRpb247XG4gICAgZHVyYXRpb24gPSBkaXN0YW5jZSAvIHNwZWVkO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBkZXN0aW5hdGlvbjogTWF0aC5yb3VuZChkZXN0aW5hdGlvbiksXG4gICAgZHVyYXRpb246IGR1cmF0aW9uXG4gIH07XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1vbWVudHVtOyIsImltcG9ydCBlYXNpbmdzIGZyb20gJy4vdXRpbHMvZWFzaW5ncyc7XG5pbXBvcnQgc3R5bGVVdGlscyBmcm9tICcuL3V0aWxzL3N0eWxlJztcbmltcG9ydCBpc0JhZEFuZHJvaWQgZnJvbSAnLi91dGlscy9pc0JhZEFuZHJvaWQnO1xuaW1wb3J0IGdldFRpbWUgZnJvbSAnLi91dGlscy9nZXRUaW1lJztcbmltcG9ydCBvZmZzZXRVdGlscyBmcm9tICcuL3V0aWxzL29mZnNldCc7XG5pbXBvcnQgZ2V0UmVjdCBmcm9tICcuL3V0aWxzL2dldFJlY3QnO1xuaW1wb3J0IHsgaGFzUG9pbnRlciwgaGFzVG91Y2ggfSBmcm9tICcuL3V0aWxzL2RldGVjdG9yJztcbmltcG9ydCBnZXRUb3VjaEFjdGlvbiBmcm9tICcuL3V0aWxzL2dldFRvdWNoQWN0aW9uJztcbmltcG9ydCB7IGFkZEV2ZW50LCByZW1vdmVFdmVudCB9IGZyb20gJy4vdXRpbHMvZXZlbnRIYW5kbGVyJztcbmltcG9ydCBwcmVmaXhQb2ludGVyRXZlbnQgZnJvbSAnLi91dGlscy9wcmVmaXhQb2ludGVyRXZlbnQnO1xuaW1wb3J0IGV2ZW50VHlwZSBmcm9tICcuL3V0aWxzL2V2ZW50VHlwZSc7XG5pbXBvcnQgcHJldmVudERlZmF1bHRFeGNlcHRpb24gZnJvbSAnLi91dGlscy9wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbic7XG5pbXBvcnQgbW9tZW50dW0gZnJvbSAnLi91dGlscy9tb21lbnR1bSc7XG5cbi8vIGRlYWwgd2l0aCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgY29tcGF0YmlsaXR5XG52YXIgckFGID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGZ1bmN0aW9uIChjYWxsYmFjaykgeyB3aW5kb3cuc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTsgfTtcblxuZnVuY3Rpb24gSXNjcm9sbChlbGVtLCBvcHRpb25zKSB7XG4gIC8qKlxuICAgKiBnZXQgc2Nyb2xsIG5vZGUgZWxlbWVudFxuICAgKi9cbiAgdGhpcy53cmFwcGVyID0gdHlwZW9mIGVsZW0gPT09ICdzdHJpbmcnID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtKSA6IGVsZW07XG4gIHRoaXMuc2Nyb2xsZXIgPSB0aGlzLndyYXBwZXIuY2hpbGRyZW5bMF07XG4gIHRoaXMuc2Nyb2xsZXJTdHlsZSA9IHRoaXMuc2Nyb2xsZXIuc3R5bGU7XG5cbiAgLyoqXG4gICAqIG1lcmdlIGRlZmF1bHQgb3B0aW9ucyBhbmQgY3VzdG9taXplZCBvcHRpb25zXG4gICAqL1xuICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgZGlzYWJsZVBvaW50ZXI6ICFoYXNQb2ludGVyLFxuICAgIGRpc2FibGVUb3VjaDogaGFzUG9pbnRlciB8fCAhaGFzVG91Y2gsXG4gICAgZGlzYWJsZU1vdXNlOiBoYXNQb2ludGVyIHx8ICFoYXNUb3VjaCxcbiAgICB1c2VUcmFuc2l0aW9uOiB0cnVlLFxuICAgIHVzZVRyYW5zZm9ybTogdHJ1ZSxcbiAgICBzY3JvbGxZOiB0cnVlLFxuICAgIHN0YXJ0WDogMCxcbiAgICBzdGFydFk6IDAsXG4gICAgYmluZFRvV3JhcHBlcjogdHlwZW9mIHdpbmRvdy5vbm1vdXNlZG93biA9PT0gXCJ1bmRlZmluZWRcIixcbiAgICBwcmV2ZW50RGVmYXVsdDogdHJ1ZSxcbiAgICBwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbjogeyB0YWdOYW1lOiAvXihJTlBVVHxURVhUQVJFQXxCVVRUT058U0VMRUNUKSQvIH0sXG4gICAgZGlyZWN0aW9uTG9ja1RocmVzaG9sZDogNSxcbiAgICBib3VuY2U6IHRydWUsXG4gICAgYm91bmNlVGltZTogNjAwLFxuICAgIGJvdW5jZUVhc2luZzogJycsXG4gICAgbW9tZW50dW06IHRydWVcbiAgfTtcblxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnNbaV0gPSBvcHRpb25zW2ldO1xuICB9XG5cbiAgdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PT0gdHJ1ZSA/ICd2ZXJ0aWNhbCcgOiB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaDtcblxuICAvLyBJZiB5b3Ugd2FudCBldmVudFBhc3N0aHJvdWdoIEkgaGF2ZSB0byBsb2NrIG9uZSBvZiB0aGUgYXhlc1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWSA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSAndmVydGljYWwnID8gZmFsc2UgOiB0aGlzLm9wdGlvbnMuc2Nyb2xsWTtcbiAgdGhpcy5vcHRpb25zLnNjcm9sbFggPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ2hvcml6b250YWwnID8gZmFsc2UgOiB0aGlzLm9wdGlvbnMuc2Nyb2xsWDtcblxuICB0aGlzLm9wdGlvbnMuZnJlZVNjcm9sbCA9IHRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsICYmICF0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaDtcbiAgdGhpcy5vcHRpb25zLmRpcmVjdGlvbkxvY2tUaHJlc2hvbGQgPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA/IDAgOiB0aGlzLm9wdGlvbnMuZGlyZWN0aW9uTG9ja1RocmVzaG9sZDtcblxuICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nID0gdHlwZW9mIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcgPT0gJ3N0cmluZycgP1xuICAgIGVhc2luZ3NbdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZ10gfHwgZWFzaW5ncy5jaXJjdWxhciA6XG4gICAgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZztcblxuICB0aGlzLm9wdGlvbnMucmVzaXplUG9sbGluZyA9IHRoaXMub3B0aW9ucy5yZXNpemVQb2xsaW5nID09PSB1bmRlZmluZWQgPyA2MCA6IHRoaXMub3B0aW9ucy5yZXNpemVQb2xsaW5nO1xuXG4gIHRoaXMueCA9IDA7XG4gIHRoaXMueSA9IDA7XG4gIHRoaXMuZGlyZWN0aW9uWCA9IDA7XG4gIHRoaXMuZGlyZWN0aW9uWSA9IDA7XG4gIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIHRoaXMuX2luaXQoKTtcbiAgdGhpcy5yZWZyZXNoKCk7XG4gIHRoaXMuc2Nyb2xsVG8odGhpcy5vcHRpb25zLnN0YXJ0WCwgdGhpcy5vcHRpb25zLnN0YXJ0WSk7XG4gIHRoaXMuZW5hYmxlKCk7XG59XG5cbklzY3JvbGwucHJvdG90eXBlID0ge1xuXG4gIF9pbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faW5pdEV2ZW50cygpO1xuICB9LFxuXG4gIF9pbml0RXZlbnRzOiBmdW5jdGlvbiAocmVtb3ZlKSB7XG4gICAgdmFyIGV2ZW50VHlwZSA9IHJlbW92ZSA/IHJlbW92ZUV2ZW50IDogYWRkRXZlbnQsXG4gICAgICB0YXJnZXQgPSB0aGlzLm9wdGlvbnMuYmluZFRvV3JhcHBlciA/IHRoaXMud3JhcHBlciA6IHdpbmRvdztcblxuICAgIGV2ZW50VHlwZSh3aW5kb3csICdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh3aW5kb3csICdyZXNpemUnLCB0aGlzKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2spIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsICdjbGljaycsIHRoaXMsIHRydWUpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVNb3VzZSkge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ21vdXNlZG93bicsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNlbW92ZScsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNlY2FuY2VsJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAnbW91c2V1cCcsIHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChoYXNQb2ludGVyICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVBvaW50ZXIpIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsIHByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcmRvd24nKSwgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJtb3ZlJyksIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVyY2FuY2VsJyksIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVydXAnKSwgdGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKGhhc1RvdWNoICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVRvdWNoKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCAndG91Y2hzdGFydCcsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ3RvdWNobW92ZScsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ3RvdWNoY2FuY2VsJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAndG91Y2hlbmQnLCB0aGlzKTtcbiAgICB9XG5cbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ3RyYW5zaXRpb25lbmQnLCB0aGlzKTtcbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ3dlYmtpdFRyYW5zaXRpb25FbmQnLCB0aGlzKTtcbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ29UcmFuc2l0aW9uRW5kJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICdNU1RyYW5zaXRpb25FbmQnLCB0aGlzKTtcbiAgfSxcblxuICBoYW5kbGVFdmVudDogZnVuY3Rpb24gKGUpIHtcbiAgICBzd2l0Y2ggKGUudHlwZSkge1xuICAgICAgY2FzZSAndG91Y2hzdGFydCc6XG4gICAgICBjYXNlICdwb2ludGVyZG93bic6XG4gICAgICBjYXNlICdNU1BvaW50ZXJEb3duJzpcbiAgICAgIGNhc2UgJ21vdXNlZG93bic6XG4gICAgICAgIHRoaXMuX3N0YXJ0KGUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndG91Y2htb3ZlJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJtb3ZlJzpcbiAgICAgIGNhc2UgJ01TUG9pbnRlck1vdmUnOlxuICAgICAgY2FzZSAnbW91c2Vtb3ZlJzpcbiAgICAgICAgdGhpcy5fbW92ZShlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3RvdWNoZW5kJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJ1cCc6XG4gICAgICBjYXNlICdNU1BvaW50ZXJVcCc6XG4gICAgICBjYXNlICdtb3VzZXVwJzpcbiAgICAgIGNhc2UgJ3RvdWNoY2FuY2VsJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJjYW5jZWwnOlxuICAgICAgY2FzZSAnTVNQb2ludGVyQ2FuY2VsJzpcbiAgICAgIGNhc2UgJ21vdXNlY2FuY2VsJzpcbiAgICAgICAgdGhpcy5fZW5kKGUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ29yaWVudGF0aW9uY2hhbmdlJzpcbiAgICAgIGNhc2UgJ3Jlc2l6ZSc6XG4gICAgICAgIHRoaXMuX3Jlc2l6ZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3RyYW5zaXRpb25lbmQnOlxuICAgICAgY2FzZSAnd2Via2l0VHJhbnNpdGlvbkVuZCc6XG4gICAgICBjYXNlICdvVHJhbnNpdGlvbkVuZCc6XG4gICAgICBjYXNlICdNU1RyYW5zaXRpb25FbmQnOlxuICAgICAgICB0aGlzLl90cmFuc2l0aW9uRW5kKGUpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH0sXG5cbiAgX3N0YXJ0OiBmdW5jdGlvbiAoZSkge1xuICAgIGNvbnNvbGUubG9nKCdzdGFydCBldmVudCB0eXBlOiAnLCBlLnR5cGUpO1xuICAgIC8vIFJlYWN0IHRvIGxlZnQgbW91c2UgYnV0dG9uIG9ubHlcbiAgICBpZiAoZXZlbnRUeXBlW2UudHlwZV0gIT09IDEpIHsgLy8gbm90IHRvdWNoIGV2ZW50XG4gICAgICB2YXIgYnV0dG9uO1xuICAgICAgaWYgKCFlLndoaWNoKSB7XG4gICAgICAgIC8qIElFIGNhc2UgKi9cbiAgICAgICAgYnV0dG9uID0gKGUuYnV0dG9uIDwgMikgPyAwIDpcbiAgICAgICAgICAoKGUuYnV0dG9uID09IDQpID8gMSA6IDIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLyogQWxsIG90aGVycyAqL1xuICAgICAgICBidXR0b24gPSBlLmJ1dHRvbjtcbiAgICAgIH1cblxuICAgICAgLy8gbm90IGxlZnQgbW91c2UgYnV0dG9uXG4gICAgICBpZiAoYnV0dG9uICE9PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZW5hYmxlZCB8fCAodGhpcy5pbml0aWF0ZWQgJiYgZXZlbnRUeXBlW2UudHlwZV0gIT09IHRoaXMuaW5pdGlhdGVkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHQgJiYgIWlzQmFkQW5kcm9pZCAmJiAhcHJldmVudERlZmF1bHRFeGNlcHRpb24oZS50YXJnZXQsIHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbikpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnQgPSBlLnRvdWNoZXMgPyBlLnRvdWNoZXNbMF0gOiBlLFxuICAgICAgcG9zO1xuXG4gICAgdGhpcy5pbml0aWF0ZWQgPSBldmVudFR5cGVbZS50eXBlXTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5kaXN0WCA9IDA7XG4gICAgdGhpcy5kaXN0WSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25YID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gMDtcblxuICAgIHRoaXMuc3RhcnRUaW1lID0gZ2V0VGltZSgpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRoaXMuaXNJblRyYW5zaXRpb24pIHtcbiAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1lKCk7XG4gICAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gZmFsc2U7XG4gICAgICBwb3MgPSB0aGlzLmdldENvbXB1dGVkUG9zaXRpb24oKTtcbiAgICAgIHRoaXMuX3RyYW5zbGF0ZShNYXRoLnJvdW5kKHBvcy54KSwgTWF0aC5yb3VuZChwb3MueSkpO1xuICAgICAgdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxFbmQnKTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiB0aGlzLmlzQW5pbWF0aW5nKSB7XG4gICAgICB0aGlzLmlzQW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuICAgIH1cblxuICAgIHRoaXMuc3RhcnRYID0gdGhpcy54O1xuICAgIHRoaXMuc3RhcnRZID0gdGhpcy55O1xuICAgIHRoaXMuYWJzU3RhcnRYID0gdGhpcy54O1xuICAgIHRoaXMuYWJzU3RhcnRZID0gdGhpcy55O1xuICAgIHRoaXMucG9pbnRYID0gcG9pbnQucGFnZVg7XG4gICAgdGhpcy5wb2ludFkgPSBwb2ludC5wYWdlWTtcblxuICAgIHRoaXMuX2V4ZWNFdmVudCgnYmVmb3JlU2Nyb2xsU3RhcnQnKTtcbiAgfSxcblxuICBfbW92ZTogZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCB8fCBldmVudFR5cGVbZS50eXBlXSAhPT0gdGhpcy5pbml0aWF0ZWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdkbyBub3QgbW92ZSBzY3JvbGwnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0KSB7XHQvLyBpbmNyZWFzZXMgcGVyZm9ybWFuY2Ugb24gQW5kcm9pZD8gVE9ETzogY2hlY2shXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgdmFyIHBvaW50ID0gZS50b3VjaGVzID8gZS50b3VjaGVzWzBdIDogZSxcbiAgICAgIGRlbHRhWCA9IHBvaW50LnBhZ2VYIC0gdGhpcy5wb2ludFgsIC8vIHRoZSBtb3ZlZCBkaXN0YW5jZVxuICAgICAgZGVsdGFZID0gcG9pbnQucGFnZVkgLSB0aGlzLnBvaW50WSxcbiAgICAgIHRpbWVzdGFtcCA9IGdldFRpbWUoKSxcbiAgICAgIG5ld1gsIG5ld1ksXG4gICAgICBhYnNEaXN0WCwgYWJzRGlzdFk7XG5cbiAgICB0aGlzLnBvaW50WCA9IHBvaW50LnBhZ2VYO1xuICAgIHRoaXMucG9pbnRZID0gcG9pbnQucGFnZVk7XG5cbiAgICB0aGlzLmRpc3RYICs9IGRlbHRhWDtcbiAgICB0aGlzLmRpc3RZICs9IGRlbHRhWTtcbiAgICBhYnNEaXN0WCA9IE1hdGguYWJzKHRoaXMuZGlzdFgpOyAvLyBhYnNvbHV0ZSBtb3ZlZCBkaXN0YW5jZVxuICAgIGFic0Rpc3RZID0gTWF0aC5hYnModGhpcy5kaXN0WSk7XG5cbiAgICAvKipcbiAgICAgKiAgV2UgbmVlZCB0byBtb3ZlIGF0IGxlYXN0IDEwIHBpeGVscyBmb3IgdGhlIHNjcm9sbGluZyB0byBpbml0aWF0ZVxuICAgICAqICB0aGlzLmVuZFRpbWUgaXMgaW5pdGlhdGVkIGluIHRoaXMucHJvdG90eXBlLnJlZnJlc2ggbWV0aG9kXG4gICAgICovXG4gICAgaWYgKHRpbWVzdGFtcCAtIHRoaXMuZW5kVGltZSA+IDMwMCAmJiAoYWJzRGlzdFggPCAxMCAmJiBhYnNEaXN0WSA8IDEwKSkge1xuICAgICAgY29uc29sZS5sb2coJ2xlc3MgdGhhbiAxMCBweCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHlvdSBhcmUgc2Nyb2xsaW5nIGluIG9uZSBkaXJlY3Rpb24gbG9jayB0aGUgb3RoZXJcbiAgICBpZiAoIXRoaXMuZGlyZWN0aW9uTG9ja2VkICYmICF0aGlzLm9wdGlvbnMuZnJlZVNjcm9sbCkge1xuXG4gICAgICBpZiAoYWJzRGlzdFggPiBhYnNEaXN0WSArIHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ2gnO1x0XHQvLyBsb2NrIGhvcml6b250YWxseVxuICAgICAgfSBlbHNlIGlmIChhYnNEaXN0WSA+PSBhYnNEaXN0WCArIHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ3YnO1x0XHQvLyBsb2NrIHZlcnRpY2FsbHlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ24nO1x0XHQvLyBubyBsb2NrXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICBpZiAodGhpcy5kaXJlY3Rpb25Mb2NrZWQgPT0gJ2gnKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ3ZlcnRpY2FsJykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICdob3Jpem9udGFsJykge1xuICAgICAgICB0aGlzLmluaXRpYXRlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGRlbHRhWSA9IDA7XG4gICAgfSBlbHNlIGlmICh0aGlzLmRpcmVjdGlvbkxvY2tlZCA9PSAndicpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAnaG9yaXpvbnRhbCcpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAndmVydGljYWwnKSB7XG4gICAgICAgIHRoaXMuaW5pdGlhdGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZGVsdGFYID0gMDtcbiAgICB9XG5cbiAgICBkZWx0YVggPSB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPyBkZWx0YVggOiAwO1xuICAgIGRlbHRhWSA9IHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPyBkZWx0YVkgOiAwO1xuXG4gICAgbmV3WCA9IHRoaXMueCArIGRlbHRhWDtcbiAgICBuZXdZID0gdGhpcy55ICsgZGVsdGFZO1xuXG4gICAgLy8gU2xvdyBkb3duIGlmIG91dHNpZGUgb2YgdGhlIGJvdW5kYXJpZXNcbiAgICBpZiAobmV3WCA+IDAgfHwgbmV3WCA8IHRoaXMubWF4U2Nyb2xsWCkge1xuICAgICAgbmV3WCA9IHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLnggKyBkZWx0YVggLyAzIDogbmV3WCA+IDAgPyAwIDogdGhpcy5tYXhTY3JvbGxYO1xuICAgIH1cbiAgICBpZiAobmV3WSA+IDAgfHwgbmV3WSA8IHRoaXMubWF4U2Nyb2xsWSkge1xuICAgICAgbmV3WSA9IHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLnkgKyBkZWx0YVkgLyAzIDogbmV3WSA+IDAgPyAwIDogdGhpcy5tYXhTY3JvbGxZO1xuICAgIH1cblxuICAgIHRoaXMuZGlyZWN0aW9uWCA9IGRlbHRhWCA+IDAgPyAtMSA6IGRlbHRhWCA8IDAgPyAxIDogMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSBkZWx0YVkgPiAwID8gLTEgOiBkZWx0YVkgPCAwID8gMSA6IDA7XG5cbiAgICBpZiAoIXRoaXMubW92ZWQpIHtcbiAgICAgIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsU3RhcnQnKTtcbiAgICB9XG5cbiAgICB0aGlzLm1vdmVkID0gdHJ1ZTtcblxuICAgIHRoaXMuX3RyYW5zbGF0ZShuZXdYLCBuZXdZKTtcblxuICAgIGlmICh0aW1lc3RhbXAgLSB0aGlzLnN0YXJ0VGltZSA+IDMwMCkge1xuICAgICAgdGhpcy5zdGFydFRpbWUgPSB0aW1lc3RhbXA7XG4gICAgICB0aGlzLnN0YXJ0WCA9IHRoaXMueDtcbiAgICAgIHRoaXMuc3RhcnRZID0gdGhpcy55O1xuICAgIH1cbiAgfSxcblxuICBfZW5kOiBmdW5jdGlvbiAoZSkge1xuICAgIGlmICghdGhpcy5lbmFibGVkIHx8IGV2ZW50VHlwZVtlLnR5cGVdICE9PSB0aGlzLmluaXRpYXRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHQgJiYgIXByZXZlbnREZWZhdWx0RXhjZXB0aW9uKGUudGFyZ2V0LCB0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHRFeGNlcHRpb24pKSB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgdmFyIHBvaW50ID0gZS5jaGFuZ2VkVG91Y2hlcyA/IGUuY2hhbmdlZFRvdWNoZXNbMF0gOiBlLFxuICAgICAgbW9tZW50dW1YLFxuICAgICAgbW9tZW50dW1ZLFxuICAgICAgZHVyYXRpb24gPSBnZXRUaW1lKCkgLSB0aGlzLnN0YXJ0VGltZSxcbiAgICAgIG5ld1ggPSBNYXRoLnJvdW5kKHRoaXMueCksXG4gICAgICBuZXdZID0gTWF0aC5yb3VuZCh0aGlzLnkpLFxuICAgICAgZGlzdGFuY2VYID0gTWF0aC5hYnMobmV3WCAtIHRoaXMuc3RhcnRYKSxcbiAgICAgIGRpc3RhbmNlWSA9IE1hdGguYWJzKG5ld1kgLSB0aGlzLnN0YXJ0WSksXG4gICAgICB0aW1lID0gMCxcbiAgICAgIGVhc2luZyA9ICcnO1xuXG4gICAgdGhpcy5pc0luVHJhbnNpdGlvbiA9IDA7XG4gICAgdGhpcy5pbml0aWF0ZWQgPSAwO1xuICAgIHRoaXMuZW5kVGltZSA9IGdldFRpbWUoKTtcblxuICAgIC8vIHJlc2V0IGlmIHdlIGFyZSBvdXRzaWRlIG9mIHRoZSBib3VuZGFyaWVzXG4gICAgaWYgKHRoaXMucmVzZXRQb3NpdGlvbih0aGlzLm9wdGlvbnMuYm91bmNlVGltZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbFRvKG5ld1gsIG5ld1kpO1x0Ly8gZW5zdXJlcyB0aGF0IHRoZSBsYXN0IHBvc2l0aW9uIGlzIHJvdW5kZWRcblxuICAgIC8vIHdlIHNjcm9sbGVkIGxlc3MgdGhhbiAxMCBwaXhlbHNcbiAgICBpZiAoIXRoaXMubW92ZWQpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMudGFwKSB7XG4gICAgICAgIC8vIHV0aWxzLnRhcChlLCB0aGlzLm9wdGlvbnMudGFwKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5jbGljaykge1xuICAgICAgICAvLyB1dGlscy5jbGljayhlKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxDYW5jZWwnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLmZsaWNrICYmIGR1cmF0aW9uIDwgMjAwICYmIGRpc3RhbmNlWCA8IDEwMCAmJiBkaXN0YW5jZVkgPCAxMDApIHtcbiAgICAgIHRoaXMuX2V4ZWNFdmVudCgnZmxpY2snKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBzdGFydCBtb21lbnR1bSBhbmltYXRpb24gaWYgbmVlZGVkXG4gICAgaWYgKHRoaXMub3B0aW9ucy5tb21lbnR1bSAmJiBkdXJhdGlvbiA8IDMwMCkge1xuICAgICAgbW9tZW50dW1YID0gdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsID8gbW9tZW50dW0odGhpcy54LCB0aGlzLnN0YXJ0WCwgZHVyYXRpb24sIHRoaXMubWF4U2Nyb2xsWCwgdGhpcy5vcHRpb25zLmJvdW5jZSA/IHRoaXMud3JhcHBlcldpZHRoIDogMCwgdGhpcy5vcHRpb25zLmRlY2VsZXJhdGlvbikgOiB7IGRlc3RpbmF0aW9uOiBuZXdYLCBkdXJhdGlvbjogMCB9O1xuICAgICAgbW9tZW50dW1ZID0gdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCA/IG1vbWVudHVtKHRoaXMueSwgdGhpcy5zdGFydFksIGR1cmF0aW9uLCB0aGlzLm1heFNjcm9sbFksIHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLndyYXBwZXJIZWlnaHQgOiAwLCB0aGlzLm9wdGlvbnMuZGVjZWxlcmF0aW9uKSA6IHsgZGVzdGluYXRpb246IG5ld1ksIGR1cmF0aW9uOiAwIH07XG4gICAgICBuZXdYID0gbW9tZW50dW1YLmRlc3RpbmF0aW9uO1xuICAgICAgbmV3WSA9IG1vbWVudHVtWS5kZXN0aW5hdGlvbjtcbiAgICAgIHRpbWUgPSBNYXRoLm1heChtb21lbnR1bVguZHVyYXRpb24sIG1vbWVudHVtWS5kdXJhdGlvbik7XG4gICAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gMTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnNuYXApIHtcbiAgICAgIC8vIGRvIHNvbWV0aW5nXG4gICAgfVxuXG4gICAgaWYgKG5ld1ggIT0gdGhpcy54IHx8IG5ld1kgIT0gdGhpcy55KSB7XG4gICAgICAvLyBjaGFuZ2UgZWFzaW5nIGZ1bmN0aW9uIHdoZW4gc2Nyb2xsZXIgZ29lcyBvdXQgb2YgdGhlIGJvdW5kYXJpZXNcbiAgICAgIGlmIChuZXdYID4gMCB8fCBuZXdYIDwgdGhpcy5tYXhTY3JvbGxYIHx8IG5ld1kgPiAwIHx8IG5ld1kgPCB0aGlzLm1heFNjcm9sbFkpIHtcbiAgICAgICAgZWFzaW5nID0gZWFzaW5ncy5xdWFkcmF0aWM7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZygnZW5kIGVuZCBlbmQgZW5kIScpO1xuICAgICAgdGhpcy5zY3JvbGxUbyhuZXdYLCBuZXdZLCB0aW1lLCBlYXNpbmcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsRW5kJyk7XG5cbiAgfSxcblxuICBfdHJhbnNpdGlvbkVuZDogZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS50YXJnZXQgIT0gdGhpcy5zY3JvbGxlciB8fCAhdGhpcy5pc0luVHJhbnNpdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3RyYW5zaXRpb25UaW1lKCk7XG4gICAgaWYgKCF0aGlzLnJlc2V0UG9zaXRpb24odGhpcy5vcHRpb25zLmJvdW5jZVRpbWUpKSB7XG4gICAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gZmFsc2U7XG4gICAgICB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuICAgIH1cbiAgfSxcblxuICBfcmVzaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMucmVzaXplVGltZW91dCk7XG5cbiAgICB0aGlzLnJlc2l6ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdyZXNpemUgbm93Jyk7XG4gICAgICB0aGF0LnJlZnJlc2goKTtcbiAgICB9LCB0aGlzLm9wdGlvbnMucmVzaXplUG9sbGluZyk7XG4gIH0sXG5cblx0b246IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHRcdGlmICggIXRoaXMuX2V2ZW50c1t0eXBlXSApIHtcblx0XHRcdHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xuXHRcdH1cblxuXHRcdHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGZuKTtcbiAgfSxcbiAgXG5cdG9mZjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdFx0aWYgKCAhdGhpcy5fZXZlbnRzW3R5cGVdICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBpbmRleCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5pbmRleE9mKGZuKTtcblxuXHRcdGlmICggaW5kZXggPiAtMSApIHtcblx0XHRcdHRoaXMuX2V2ZW50c1t0eXBlXS5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdH1cblx0fSxcblxuICBfZXhlY0V2ZW50OiBmdW5jdGlvbiAodHlwZSkge1xuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGkgPSAwLFxuICAgICAgbCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG5cbiAgICBpZiAoIWwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cblx0XHRmb3IgKCA7IGkgPCBsOyBpKysgKSB7XG5cdFx0XHR0aGlzLl9ldmVudHNbdHlwZV1baV0uYXBwbHkodGhpcywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcblx0XHR9XG5cbiAgfSxcblxuICBnZXRDb21wdXRlZFBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1hdHJpeCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuc2Nyb2xsZXIsIG51bGwpLFxuICAgICAgeCwgeTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMudXNlVHJhbnNmb3JtKSB7XG4gICAgICBtYXRyaXggPSBtYXRyaXhbc3R5bGVVdGlscy50cmFuc2Zvcm1dLnNwbGl0KCcpJylbMF0uc3BsaXQoJywgJyk7XG4gICAgICB4ID0gKyhtYXRyaXhbMTJdIHx8IG1hdHJpeFs0XSk7XG4gICAgICB5ID0gKyhtYXRyaXhbMTNdIHx8IG1hdHJpeFs1XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGVnLiB0cmFuc2Zvcm0gJzBweCcgdG8gMFxuICAgICAgeCA9ICttYXRyaXgubGVmdC5yZXBsYWNlKC9bXi1cXGQuXS9nLCAnJyk7XG4gICAgICB5ID0gK21hdHJpeC50b3AucmVwbGFjZSgvW14tXFxkLl0vZywgJycpO1xuICAgIH1cblxuICAgIHJldHVybiB7IHg6IHgsIHk6IHkgfTtcbiAgfSxcblxuICBzY3JvbGxUbzogZnVuY3Rpb24gKHgsIHksIHRpbWUsIGVhc2luZykge1xuICAgIGVhc2luZyA9IGVhc2luZyB8fCBlYXNpbmdzLmNpcmN1bGFyO1xuICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSB0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiB0aW1lID4gMDtcbiAgICB2YXIgdHJhbnNpdGlvblR5cGUgPSB0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiBlYXNpbmcuc3R5bGU7XG5cbiAgICBpZiAoIXRpbWUgfHwgdHJhbnNpdGlvblR5cGUpIHtcbiAgICAgIGlmICh0cmFuc2l0aW9uVHlwZSkge1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24oZWFzaW5nLnN0eWxlKTtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWUodGltZSk7XG4gICAgICB9XG4gICAgICB0aGlzLl90cmFuc2xhdGUoeCwgeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FuaW1hdGUoeCwgeSwgdGltZSwgZWFzaW5nLmZuKTtcbiAgICB9XG4gIH0sXG5cbiAgc2Nyb2xsVG9FbGVtZW50OiBmdW5jdGlvbiAoZWwsIHRpbWUsIG9mZnNldFgsIG9mZnNldFksIGVhc2luZykge1xuICAgIGVsID0gZWwubm9kZVR5cGUgPyBlbCA6IHRoaXMuc2Nyb2xsZXIucXVlcnlTZWxlY3RvcihlbCk7XG5cbiAgICAvLyBpZiBubyBlbGVtZW50IHNlbGVjdGVkLCB0aGVuIHJldHVyblxuICAgIGlmICghZWwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcG9zID0gb2Zmc2V0VXRpbHMoZWwpO1xuICB9LFxuXG4gIF90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IGZ1bmN0aW9uIChlYXNpbmdTdHlsZSkge1xuICAgIC8vIGFzc2lnbiBlYXNpbmcgY3NzIHN0eWxlIHRvIHNjcm9sbCBjb250YWluZXIgdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIHByb3BlcnR5XG4gICAgLy8gZXhhbXBsZTogY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpXG4gICAgdGhpcy5zY3JvbGxlclN0eWxlW3N0eWxlVXRpbHMudHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uXSA9IGVhc2luZ1N0eWxlO1xuICB9LFxuXG4gIF90cmFuc2l0aW9uVGltZTogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICAvLyBpZiBkbyBub3QgdXNlIHRyYW5zaXRpb24gdG8gc2Nyb2xsLCByZXR1cm5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcbiAgICAvLyB0cmFuc2l0aW9uRHVyYXRpb24gd2hpY2ggaGFzIHZlbmRvciBwcmVmaXhcbiAgICB2YXIgZHVyYXRpb25Qcm9wID0gc3R5bGVVdGlscy50cmFuc2l0aW9uRHVyYXRpb247XG4gICAgaWYgKCFkdXJhdGlvblByb3ApIHsgLy8gaWYgbm8gdmVuZG9yIGZvdW5kLCBkdXJhdGlvblByb3Agd2lsbCBiZSBmYWxzZVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gdGltZSArICdtcyc7IC8vIGFzc2lnbiBtcyB0byB0cmFuc2l0aW9uRHVyYXRpb24gcHJvcFxuXG4gICAgaWYgKCF0aW1lICYmIGlzQmFkQW5kcm9pZCkge1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSAnMC4wMDAxbXMnO1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICByQUYoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoc2VsZi5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPT09ICcwLjAwMDFtcycpIHtcbiAgICAgICAgICBzZWxmLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9ICcwcyc7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfdHJhbnNsYXRlOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgIGNvbnNvbGUubG9nKCd0cmFuc2xhdGUgbm93ISE6ICcsIHgsICcgJywgeSk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2Zvcm0pIHtcblxuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW3N0eWxlVXRpbHMudHJhbnNmb3JtXSA9XG4gICAgICAgICd0cmFuc2xhdGUoJyArIHggKyAncHgsJyArIHkgKyAncHgpJyArICd0cmFuc2xhdGVaKDApJztcblxuICAgIH0gZWxzZSB7XG4gICAgICB4ID0gTWF0aC5yb3VuZCh4KTtcbiAgICAgIHkgPSBNYXRoLnJvdW5kKHkpO1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlLmxlZnQgPSB4ICsgJ3B4JztcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZS50b3AgPSB5ICsgJ3B4JztcbiAgICB9XG5cbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gIH0sXG5cbiAgX2FuaW1hdGU6IGZ1bmN0aW9uIChkZXN0WCwgZGVzdFksIGR1cmF0aW9uLCBlYXNpbmdGbikge1xuICAgIHZhciB0aGF0ID0gdGhpcyxcbiAgICAgIHN0YXJ0WCA9IHRoaXMueCxcbiAgICAgIHN0YXJ0WSA9IHRoaXMueSxcbiAgICAgIHN0YXJ0VGltZSA9IGdldFRpbWUoKSxcbiAgICAgIGRlc3RUaW1lID0gc3RhcnRUaW1lICsgZHVyYXRpb247XG5cbiAgICBmdW5jdGlvbiBzdGVwKCkge1xuICAgICAgdmFyIG5vdyA9IGdldFRpbWUoKSxcbiAgICAgICAgbmV3WCwgbmV3WSxcbiAgICAgICAgZWFzaW5nO1xuXG4gICAgICBpZiAobm93ID49IGRlc3RUaW1lKSB7XG4gICAgICAgIHRoYXQuaXNBbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhhdC5fdHJhbnNsYXRlKGRlc3RYLCBkZXN0WSk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBub3cgPSAobm93IC0gc3RhcnRUaW1lKSAvIGR1cmF0aW9uO1xuICAgICAgZWFzaW5nID0gZWFzaW5nRm4obm93KTtcbiAgICAgIG5ld1ggPSAoZGVzdFggLSBzdGFydFgpICogZWFzaW5nICsgc3RhcnRYO1xuICAgICAgbmV3WSA9IChkZXN0WSAtIHN0YXJ0WSkgKiBlYXNpbmcgKyBzdGFydFk7XG4gICAgICB0aGF0Ll90cmFuc2xhdGUobmV3WCwgbmV3WSk7XG5cbiAgICAgIGlmICh0aGF0LmlzQW5pbWF0aW5nKSB7XG4gICAgICAgIHJBRihzdGVwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzQW5pbWF0aW5nID0gdHJ1ZTtcbiAgICBzdGVwKCk7XG4gIH0sXG5cbiAgcmVmcmVzaDogZnVuY3Rpb24gKCkge1xuICAgIGdldFJlY3QodGhpcy53cmFwcGVyKTsgLy8gRm9yY2UgcmVmbG93XG5cbiAgICB0aGlzLndyYXBwZXJXaWR0aCA9IHRoaXMud3JhcHBlci5jbGllbnRXaWR0aDtcbiAgICB0aGlzLndyYXBwZXJIZWlnaHQgPSB0aGlzLndyYXBwZXIuY2xpZW50SGVpZ2h0O1xuXG4gICAgdmFyIHJlY3QgPSBnZXRSZWN0KHRoaXMuc2Nyb2xsZXIpO1xuXG4gICAgdGhpcy5zY3JvbGxlcldpZHRoID0gcmVjdC53aWR0aDtcbiAgICB0aGlzLnNjcm9sbGVySGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XG5cbiAgICAvKipcbiAgICAgKiB0aGlzLm1heFNjcm9sbFggb3IgdGhpcy5tYXhTY3JvbGxZIHNtYWxsZXIgdGhhbiAwLCBtZWFuaW5nXG4gICAgICogb3ZlcmZsb3cgaGFwcGVuZWQuXG4gICAgICovXG4gICAgdGhpcy5tYXhTY3JvbGxYID0gdGhpcy53cmFwcGVyV2lkdGggLSB0aGlzLnNjcm9sbGVyV2lkdGg7XG4gICAgdGhpcy5tYXhTY3JvbGxZID0gdGhpcy53cmFwcGVySGVpZ2h0IC0gdGhpcy5zY3JvbGxlckhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIG9wdGlvbiBlbmFibGVzIHNjcm9sbCBBTkQgb3ZlcmZsb3cgZXhpc3RzXG4gICAgICovXG4gICAgdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsID0gdGhpcy5vcHRpb25zLnNjcm9sbFggJiYgdGhpcy5tYXhTY3JvbGxYIDwgMDtcbiAgICB0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsID0gdGhpcy5vcHRpb25zLnNjcm9sbFkgJiYgdGhpcy5tYXhTY3JvbGxZIDwgMDtcblxuICAgIGlmICghdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsKSB7XG4gICAgICB0aGlzLm1heFNjcm9sbFggPSAwO1xuICAgICAgdGhpcy5zY3JvbGxlcldpZHRoID0gdGhpcy53cmFwcGVyV2lkdGg7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsKSB7XG4gICAgICB0aGlzLm1heFNjcm9sbFkgPSAwO1xuICAgICAgdGhpcy5zY3JvbGxlckhlaWdodCA9IHRoaXMud3JhcHBlckhlaWdodDtcbiAgICB9XG5cbiAgICB0aGlzLmVuZFRpbWUgPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWCA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25ZID0gMDtcblxuICAgIGlmIChoYXNQb2ludGVyICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVBvaW50ZXIpIHtcbiAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSA9XG4gICAgICAgIGdldFRvdWNoQWN0aW9uKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoLCB0cnVlKTtcblxuICAgICAgaWYgKCF0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0pIHtcbiAgICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dID1cbiAgICAgICAgICBnZXRUb3VjaEFjdGlvbih0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCwgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMud3JhcHBlck9mZnNldCA9IG9mZnNldFV0aWxzKHRoaXMud3JhcHBlcik7XG5cbiAgICB0aGlzLl9leGVjRXZlbnQoJ3JlZnJlc2gnKTtcblxuICAgIHRoaXMucmVzZXRQb3NpdGlvbigpO1xuICB9LFxuXG4gIHJlc2V0UG9zaXRpb246IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdmFyIHggPSB0aGlzLngsXG4gICAgICB5ID0gdGhpcy55O1xuXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcblxuICAgIGlmICghdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsIHx8IHRoaXMueCA+IDApIHtcbiAgICAgIHggPSAwO1xuICAgIH0gZWxzZSBpZiAodGhpcy54IDwgdGhpcy5tYXhTY3JvbGxYKSB7XG4gICAgICB4ID0gdGhpcy5tYXhTY3JvbGxYO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCB8fCB0aGlzLnkgPiAwKSB7XG4gICAgICB5ID0gMDtcbiAgICB9IGVsc2UgaWYgKHRoaXMueSA8IHRoaXMubWF4U2Nyb2xsWSkge1xuICAgICAgeSA9IHRoaXMubWF4U2Nyb2xsWTtcbiAgICB9XG5cbiAgICBpZiAoeCA9PT0gdGhpcy54ICYmIHkgPT09IHRoaXMueSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsVG8oeCwgeSwgdGltZSwgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBkaXNhYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGVkID0gZmFsc2U7XG4gIH0sXG5cbiAgZW5hYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGVkID0gdHJ1ZTtcbiAgfVxuXG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IElzY3JvbGw7Il0sIm5hbWVzIjpbImVhc2luZ3MiLCJrIiwiTWF0aCIsInNxcnQiLCJiIiwiZiIsImUiLCJwb3ciLCJzaW4iLCJQSSIsIl9lbGVtZW50U3R5bGUiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzdHlsZSIsIl92ZW5kb3IiLCJ2ZW5kb3JzIiwidHJhbnNmb3JtIiwiaSIsImwiLCJsZW5ndGgiLCJzdWJzdHIiLCJfcHJlZml4U3R5bGUiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsImlzQmFkQW5kcm9pZCIsImFwcFZlcnNpb24iLCJ3aW5kb3ciLCJuYXZpZ2F0b3IiLCJ0ZXN0Iiwic2FmYXJpVmVyc2lvbiIsIm1hdGNoIiwicGFyc2VGbG9hdCIsImdldFRpbWUiLCJEYXRlIiwibm93Iiwib2Zmc2V0IiwiZWwiLCJsZWZ0Iiwib2Zmc2V0TGVmdCIsInRvcCIsIm9mZnNldFRvcCIsIm9mZnNldFBhcmVudCIsImdldFJlY3QiLCJTVkdFbGVtZW50IiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsIndpZHRoIiwiaGVpZ2h0Iiwib2Zmc2V0V2lkdGgiLCJvZmZzZXRIZWlnaHQiLCJoYXNQb2ludGVyIiwiUG9pbnRlckV2ZW50IiwiTVNQb2ludGVyRXZlbnQiLCJoYXNUb3VjaCIsImdldFRvdWNoQWN0aW9uIiwiZXZlbnRQYXNzdGhyb3VnaCIsImFkZFBpbmNoIiwidG91Y2hBY3Rpb24iLCJhZGRFdmVudCIsInR5cGUiLCJmbiIsImNhcHR1cmUiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnQiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwicHJlZml4UG9pbnRlckV2ZW50IiwicG9pbnRlckV2ZW50IiwiZXZlbnRUeXBlIiwicHJldmVudERlZmF1bHRFeGNlcHRpb24iLCJleGNlcHRpb25zIiwibW9tZW50dW0iLCJjdXJyZW50Iiwic3RhcnQiLCJ0aW1lIiwibG93ZXJNYXJnaW4iLCJ3cmFwcGVyU2l6ZSIsImRlY2VsZXJhdGlvbiIsImRpc3RhbmNlIiwic3BlZWQiLCJhYnMiLCJkZXN0aW5hdGlvbiIsImR1cmF0aW9uIiwidW5kZWZpbmVkIiwicm91bmQiLCJyQUYiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ3ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJtb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJvUmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwibXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJjYWxsYmFjayIsInNldFRpbWVvdXQiLCJJc2Nyb2xsIiwiZWxlbSIsIm9wdGlvbnMiLCJ3cmFwcGVyIiwicXVlcnlTZWxlY3RvciIsInNjcm9sbGVyIiwiY2hpbGRyZW4iLCJzY3JvbGxlclN0eWxlIiwib25tb3VzZWRvd24iLCJ0YWdOYW1lIiwic2Nyb2xsWSIsInNjcm9sbFgiLCJmcmVlU2Nyb2xsIiwiZGlyZWN0aW9uTG9ja1RocmVzaG9sZCIsImJvdW5jZUVhc2luZyIsImNpcmN1bGFyIiwicmVzaXplUG9sbGluZyIsIngiLCJ5IiwiZGlyZWN0aW9uWCIsImRpcmVjdGlvblkiLCJfZXZlbnRzIiwiX2luaXQiLCJyZWZyZXNoIiwic2Nyb2xsVG8iLCJzdGFydFgiLCJzdGFydFkiLCJlbmFibGUiLCJwcm90b3R5cGUiLCJfaW5pdEV2ZW50cyIsInJlbW92ZSIsInRhcmdldCIsImJpbmRUb1dyYXBwZXIiLCJjbGljayIsImRpc2FibGVNb3VzZSIsImRpc2FibGVQb2ludGVyIiwiZGlzYWJsZVRvdWNoIiwiX3N0YXJ0IiwiX21vdmUiLCJfZW5kIiwiX3Jlc2l6ZSIsIl90cmFuc2l0aW9uRW5kIiwibG9nIiwiYnV0dG9uIiwid2hpY2giLCJlbmFibGVkIiwiaW5pdGlhdGVkIiwicHJldmVudERlZmF1bHQiLCJwb2ludCIsInRvdWNoZXMiLCJwb3MiLCJtb3ZlZCIsImRpc3RYIiwiZGlzdFkiLCJkaXJlY3Rpb25Mb2NrZWQiLCJzdGFydFRpbWUiLCJ1c2VUcmFuc2l0aW9uIiwiaXNJblRyYW5zaXRpb24iLCJfdHJhbnNpdGlvblRpbWUiLCJnZXRDb21wdXRlZFBvc2l0aW9uIiwiX3RyYW5zbGF0ZSIsIl9leGVjRXZlbnQiLCJpc0FuaW1hdGluZyIsImFic1N0YXJ0WCIsImFic1N0YXJ0WSIsInBvaW50WCIsInBhZ2VYIiwicG9pbnRZIiwicGFnZVkiLCJkZWx0YVgiLCJ0aW1lc3RhbXAiLCJuZXdYIiwibmV3WSIsImFic0Rpc3RYIiwiYWJzRGlzdFkiLCJkZWx0YVkiLCJlbmRUaW1lIiwiaGFzSG9yaXpvbnRhbFNjcm9sbCIsImhhc1ZlcnRpY2FsU2Nyb2xsIiwibWF4U2Nyb2xsWCIsImJvdW5jZSIsIm1heFNjcm9sbFkiLCJjaGFuZ2VkVG91Y2hlcyIsIm1vbWVudHVtWCIsIm1vbWVudHVtWSIsImRpc3RhbmNlWCIsImRpc3RhbmNlWSIsImVhc2luZyIsInJlc2V0UG9zaXRpb24iLCJib3VuY2VUaW1lIiwidGFwIiwiZmxpY2siLCJ3cmFwcGVyV2lkdGgiLCJ3cmFwcGVySGVpZ2h0IiwibWF4Iiwic25hcCIsInF1YWRyYXRpYyIsInRoYXQiLCJyZXNpemVUaW1lb3V0IiwicHVzaCIsImluZGV4IiwiaW5kZXhPZiIsInNwbGljZSIsImFwcGx5Iiwic2xpY2UiLCJjYWxsIiwiYXJndW1lbnRzIiwibWF0cml4IiwiZ2V0Q29tcHV0ZWRTdHlsZSIsInVzZVRyYW5zZm9ybSIsInN0eWxlVXRpbHMiLCJzcGxpdCIsInJlcGxhY2UiLCJ0cmFuc2l0aW9uVHlwZSIsIl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJfYW5pbWF0ZSIsIm9mZnNldFgiLCJvZmZzZXRZIiwibm9kZVR5cGUiLCJvZmZzZXRVdGlscyIsImVhc2luZ1N0eWxlIiwidHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIiwiZHVyYXRpb25Qcm9wIiwidHJhbnNpdGlvbkR1cmF0aW9uIiwic2VsZiIsImRlc3RYIiwiZGVzdFkiLCJlYXNpbmdGbiIsImRlc3RUaW1lIiwic3RlcCIsImNsaWVudFdpZHRoIiwiY2xpZW50SGVpZ2h0Iiwic2Nyb2xsZXJXaWR0aCIsInNjcm9sbGVySGVpZ2h0Iiwid3JhcHBlck9mZnNldCJdLCJtYXBwaW5ncyI6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

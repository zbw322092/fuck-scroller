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

export default Iscroll;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5tb2R1bGUuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9lYXNpbmdzLmpzIiwiLi4vc3JjL3V0aWxzL3N0eWxlLmpzIiwiLi4vc3JjL3V0aWxzL2lzQmFkQW5kcm9pZC5qcyIsIi4uL3NyYy91dGlscy9nZXRUaW1lLmpzIiwiLi4vc3JjL3V0aWxzL29mZnNldC5qcyIsIi4uL3NyYy91dGlscy9nZXRSZWN0LmpzIiwiLi4vc3JjL3V0aWxzL2RldGVjdG9yLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRvdWNoQWN0aW9uLmpzIiwiLi4vc3JjL3V0aWxzL2V2ZW50SGFuZGxlci5qcyIsIi4uL3NyYy91dGlscy9wcmVmaXhQb2ludGVyRXZlbnQuanMiLCIuLi9zcmMvdXRpbHMvZXZlbnRUeXBlLmpzIiwiLi4vc3JjL3V0aWxzL3ByZXZlbnREZWZhdWx0RXhjZXB0aW9uLmpzIiwiLi4vc3JjL3V0aWxzL21vbWVudHVtLmpzIiwiLi4vc3JjL215LWlzY3JvbGwuanMiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIGVhc2luZ3MgPSB7XG4gIHF1YWRyYXRpYzoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBrICogKDIgLSBrKTtcbiAgICB9XG4gIH0sXG4gIGNpcmN1bGFyOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xLCAwLjU3LCAwLjEsIDEpJyxcdC8vIE5vdCBwcm9wZXJseSBcImNpcmN1bGFyXCIgYnV0IHRoaXMgbG9va3MgYmV0dGVyLCBpdCBzaG91bGQgYmUgKDAuMDc1LCAwLjgyLCAwLjE2NSwgMSlcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoMSAtICgtLWsgKiBrKSk7XG4gICAgfVxuICB9LFxuICBiYWNrOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xNzUsIDAuODg1LCAwLjMyLCAxLjI3NSknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGIgPSA0O1xuICAgICAgcmV0dXJuIChrID0gayAtIDEpICogayAqICgoYiArIDEpICogayArIGIpICsgMTtcbiAgICB9XG4gIH0sXG4gIGJvdW5jZToge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIGlmICgoayAvPSAxKSA8ICgxIC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIGsgKiBrO1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDEuNSAvIDIuNzUpKSAqIGsgKyAwLjc1O1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIuNSAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi4yNSAvIDIuNzUpKSAqIGsgKyAwLjkzNzU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuNjI1IC8gMi43NSkpICogayArIDAuOTg0Mzc1O1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZWxhc3RpYzoge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciBmID0gMC4yMixcbiAgICAgICAgZSA9IDAuNDtcblxuICAgICAgaWYgKGsgPT09IDApIHsgcmV0dXJuIDA7IH1cbiAgICAgIGlmIChrID09IDEpIHsgcmV0dXJuIDE7IH1cblxuICAgICAgcmV0dXJuIChlICogTWF0aC5wb3coMiwgLSAxMCAqIGspICogTWF0aC5zaW4oKGsgLSBmIC8gNCkgKiAoMiAqIE1hdGguUEkpIC8gZikgKyAxKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGVhc2luZ3M7IiwidmFyIF9lbGVtZW50U3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKS5zdHlsZTtcblxudmFyIF92ZW5kb3IgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgdmVuZG9ycyA9IFsndCcsICd3ZWJraXRUJywgJ01velQnLCAnbXNUJywgJ09UJ10sXG4gICAgdHJhbnNmb3JtLFxuICAgIGkgPSAwLFxuICAgIGwgPSB2ZW5kb3JzLmxlbmd0aDtcblxuICB3aGlsZSAoaSA8IGwpIHtcbiAgICB0cmFuc2Zvcm0gPSB2ZW5kb3JzW2ldICsgJ3JhbnNmb3JtJztcbiAgICBpZiAodHJhbnNmb3JtIGluIF9lbGVtZW50U3R5bGUpIHtcbiAgICAgIHJldHVybiB2ZW5kb3JzW2ldLnN1YnN0cigwLCB2ZW5kb3JzW2ldLmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICBpKys7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59KSgpO1xuXG5mdW5jdGlvbiBfcHJlZml4U3R5bGUgKHN0eWxlKSB7XG4gIGlmICggX3ZlbmRvciA9PT0gZmFsc2UgKSByZXR1cm4gZmFsc2U7IC8vIG5vIHZlbmRvciBmb3VuZFxuICBpZiAoIF92ZW5kb3IgPT09ICcnICkgcmV0dXJuIHN0eWxlOyAvLyBubyBwcmVmaXggbmVlZGVkXG4gIHJldHVybiBfdmVuZG9yICsgc3R5bGUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHlsZS5zdWJzdHIoMSk7IC8vIG90aGVyd2lzZSBhZGQgcHJlZml4XG59XG5cbi8vIHN0eWxlIHRoYXQgaGFzIHZlbmRvciBwcmVmaXgsIGVnOiB3ZWJraXRUcmFuc2Zvcm1cbnZhciBzdHlsZSA9IHtcbiAgdHJhbnNmb3JtOiBfcHJlZml4U3R5bGUoJ3RyYW5zZm9ybScpLFxuICB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uJyksXG4gIHRyYW5zaXRpb25EdXJhdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uRHVyYXRpb24nKSxcbiAgdHJhbnNpdGlvbkRlbGF5OiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EZWxheScpLFxuICB0cmFuc2Zvcm1PcmlnaW46IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtT3JpZ2luJyksXG4gIHRvdWNoQWN0aW9uOiBfcHJlZml4U3R5bGUoJ3RvdWNoQWN0aW9uJylcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHN0eWxlOyIsInZhciBpc0JhZEFuZHJvaWQgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgYXBwVmVyc2lvbiA9IHdpbmRvdy5uYXZpZ2F0b3IuYXBwVmVyc2lvbjtcblxuICBpZiAoL0FuZHJvaWQvLnRlc3QoYXBwVmVyc2lvbikgJiYgISgvQ2hyb21lXFwvXFxkLy50ZXN0KGFwcFZlcnNpb24pKSkge1xuICAgIHZhciBzYWZhcmlWZXJzaW9uID0gYXBwVmVyc2lvbi5tYXRjaCgvU2FmYXJpXFwvKFxcZCsuXFxkKS8pO1xuICAgIGlmKHNhZmFyaVZlcnNpb24gJiYgdHlwZW9mIHNhZmFyaVZlcnNpb24gPT09IFwib2JqZWN0XCIgJiYgc2FmYXJpVmVyc2lvbi5sZW5ndGggPj0gMikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoc2FmYXJpVmVyc2lvblsxXSkgPCA1MzUuMTk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzQmFkQW5kcm9pZDsiLCIvKipcbiAqIDEuIERhdGUucHJvdG90eXBlLmdldFRpbWUgaGFzIEJFVFRFUiBjb21wYXRpYmlsaXR5IHRoYW4gRGF0ZS5ub3dcbiAqIHJlZmVyZW5jZTogXG4gKiAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9nZXRUaW1lI0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0RhdGUvbm93I0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogXG4gKiAyLiBEYXRlLnByb3RvdHlwZS5nZXRUaW1lIHNwZWVkIGlzIFNMT1dTRVIgdGhhbiBEYXRlLm5vd1xuICogcmVmZXJlbmNlOlxuICogIGh0dHBzOi8vanNwZXJmLmNvbS9kYXRlLW5vdy12cy1kYXRlLWdldHRpbWUvN1xuICovXG5cbnZhciBnZXRUaW1lID0gRGF0ZS5ub3cgfHxcbiAgZnVuY3Rpb24gZ2V0VGltZSgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbmV4cG9ydCBkZWZhdWx0IGdldFRpbWU7IiwidmFyIG9mZnNldCA9IGZ1bmN0aW9uIChlbCkge1xuICB2YXIgbGVmdCA9IC1lbC5vZmZzZXRMZWZ0LFxuICB0b3AgPSAtZWwub2Zmc2V0VG9wO1xuXG4gIC8qKlxuICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvSFRNTEVsZW1lbnQvb2Zmc2V0UGFyZW50XG4gICAqIFJldHVybnMgbnVsbCB3aGVuIHRoZSBlbGVtZW50IGhhcyBzdHlsZS5kaXNwbGF5IHNldCB0byBcIm5vbmVcIi4gVGhlIG9mZnNldFBhcmVudCBcbiAgICogaXMgdXNlZnVsIGJlY2F1c2Ugb2Zmc2V0VG9wIGFuZCBvZmZzZXRMZWZ0IGFyZSByZWxhdGl2ZSB0byBpdHMgcGFkZGluZyBlZGdlLlxuICAgKi9cbiAgd2hpbGUgKGVsID0gZWwub2Zmc2V0UGFyZW50KSB7XG4gICAgbGVmdCAtPSBlbC5vZmZzZXRMZWZ0O1xuICAgIHRvcCAtPSBlbC5vZmZzZXRUb3A7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGxlZnQ6IGxlZnQsXG4gICAgdG9wOiB0b3BcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgb2Zmc2V0OyIsImZ1bmN0aW9uIGdldFJlY3QoZWwpIHtcbiAgaWYgKGVsIGluc3RhbmNlb2YgU1ZHRWxlbWVudCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wIDogcmVjdC50b3AsXG4gICAgICBsZWZ0IDogcmVjdC5sZWZ0LFxuICAgICAgd2lkdGggOiByZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0IDogcmVjdC5oZWlnaHRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcCA6IGVsLm9mZnNldFRvcCxcbiAgICAgIGxlZnQgOiBlbC5vZmZzZXRMZWZ0LFxuICAgICAgd2lkdGggOiBlbC5vZmZzZXRXaWR0aCxcbiAgICAgIGhlaWdodCA6IGVsLm9mZnNldEhlaWdodFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZ2V0UmVjdDsiLCJ2YXIgaGFzUG9pbnRlciA9ICEhKHdpbmRvdy5Qb2ludGVyRXZlbnQgfHwgd2luZG93Lk1TUG9pbnRlckV2ZW50KTsgLy8gSUUxMCBpcyBwcmVmaXhlZFxudmFyIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93O1xuXG5leHBvcnQge1xuICBoYXNQb2ludGVyLFxuICBoYXNUb3VjaFxufSIsInZhciBnZXRUb3VjaEFjdGlvbiA9IGZ1bmN0aW9uIChldmVudFBhc3N0aHJvdWdoLCBhZGRQaW5jaCkge1xuICB2YXIgdG91Y2hBY3Rpb24gPSAnbm9uZSc7XG4gIGlmIChldmVudFBhc3N0aHJvdWdoID09PSAndmVydGljYWwnKSB7XG4gICAgdG91Y2hBY3Rpb24gPSAncGFuLXknO1xuICB9IGVsc2UgaWYgKGV2ZW50UGFzc3Rocm91Z2ggPT09ICdob3Jpem9udGFsJykge1xuICAgIHRvdWNoQWN0aW9uID0gJ3Bhbi14JztcbiAgfVxuXG4gIGlmIChhZGRQaW5jaCAmJiB0b3VjaEFjdGlvbiAhPSAnbm9uZScpIHtcbiAgICAvLyBhZGQgcGluY2gtem9vbSBzdXBwb3J0IGlmIHRoZSBicm93c2VyIHN1cHBvcnRzIGl0LCBidXQgaWYgbm90IChlZy4gQ2hyb21lIDw1NSkgZG8gbm90aGluZ1xuICAgIHRvdWNoQWN0aW9uICs9ICcgcGluY2gtem9vbSc7XG4gIH1cbiAgcmV0dXJuIHRvdWNoQWN0aW9uO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRUb3VjaEFjdGlvbjsiLCJmdW5jdGlvbiBhZGRFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59O1xuXG5mdW5jdGlvbiByZW1vdmVFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59XG5cbmV4cG9ydCB7XG4gIGFkZEV2ZW50LFxuICByZW1vdmVFdmVudFxufTsiLCJmdW5jdGlvbiBwcmVmaXhQb2ludGVyRXZlbnQgKHBvaW50ZXJFdmVudCkge1xuICByZXR1cm4gd2luZG93Lk1TUG9pbnRlckV2ZW50ID8gXG4gICAgJ01TUG9pbnRlcicgKyBwb2ludGVyRXZlbnQuY2hhckF0KDcpLnRvVXBwZXJDYXNlKCkgKyBwb2ludGVyRXZlbnQuc3Vic3RyKDgpIDpcbiAgICBwb2ludGVyRXZlbnQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHByZWZpeFBvaW50ZXJFdmVudDsiLCJ2YXIgZXZlbnRUeXBlID0ge1xuICB0b3VjaHN0YXJ0OiAxLFxuICB0b3VjaG1vdmU6IDEsXG4gIHRvdWNoZW5kOiAxLFxuXG4gIG1vdXNlZG93bjogMixcbiAgbW91c2Vtb3ZlOiAyLFxuICBtb3VzZXVwOiAyLFxuXG4gIHBvaW50ZXJkb3duOiAzLFxuICBwb2ludGVybW92ZTogMyxcbiAgcG9pbnRlcnVwOiAzLFxuXG4gIE1TUG9pbnRlckRvd246IDMsXG4gIE1TUG9pbnRlck1vdmU6IDMsXG4gIE1TUG9pbnRlclVwOiAzXG59O1xuXG5leHBvcnQgZGVmYXVsdCBldmVudFR5cGU7IiwidmFyIHByZXZlbnREZWZhdWx0RXhjZXB0aW9uID0gZnVuY3Rpb24gKGVsLCBleGNlcHRpb25zKSB7XG4gIGZvciAodmFyIGkgaW4gZXhjZXB0aW9ucykge1xuICAgIGlmICggZXhjZXB0aW9uc1tpXS50ZXN0KGVsW2ldKSApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHByZXZlbnREZWZhdWx0RXhjZXB0aW9uOyIsInZhciBtb21lbnR1bSA9IGZ1bmN0aW9uIChjdXJyZW50LCBzdGFydCwgdGltZSwgbG93ZXJNYXJnaW4sIHdyYXBwZXJTaXplLCBkZWNlbGVyYXRpb24pIHtcbiAgdmFyIGRpc3RhbmNlID0gY3VycmVudCAtIHN0YXJ0LFxuICAgIHNwZWVkID0gTWF0aC5hYnMoZGlzdGFuY2UpIC8gdGltZSxcbiAgICBkZXN0aW5hdGlvbixcbiAgICBkdXJhdGlvbjtcblxuICBkZWNlbGVyYXRpb24gPSBkZWNlbGVyYXRpb24gPT09IHVuZGVmaW5lZCA/IDAuMDAwNiA6IGRlY2VsZXJhdGlvbjtcblxuICBkZXN0aW5hdGlvbiA9IGN1cnJlbnQgKyAoIHNwZWVkICogc3BlZWQgKSAvICggMiAqIGRlY2VsZXJhdGlvbiApICogKCBkaXN0YW5jZSA8IDAgPyAtMSA6IDEgKTtcbiAgZHVyYXRpb24gPSBzcGVlZCAvIGRlY2VsZXJhdGlvbjtcblxuICBpZiAoIGRlc3RpbmF0aW9uIDwgbG93ZXJNYXJnaW4gKSB7XG4gICAgZGVzdGluYXRpb24gPSB3cmFwcGVyU2l6ZSA/IGxvd2VyTWFyZ2luIC0gKCB3cmFwcGVyU2l6ZSAvIDIuNSAqICggc3BlZWQgLyA4ICkgKSA6IGxvd2VyTWFyZ2luO1xuICAgIGRpc3RhbmNlID0gTWF0aC5hYnMoZGVzdGluYXRpb24gLSBjdXJyZW50KTtcbiAgICBkdXJhdGlvbiA9IGRpc3RhbmNlIC8gc3BlZWQ7XG4gIH0gZWxzZSBpZiAoIGRlc3RpbmF0aW9uID4gMCApIHtcbiAgICBkZXN0aW5hdGlvbiA9IHdyYXBwZXJTaXplID8gd3JhcHBlclNpemUgLyAyLjUgKiAoIHNwZWVkIC8gOCApIDogMDtcbiAgICBkaXN0YW5jZSA9IE1hdGguYWJzKGN1cnJlbnQpICsgZGVzdGluYXRpb247XG4gICAgZHVyYXRpb24gPSBkaXN0YW5jZSAvIHNwZWVkO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBkZXN0aW5hdGlvbjogTWF0aC5yb3VuZChkZXN0aW5hdGlvbiksXG4gICAgZHVyYXRpb246IGR1cmF0aW9uXG4gIH07XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1vbWVudHVtOyIsImltcG9ydCBlYXNpbmdzIGZyb20gJy4vdXRpbHMvZWFzaW5ncyc7XG5pbXBvcnQgc3R5bGVVdGlscyBmcm9tICcuL3V0aWxzL3N0eWxlJztcbmltcG9ydCBpc0JhZEFuZHJvaWQgZnJvbSAnLi91dGlscy9pc0JhZEFuZHJvaWQnO1xuaW1wb3J0IGdldFRpbWUgZnJvbSAnLi91dGlscy9nZXRUaW1lJztcbmltcG9ydCBvZmZzZXRVdGlscyBmcm9tICcuL3V0aWxzL29mZnNldCc7XG5pbXBvcnQgZ2V0UmVjdCBmcm9tICcuL3V0aWxzL2dldFJlY3QnO1xuaW1wb3J0IHsgaGFzUG9pbnRlciwgaGFzVG91Y2ggfSBmcm9tICcuL3V0aWxzL2RldGVjdG9yJztcbmltcG9ydCBnZXRUb3VjaEFjdGlvbiBmcm9tICcuL3V0aWxzL2dldFRvdWNoQWN0aW9uJztcbmltcG9ydCB7IGFkZEV2ZW50LCByZW1vdmVFdmVudCB9IGZyb20gJy4vdXRpbHMvZXZlbnRIYW5kbGVyJztcbmltcG9ydCBwcmVmaXhQb2ludGVyRXZlbnQgZnJvbSAnLi91dGlscy9wcmVmaXhQb2ludGVyRXZlbnQnO1xuaW1wb3J0IGV2ZW50VHlwZSBmcm9tICcuL3V0aWxzL2V2ZW50VHlwZSc7XG5pbXBvcnQgcHJldmVudERlZmF1bHRFeGNlcHRpb24gZnJvbSAnLi91dGlscy9wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbic7XG5pbXBvcnQgbW9tZW50dW0gZnJvbSAnLi91dGlscy9tb21lbnR1bSc7XG5cbi8vIGRlYWwgd2l0aCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgY29tcGF0YmlsaXR5XG52YXIgckFGID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGZ1bmN0aW9uIChjYWxsYmFjaykgeyB3aW5kb3cuc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTsgfTtcblxuZnVuY3Rpb24gSXNjcm9sbChlbGVtLCBvcHRpb25zKSB7XG4gIC8qKlxuICAgKiBnZXQgc2Nyb2xsIG5vZGUgZWxlbWVudFxuICAgKi9cbiAgdGhpcy53cmFwcGVyID0gdHlwZW9mIGVsZW0gPT09ICdzdHJpbmcnID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtKSA6IGVsZW07XG4gIHRoaXMuc2Nyb2xsZXIgPSB0aGlzLndyYXBwZXIuY2hpbGRyZW5bMF07XG4gIHRoaXMuc2Nyb2xsZXJTdHlsZSA9IHRoaXMuc2Nyb2xsZXIuc3R5bGU7XG5cbiAgLyoqXG4gICAqIG1lcmdlIGRlZmF1bHQgb3B0aW9ucyBhbmQgY3VzdG9taXplZCBvcHRpb25zXG4gICAqL1xuICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgZGlzYWJsZVBvaW50ZXI6ICFoYXNQb2ludGVyLFxuICAgIGRpc2FibGVUb3VjaDogaGFzUG9pbnRlciB8fCAhaGFzVG91Y2gsXG4gICAgZGlzYWJsZU1vdXNlOiBoYXNQb2ludGVyIHx8ICFoYXNUb3VjaCxcbiAgICB1c2VUcmFuc2l0aW9uOiB0cnVlLFxuICAgIHVzZVRyYW5zZm9ybTogdHJ1ZSxcbiAgICBzY3JvbGxZOiB0cnVlLFxuICAgIHN0YXJ0WDogMCxcbiAgICBzdGFydFk6IDAsXG4gICAgYmluZFRvV3JhcHBlcjogdHlwZW9mIHdpbmRvdy5vbm1vdXNlZG93biA9PT0gXCJ1bmRlZmluZWRcIixcbiAgICBwcmV2ZW50RGVmYXVsdDogdHJ1ZSxcbiAgICBwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbjogeyB0YWdOYW1lOiAvXihJTlBVVHxURVhUQVJFQXxCVVRUT058U0VMRUNUKSQvIH0sXG4gICAgZGlyZWN0aW9uTG9ja1RocmVzaG9sZDogNSxcbiAgICBib3VuY2U6IHRydWUsXG4gICAgYm91bmNlVGltZTogNjAwLFxuICAgIGJvdW5jZUVhc2luZzogJycsXG4gICAgbW9tZW50dW06IHRydWVcbiAgfTtcblxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnNbaV0gPSBvcHRpb25zW2ldO1xuICB9XG5cbiAgdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PT0gdHJ1ZSA/ICd2ZXJ0aWNhbCcgOiB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaDtcblxuICAvLyBJZiB5b3Ugd2FudCBldmVudFBhc3N0aHJvdWdoIEkgaGF2ZSB0byBsb2NrIG9uZSBvZiB0aGUgYXhlc1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWSA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSAndmVydGljYWwnID8gZmFsc2UgOiB0aGlzLm9wdGlvbnMuc2Nyb2xsWTtcbiAgdGhpcy5vcHRpb25zLnNjcm9sbFggPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ2hvcml6b250YWwnID8gZmFsc2UgOiB0aGlzLm9wdGlvbnMuc2Nyb2xsWDtcblxuICB0aGlzLm9wdGlvbnMuZnJlZVNjcm9sbCA9IHRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsICYmICF0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaDtcbiAgdGhpcy5vcHRpb25zLmRpcmVjdGlvbkxvY2tUaHJlc2hvbGQgPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA/IDAgOiB0aGlzLm9wdGlvbnMuZGlyZWN0aW9uTG9ja1RocmVzaG9sZDtcblxuICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nID0gdHlwZW9mIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcgPT0gJ3N0cmluZycgP1xuICAgIGVhc2luZ3NbdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZ10gfHwgZWFzaW5ncy5jaXJjdWxhciA6XG4gICAgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZztcblxuICB0aGlzLm9wdGlvbnMucmVzaXplUG9sbGluZyA9IHRoaXMub3B0aW9ucy5yZXNpemVQb2xsaW5nID09PSB1bmRlZmluZWQgPyA2MCA6IHRoaXMub3B0aW9ucy5yZXNpemVQb2xsaW5nO1xuXG4gIHRoaXMueCA9IDA7XG4gIHRoaXMueSA9IDA7XG4gIHRoaXMuZGlyZWN0aW9uWCA9IDA7XG4gIHRoaXMuZGlyZWN0aW9uWSA9IDA7XG4gIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIHRoaXMuX2luaXQoKTtcbiAgdGhpcy5yZWZyZXNoKCk7XG4gIHRoaXMuc2Nyb2xsVG8odGhpcy5vcHRpb25zLnN0YXJ0WCwgdGhpcy5vcHRpb25zLnN0YXJ0WSk7XG4gIHRoaXMuZW5hYmxlKCk7XG59XG5cbklzY3JvbGwucHJvdG90eXBlID0ge1xuXG4gIF9pbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faW5pdEV2ZW50cygpO1xuICB9LFxuXG4gIF9pbml0RXZlbnRzOiBmdW5jdGlvbiAocmVtb3ZlKSB7XG4gICAgdmFyIGV2ZW50VHlwZSA9IHJlbW92ZSA/IHJlbW92ZUV2ZW50IDogYWRkRXZlbnQsXG4gICAgICB0YXJnZXQgPSB0aGlzLm9wdGlvbnMuYmluZFRvV3JhcHBlciA/IHRoaXMud3JhcHBlciA6IHdpbmRvdztcblxuICAgIGV2ZW50VHlwZSh3aW5kb3csICdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh3aW5kb3csICdyZXNpemUnLCB0aGlzKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2spIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsICdjbGljaycsIHRoaXMsIHRydWUpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVNb3VzZSkge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ21vdXNlZG93bicsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNlbW92ZScsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNlY2FuY2VsJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAnbW91c2V1cCcsIHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChoYXNQb2ludGVyICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVBvaW50ZXIpIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsIHByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcmRvd24nKSwgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJtb3ZlJyksIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVyY2FuY2VsJyksIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVydXAnKSwgdGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKGhhc1RvdWNoICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVRvdWNoKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCAndG91Y2hzdGFydCcsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ3RvdWNobW92ZScsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ3RvdWNoY2FuY2VsJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAndG91Y2hlbmQnLCB0aGlzKTtcbiAgICB9XG5cbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ3RyYW5zaXRpb25lbmQnLCB0aGlzKTtcbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ3dlYmtpdFRyYW5zaXRpb25FbmQnLCB0aGlzKTtcbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ29UcmFuc2l0aW9uRW5kJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICdNU1RyYW5zaXRpb25FbmQnLCB0aGlzKTtcbiAgfSxcblxuICBoYW5kbGVFdmVudDogZnVuY3Rpb24gKGUpIHtcbiAgICBzd2l0Y2ggKGUudHlwZSkge1xuICAgICAgY2FzZSAndG91Y2hzdGFydCc6XG4gICAgICBjYXNlICdwb2ludGVyZG93bic6XG4gICAgICBjYXNlICdNU1BvaW50ZXJEb3duJzpcbiAgICAgIGNhc2UgJ21vdXNlZG93bic6XG4gICAgICAgIHRoaXMuX3N0YXJ0KGUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndG91Y2htb3ZlJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJtb3ZlJzpcbiAgICAgIGNhc2UgJ01TUG9pbnRlck1vdmUnOlxuICAgICAgY2FzZSAnbW91c2Vtb3ZlJzpcbiAgICAgICAgdGhpcy5fbW92ZShlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3RvdWNoZW5kJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJ1cCc6XG4gICAgICBjYXNlICdNU1BvaW50ZXJVcCc6XG4gICAgICBjYXNlICdtb3VzZXVwJzpcbiAgICAgIGNhc2UgJ3RvdWNoY2FuY2VsJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJjYW5jZWwnOlxuICAgICAgY2FzZSAnTVNQb2ludGVyQ2FuY2VsJzpcbiAgICAgIGNhc2UgJ21vdXNlY2FuY2VsJzpcbiAgICAgICAgdGhpcy5fZW5kKGUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ29yaWVudGF0aW9uY2hhbmdlJzpcbiAgICAgIGNhc2UgJ3Jlc2l6ZSc6XG4gICAgICAgIHRoaXMuX3Jlc2l6ZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3RyYW5zaXRpb25lbmQnOlxuICAgICAgY2FzZSAnd2Via2l0VHJhbnNpdGlvbkVuZCc6XG4gICAgICBjYXNlICdvVHJhbnNpdGlvbkVuZCc6XG4gICAgICBjYXNlICdNU1RyYW5zaXRpb25FbmQnOlxuICAgICAgICB0aGlzLl90cmFuc2l0aW9uRW5kKGUpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH0sXG5cbiAgX3N0YXJ0OiBmdW5jdGlvbiAoZSkge1xuICAgIGNvbnNvbGUubG9nKCdzdGFydCBldmVudCB0eXBlOiAnLCBlLnR5cGUpO1xuICAgIC8vIFJlYWN0IHRvIGxlZnQgbW91c2UgYnV0dG9uIG9ubHlcbiAgICBpZiAoZXZlbnRUeXBlW2UudHlwZV0gIT09IDEpIHsgLy8gbm90IHRvdWNoIGV2ZW50XG4gICAgICB2YXIgYnV0dG9uO1xuICAgICAgaWYgKCFlLndoaWNoKSB7XG4gICAgICAgIC8qIElFIGNhc2UgKi9cbiAgICAgICAgYnV0dG9uID0gKGUuYnV0dG9uIDwgMikgPyAwIDpcbiAgICAgICAgICAoKGUuYnV0dG9uID09IDQpID8gMSA6IDIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLyogQWxsIG90aGVycyAqL1xuICAgICAgICBidXR0b24gPSBlLmJ1dHRvbjtcbiAgICAgIH1cblxuICAgICAgLy8gbm90IGxlZnQgbW91c2UgYnV0dG9uXG4gICAgICBpZiAoYnV0dG9uICE9PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZW5hYmxlZCB8fCAodGhpcy5pbml0aWF0ZWQgJiYgZXZlbnRUeXBlW2UudHlwZV0gIT09IHRoaXMuaW5pdGlhdGVkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHQgJiYgIWlzQmFkQW5kcm9pZCAmJiAhcHJldmVudERlZmF1bHRFeGNlcHRpb24oZS50YXJnZXQsIHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbikpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnQgPSBlLnRvdWNoZXMgPyBlLnRvdWNoZXNbMF0gOiBlLFxuICAgICAgcG9zO1xuXG4gICAgdGhpcy5pbml0aWF0ZWQgPSBldmVudFR5cGVbZS50eXBlXTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5kaXN0WCA9IDA7XG4gICAgdGhpcy5kaXN0WSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25YID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gMDtcblxuICAgIHRoaXMuc3RhcnRUaW1lID0gZ2V0VGltZSgpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRoaXMuaXNJblRyYW5zaXRpb24pIHtcbiAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1lKCk7XG4gICAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gZmFsc2U7XG4gICAgICBwb3MgPSB0aGlzLmdldENvbXB1dGVkUG9zaXRpb24oKTtcbiAgICAgIHRoaXMuX3RyYW5zbGF0ZShNYXRoLnJvdW5kKHBvcy54KSwgTWF0aC5yb3VuZChwb3MueSkpO1xuICAgICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxFbmQnKTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiB0aGlzLmlzQW5pbWF0aW5nKSB7XG4gICAgICB0aGlzLmlzQW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuICAgIH1cblxuICAgIHRoaXMuc3RhcnRYID0gdGhpcy54O1xuICAgIHRoaXMuc3RhcnRZID0gdGhpcy55O1xuICAgIHRoaXMuYWJzU3RhcnRYID0gdGhpcy54O1xuICAgIHRoaXMuYWJzU3RhcnRZID0gdGhpcy55O1xuICAgIHRoaXMucG9pbnRYID0gcG9pbnQucGFnZVg7XG4gICAgdGhpcy5wb2ludFkgPSBwb2ludC5wYWdlWTtcblxuICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnYmVmb3JlU2Nyb2xsU3RhcnQnKTtcbiAgfSxcblxuICBfbW92ZTogZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCB8fCBldmVudFR5cGVbZS50eXBlXSAhPT0gdGhpcy5pbml0aWF0ZWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdkbyBub3QgbW92ZSBzY3JvbGwnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0KSB7XHQvLyBpbmNyZWFzZXMgcGVyZm9ybWFuY2Ugb24gQW5kcm9pZD8gVE9ETzogY2hlY2shXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgdmFyIHBvaW50ID0gZS50b3VjaGVzID8gZS50b3VjaGVzWzBdIDogZSxcbiAgICAgIGRlbHRhWCA9IHBvaW50LnBhZ2VYIC0gdGhpcy5wb2ludFgsIC8vIHRoZSBtb3ZlZCBkaXN0YW5jZVxuICAgICAgZGVsdGFZID0gcG9pbnQucGFnZVkgLSB0aGlzLnBvaW50WSxcbiAgICAgIHRpbWVzdGFtcCA9IGdldFRpbWUoKSxcbiAgICAgIG5ld1gsIG5ld1ksXG4gICAgICBhYnNEaXN0WCwgYWJzRGlzdFk7XG5cbiAgICB0aGlzLnBvaW50WCA9IHBvaW50LnBhZ2VYO1xuICAgIHRoaXMucG9pbnRZID0gcG9pbnQucGFnZVk7XG5cbiAgICB0aGlzLmRpc3RYICs9IGRlbHRhWDtcbiAgICB0aGlzLmRpc3RZICs9IGRlbHRhWTtcbiAgICBhYnNEaXN0WCA9IE1hdGguYWJzKHRoaXMuZGlzdFgpOyAvLyBhYnNvbHV0ZSBtb3ZlZCBkaXN0YW5jZVxuICAgIGFic0Rpc3RZID0gTWF0aC5hYnModGhpcy5kaXN0WSk7XG5cbiAgICAvKipcbiAgICAgKiAgV2UgbmVlZCB0byBtb3ZlIGF0IGxlYXN0IDEwIHBpeGVscyBmb3IgdGhlIHNjcm9sbGluZyB0byBpbml0aWF0ZVxuICAgICAqICB0aGlzLmVuZFRpbWUgaXMgaW5pdGlhdGVkIGluIHRoaXMucHJvdG90eXBlLnJlZnJlc2ggbWV0aG9kXG4gICAgICovXG4gICAgaWYgKHRpbWVzdGFtcCAtIHRoaXMuZW5kVGltZSA+IDMwMCAmJiAoYWJzRGlzdFggPCAxMCAmJiBhYnNEaXN0WSA8IDEwKSkge1xuICAgICAgY29uc29sZS5sb2coJ2xlc3MgdGhhbiAxMCBweCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHlvdSBhcmUgc2Nyb2xsaW5nIGluIG9uZSBkaXJlY3Rpb24gbG9jayB0aGUgb3RoZXJcbiAgICBpZiAoIXRoaXMuZGlyZWN0aW9uTG9ja2VkICYmICF0aGlzLm9wdGlvbnMuZnJlZVNjcm9sbCkge1xuXG4gICAgICBpZiAoYWJzRGlzdFggPiBhYnNEaXN0WSArIHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ2gnO1x0XHQvLyBsb2NrIGhvcml6b250YWxseVxuICAgICAgfSBlbHNlIGlmIChhYnNEaXN0WSA+PSBhYnNEaXN0WCArIHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ3YnO1x0XHQvLyBsb2NrIHZlcnRpY2FsbHlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ24nO1x0XHQvLyBubyBsb2NrXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICBpZiAodGhpcy5kaXJlY3Rpb25Mb2NrZWQgPT0gJ2gnKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ3ZlcnRpY2FsJykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICdob3Jpem9udGFsJykge1xuICAgICAgICB0aGlzLmluaXRpYXRlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGRlbHRhWSA9IDA7XG4gICAgfSBlbHNlIGlmICh0aGlzLmRpcmVjdGlvbkxvY2tlZCA9PSAndicpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAnaG9yaXpvbnRhbCcpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAndmVydGljYWwnKSB7XG4gICAgICAgIHRoaXMuaW5pdGlhdGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZGVsdGFYID0gMDtcbiAgICB9XG5cbiAgICBkZWx0YVggPSB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPyBkZWx0YVggOiAwO1xuICAgIGRlbHRhWSA9IHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPyBkZWx0YVkgOiAwO1xuXG4gICAgbmV3WCA9IHRoaXMueCArIGRlbHRhWDtcbiAgICBuZXdZID0gdGhpcy55ICsgZGVsdGFZO1xuXG4gICAgLy8gU2xvdyBkb3duIGlmIG91dHNpZGUgb2YgdGhlIGJvdW5kYXJpZXNcbiAgICBpZiAobmV3WCA+IDAgfHwgbmV3WCA8IHRoaXMubWF4U2Nyb2xsWCkge1xuICAgICAgbmV3WCA9IHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLnggKyBkZWx0YVggLyAzIDogbmV3WCA+IDAgPyAwIDogdGhpcy5tYXhTY3JvbGxYO1xuICAgIH1cbiAgICBpZiAobmV3WSA+IDAgfHwgbmV3WSA8IHRoaXMubWF4U2Nyb2xsWSkge1xuICAgICAgbmV3WSA9IHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLnkgKyBkZWx0YVkgLyAzIDogbmV3WSA+IDAgPyAwIDogdGhpcy5tYXhTY3JvbGxZO1xuICAgIH1cblxuICAgIHRoaXMuZGlyZWN0aW9uWCA9IGRlbHRhWCA+IDAgPyAtMSA6IGRlbHRhWCA8IDAgPyAxIDogMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSBkZWx0YVkgPiAwID8gLTEgOiBkZWx0YVkgPCAwID8gMSA6IDA7XG5cbiAgICBpZiAoIXRoaXMubW92ZWQpIHtcbiAgICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsU3RhcnQnKTtcbiAgICB9XG5cbiAgICB0aGlzLm1vdmVkID0gdHJ1ZTtcblxuICAgIHRoaXMuX3RyYW5zbGF0ZShuZXdYLCBuZXdZKTtcblxuICAgIGlmICh0aW1lc3RhbXAgLSB0aGlzLnN0YXJ0VGltZSA+IDMwMCkge1xuICAgICAgdGhpcy5zdGFydFRpbWUgPSB0aW1lc3RhbXA7XG4gICAgICB0aGlzLnN0YXJ0WCA9IHRoaXMueDtcbiAgICAgIHRoaXMuc3RhcnRZID0gdGhpcy55O1xuICAgIH1cbiAgfSxcblxuICBfZW5kOiBmdW5jdGlvbiAoZSkge1xuICAgIGlmICghdGhpcy5lbmFibGVkIHx8IGV2ZW50VHlwZVtlLnR5cGVdICE9PSB0aGlzLmluaXRpYXRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHQgJiYgIXByZXZlbnREZWZhdWx0RXhjZXB0aW9uKGUudGFyZ2V0LCB0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHRFeGNlcHRpb24pKSB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgdmFyIHBvaW50ID0gZS5jaGFuZ2VkVG91Y2hlcyA/IGUuY2hhbmdlZFRvdWNoZXNbMF0gOiBlLFxuICAgICAgbW9tZW50dW1YLFxuICAgICAgbW9tZW50dW1ZLFxuICAgICAgZHVyYXRpb24gPSBnZXRUaW1lKCkgLSB0aGlzLnN0YXJ0VGltZSxcbiAgICAgIG5ld1ggPSBNYXRoLnJvdW5kKHRoaXMueCksXG4gICAgICBuZXdZID0gTWF0aC5yb3VuZCh0aGlzLnkpLFxuICAgICAgZGlzdGFuY2VYID0gTWF0aC5hYnMobmV3WCAtIHRoaXMuc3RhcnRYKSxcbiAgICAgIGRpc3RhbmNlWSA9IE1hdGguYWJzKG5ld1kgLSB0aGlzLnN0YXJ0WSksXG4gICAgICB0aW1lID0gMCxcbiAgICAgIGVhc2luZyA9ICcnO1xuXG4gICAgdGhpcy5pc0luVHJhbnNpdGlvbiA9IDA7XG4gICAgdGhpcy5pbml0aWF0ZWQgPSAwO1xuICAgIHRoaXMuZW5kVGltZSA9IGdldFRpbWUoKTtcblxuICAgIC8vIHJlc2V0IGlmIHdlIGFyZSBvdXRzaWRlIG9mIHRoZSBib3VuZGFyaWVzXG4gICAgaWYgKHRoaXMucmVzZXRQb3NpdGlvbih0aGlzLm9wdGlvbnMuYm91bmNlVGltZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbFRvKG5ld1gsIG5ld1kpO1x0Ly8gZW5zdXJlcyB0aGF0IHRoZSBsYXN0IHBvc2l0aW9uIGlzIHJvdW5kZWRcblxuICAgIC8vIHdlIHNjcm9sbGVkIGxlc3MgdGhhbiAxMCBwaXhlbHNcbiAgICBpZiAoIXRoaXMubW92ZWQpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMudGFwKSB7XG4gICAgICAgIC8vIHV0aWxzLnRhcChlLCB0aGlzLm9wdGlvbnMudGFwKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5jbGljaykge1xuICAgICAgICAvLyB1dGlscy5jbGljayhlKTtcbiAgICAgIH1cblxuICAgICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxDYW5jZWwnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLmZsaWNrICYmIGR1cmF0aW9uIDwgMjAwICYmIGRpc3RhbmNlWCA8IDEwMCAmJiBkaXN0YW5jZVkgPCAxMDApIHtcbiAgICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnZmxpY2snKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBzdGFydCBtb21lbnR1bSBhbmltYXRpb24gaWYgbmVlZGVkXG4gICAgaWYgKHRoaXMub3B0aW9ucy5tb21lbnR1bSAmJiBkdXJhdGlvbiA8IDMwMCkge1xuICAgICAgbW9tZW50dW1YID0gdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsID8gbW9tZW50dW0odGhpcy54LCB0aGlzLnN0YXJ0WCwgZHVyYXRpb24sIHRoaXMubWF4U2Nyb2xsWCwgdGhpcy5vcHRpb25zLmJvdW5jZSA/IHRoaXMud3JhcHBlcldpZHRoIDogMCwgdGhpcy5vcHRpb25zLmRlY2VsZXJhdGlvbikgOiB7IGRlc3RpbmF0aW9uOiBuZXdYLCBkdXJhdGlvbjogMCB9O1xuICAgICAgbW9tZW50dW1ZID0gdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCA/IG1vbWVudHVtKHRoaXMueSwgdGhpcy5zdGFydFksIGR1cmF0aW9uLCB0aGlzLm1heFNjcm9sbFksIHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLndyYXBwZXJIZWlnaHQgOiAwLCB0aGlzLm9wdGlvbnMuZGVjZWxlcmF0aW9uKSA6IHsgZGVzdGluYXRpb246IG5ld1ksIGR1cmF0aW9uOiAwIH07XG4gICAgICBuZXdYID0gbW9tZW50dW1YLmRlc3RpbmF0aW9uO1xuICAgICAgbmV3WSA9IG1vbWVudHVtWS5kZXN0aW5hdGlvbjtcbiAgICAgIHRpbWUgPSBNYXRoLm1heChtb21lbnR1bVguZHVyYXRpb24sIG1vbWVudHVtWS5kdXJhdGlvbik7XG4gICAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gMTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnNuYXApIHtcbiAgICAgIC8vIGRvIHNvbWV0aW5nXG4gICAgfVxuXG4gICAgaWYgKG5ld1ggIT0gdGhpcy54IHx8IG5ld1kgIT0gdGhpcy55KSB7XG4gICAgICAvLyBjaGFuZ2UgZWFzaW5nIGZ1bmN0aW9uIHdoZW4gc2Nyb2xsZXIgZ29lcyBvdXQgb2YgdGhlIGJvdW5kYXJpZXNcbiAgICAgIGlmIChuZXdYID4gMCB8fCBuZXdYIDwgdGhpcy5tYXhTY3JvbGxYIHx8IG5ld1kgPiAwIHx8IG5ld1kgPCB0aGlzLm1heFNjcm9sbFkpIHtcbiAgICAgICAgZWFzaW5nID0gZWFzaW5ncy5xdWFkcmF0aWM7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZygnZW5kIGVuZCBlbmQgZW5kIScpO1xuICAgICAgdGhpcy5zY3JvbGxUbyhuZXdYLCBuZXdZLCB0aW1lLCBlYXNpbmcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsRW5kJyk7XG5cbiAgfSxcblxuICBfdHJhbnNpdGlvbkVuZDogZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS50YXJnZXQgIT0gdGhpcy5zY3JvbGxlciB8fCAhdGhpcy5pc0luVHJhbnNpdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3RyYW5zaXRpb25UaW1lKCk7XG4gICAgaWYgKCF0aGlzLnJlc2V0UG9zaXRpb24odGhpcy5vcHRpb25zLmJvdW5jZVRpbWUpKSB7XG4gICAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gZmFsc2U7XG4gICAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuICAgIH1cbiAgfSxcblxuICBfcmVzaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMucmVzaXplVGltZW91dCk7XG5cbiAgICB0aGlzLnJlc2l6ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdyZXNpemUgbm93Jyk7XG4gICAgICB0aGF0LnJlZnJlc2goKTtcbiAgICB9LCB0aGlzLm9wdGlvbnMucmVzaXplUG9sbGluZyk7XG4gIH0sXG5cbiAgZ2V0Q29tcHV0ZWRQb3NpdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBtYXRyaXggPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLnNjcm9sbGVyLCBudWxsKSxcbiAgICAgIHgsIHk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zZm9ybSkge1xuICAgICAgbWF0cml4ID0gbWF0cml4W3N0eWxlVXRpbHMudHJhbnNmb3JtXS5zcGxpdCgnKScpWzBdLnNwbGl0KCcsICcpO1xuICAgICAgeCA9ICsobWF0cml4WzEyXSB8fCBtYXRyaXhbNF0pO1xuICAgICAgeSA9ICsobWF0cml4WzEzXSB8fCBtYXRyaXhbNV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBlZy4gdHJhbnNmb3JtICcwcHgnIHRvIDBcbiAgICAgIHggPSArbWF0cml4LmxlZnQucmVwbGFjZSgvW14tXFxkLl0vZywgJycpO1xuICAgICAgeSA9ICttYXRyaXgudG9wLnJlcGxhY2UoL1teLVxcZC5dL2csICcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyB4OiB4LCB5OiB5IH07XG4gIH0sXG5cbiAgc2Nyb2xsVG86IGZ1bmN0aW9uICh4LCB5LCB0aW1lLCBlYXNpbmcpIHtcbiAgICBlYXNpbmcgPSBlYXNpbmcgfHwgZWFzaW5ncy5jaXJjdWxhcjtcbiAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgdGltZSA+IDA7XG4gICAgdmFyIHRyYW5zaXRpb25UeXBlID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgZWFzaW5nLnN0eWxlO1xuXG4gICAgaWYgKCF0aW1lIHx8IHRyYW5zaXRpb25UeXBlKSB7XG4gICAgICBpZiAodHJhbnNpdGlvblR5cGUpIHtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uKGVhc2luZy5zdHlsZSk7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1lKHRpbWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5fdHJhbnNsYXRlKHgsIHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hbmltYXRlKHgsIHksIHRpbWUsIGVhc2luZy5mbik7XG4gICAgfVxuICB9LFxuXG4gIHNjcm9sbFRvRWxlbWVudDogZnVuY3Rpb24gKGVsLCB0aW1lLCBvZmZzZXRYLCBvZmZzZXRZLCBlYXNpbmcpIHtcbiAgICBlbCA9IGVsLm5vZGVUeXBlID8gZWwgOiB0aGlzLnNjcm9sbGVyLnF1ZXJ5U2VsZWN0b3IoZWwpO1xuXG4gICAgLy8gaWYgbm8gZWxlbWVudCBzZWxlY3RlZCwgdGhlbiByZXR1cm5cbiAgICBpZiAoIWVsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHBvcyA9IG9mZnNldFV0aWxzKGVsKTtcbiAgfSxcblxuICBfdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uOiBmdW5jdGlvbiAoZWFzaW5nU3R5bGUpIHtcbiAgICAvLyBhc3NpZ24gZWFzaW5nIGNzcyBzdHlsZSB0byBzY3JvbGwgY29udGFpbmVyIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiBwcm9wZXJ0eVxuICAgIC8vIGV4YW1wbGU6IGN1YmljLWJlemllcigwLjI1LCAwLjQ2LCAwLjQ1LCAwLjk0KVxuICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtzdHlsZVV0aWxzLnRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbl0gPSBlYXNpbmdTdHlsZTtcbiAgfSxcblxuICBfdHJhbnNpdGlvblRpbWU6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgLy8gaWYgZG8gbm90IHVzZSB0cmFuc2l0aW9uIHRvIHNjcm9sbCwgcmV0dXJuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRpbWUgPSB0aW1lIHx8IDA7XG4gICAgLy8gdHJhbnNpdGlvbkR1cmF0aW9uIHdoaWNoIGhhcyB2ZW5kb3IgcHJlZml4XG4gICAgdmFyIGR1cmF0aW9uUHJvcCA9IHN0eWxlVXRpbHMudHJhbnNpdGlvbkR1cmF0aW9uO1xuICAgIGlmICghZHVyYXRpb25Qcm9wKSB7IC8vIGlmIG5vIHZlbmRvciBmb3VuZCwgZHVyYXRpb25Qcm9wIHdpbGwgYmUgZmFsc2VcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9IHRpbWUgKyAnbXMnOyAvLyBhc3NpZ24gbXMgdG8gdHJhbnNpdGlvbkR1cmF0aW9uIHByb3BcblxuICAgIGlmICghdGltZSAmJiBpc0JhZEFuZHJvaWQpIHtcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gJzAuMDAwMW1zJztcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgckFGKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHNlbGYuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID09PSAnMC4wMDAxbXMnKSB7XG4gICAgICAgICAgc2VsZi5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSAnMHMnO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX3RyYW5zbGF0ZTogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICBjb25zb2xlLmxvZygndHJhbnNsYXRlIG5vdyEhOiAnLCB4LCAnICcsIHkpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMudXNlVHJhbnNmb3JtKSB7XG5cbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtzdHlsZVV0aWxzLnRyYW5zZm9ybV0gPVxuICAgICAgICAndHJhbnNsYXRlKCcgKyB4ICsgJ3B4LCcgKyB5ICsgJ3B4KScgKyAndHJhbnNsYXRlWigwKSc7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgeCA9IE1hdGgucm91bmQoeCk7XG4gICAgICB5ID0gTWF0aC5yb3VuZCh5KTtcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZS5sZWZ0ID0geCArICdweCc7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGUudG9wID0geSArICdweCc7XG4gICAgfVxuXG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICB9LFxuXG4gIF9hbmltYXRlOiBmdW5jdGlvbiAoZGVzdFgsIGRlc3RZLCBkdXJhdGlvbiwgZWFzaW5nRm4pIHtcbiAgICB2YXIgdGhhdCA9IHRoaXMsXG4gICAgICBzdGFydFggPSB0aGlzLngsXG4gICAgICBzdGFydFkgPSB0aGlzLnksXG4gICAgICBzdGFydFRpbWUgPSBnZXRUaW1lKCksXG4gICAgICBkZXN0VGltZSA9IHN0YXJ0VGltZSArIGR1cmF0aW9uO1xuXG4gICAgZnVuY3Rpb24gc3RlcCgpIHtcbiAgICAgIHZhciBub3cgPSBnZXRUaW1lKCksXG4gICAgICAgIG5ld1gsIG5ld1ksXG4gICAgICAgIGVhc2luZztcblxuICAgICAgaWYgKG5vdyA+PSBkZXN0VGltZSkge1xuICAgICAgICB0aGF0LmlzQW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoYXQuX3RyYW5zbGF0ZShkZXN0WCwgZGVzdFkpO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbm93ID0gKG5vdyAtIHN0YXJ0VGltZSkgLyBkdXJhdGlvbjtcbiAgICAgIGVhc2luZyA9IGVhc2luZ0ZuKG5vdyk7XG4gICAgICBuZXdYID0gKGRlc3RYIC0gc3RhcnRYKSAqIGVhc2luZyArIHN0YXJ0WDtcbiAgICAgIG5ld1kgPSAoZGVzdFkgLSBzdGFydFkpICogZWFzaW5nICsgc3RhcnRZO1xuICAgICAgdGhhdC5fdHJhbnNsYXRlKG5ld1gsIG5ld1kpO1xuXG4gICAgICBpZiAodGhhdC5pc0FuaW1hdGluZykge1xuICAgICAgICByQUYoc3RlcCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5pc0FuaW1hdGluZyA9IHRydWU7XG4gICAgc3RlcCgpO1xuICB9LFxuXG4gIHJlZnJlc2g6IGZ1bmN0aW9uICgpIHtcbiAgICBnZXRSZWN0KHRoaXMud3JhcHBlcik7IC8vIEZvcmNlIHJlZmxvd1xuXG4gICAgdGhpcy53cmFwcGVyV2lkdGggPSB0aGlzLndyYXBwZXIuY2xpZW50V2lkdGg7XG4gICAgdGhpcy53cmFwcGVySGVpZ2h0ID0gdGhpcy53cmFwcGVyLmNsaWVudEhlaWdodDtcblxuICAgIHZhciByZWN0ID0gZ2V0UmVjdCh0aGlzLnNjcm9sbGVyKTtcblxuICAgIHRoaXMuc2Nyb2xsZXJXaWR0aCA9IHJlY3Qud2lkdGg7XG4gICAgdGhpcy5zY3JvbGxlckhlaWdodCA9IHJlY3QuaGVpZ2h0O1xuXG4gICAgLyoqXG4gICAgICogdGhpcy5tYXhTY3JvbGxYIG9yIHRoaXMubWF4U2Nyb2xsWSBzbWFsbGVyIHRoYW4gMCwgbWVhbmluZ1xuICAgICAqIG92ZXJmbG93IGhhcHBlbmVkLlxuICAgICAqL1xuICAgIHRoaXMubWF4U2Nyb2xsWCA9IHRoaXMud3JhcHBlcldpZHRoIC0gdGhpcy5zY3JvbGxlcldpZHRoO1xuICAgIHRoaXMubWF4U2Nyb2xsWSA9IHRoaXMud3JhcHBlckhlaWdodCAtIHRoaXMuc2Nyb2xsZXJIZWlnaHQ7XG5cbiAgICAvKipcbiAgICAgKiBvcHRpb24gZW5hYmxlcyBzY3JvbGwgQU5EIG92ZXJmbG93IGV4aXN0c1xuICAgICAqL1xuICAgIHRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCA9IHRoaXMub3B0aW9ucy5zY3JvbGxYICYmIHRoaXMubWF4U2Nyb2xsWCA8IDA7XG4gICAgdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCA9IHRoaXMub3B0aW9ucy5zY3JvbGxZICYmIHRoaXMubWF4U2Nyb2xsWSA8IDA7XG5cbiAgICBpZiAoIXRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCkge1xuICAgICAgdGhpcy5tYXhTY3JvbGxYID0gMDtcbiAgICAgIHRoaXMuc2Nyb2xsZXJXaWR0aCA9IHRoaXMud3JhcHBlcldpZHRoO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCkge1xuICAgICAgdGhpcy5tYXhTY3JvbGxZID0gMDtcbiAgICAgIHRoaXMuc2Nyb2xsZXJIZWlnaHQgPSB0aGlzLndyYXBwZXJIZWlnaHQ7XG4gICAgfVxuXG4gICAgdGhpcy5lbmRUaW1lID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblggPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWSA9IDA7XG5cbiAgICBpZiAoaGFzUG9pbnRlciAmJiAhdGhpcy5vcHRpb25zLmRpc2FibGVQb2ludGVyKSB7XG4gICAgICB0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0gPVxuICAgICAgICBnZXRUb3VjaEFjdGlvbih0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCwgdHJ1ZSk7XG5cbiAgICAgIGlmICghdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dKSB7XG4gICAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSA9XG4gICAgICAgICAgZ2V0VG91Y2hBY3Rpb24odGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2gsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLndyYXBwZXJPZmZzZXQgPSBvZmZzZXRVdGlscyh0aGlzLndyYXBwZXIpO1xuXG4gICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdyZWZyZXNoJyk7XG5cbiAgICB0aGlzLnJlc2V0UG9zaXRpb24oKTtcbiAgfSxcblxuICByZXNldFBvc2l0aW9uOiBmdW5jdGlvbiAodGltZSkge1xuICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgeSA9IHRoaXMueTtcblxuICAgIHRpbWUgPSB0aW1lIHx8IDA7XG5cbiAgICBpZiAoIXRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCB8fCB0aGlzLnggPiAwKSB7XG4gICAgICB4ID0gMDtcbiAgICB9IGVsc2UgaWYgKHRoaXMueCA8IHRoaXMubWF4U2Nyb2xsWCkge1xuICAgICAgeCA9IHRoaXMubWF4U2Nyb2xsWDtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaGFzVmVydGljYWxTY3JvbGwgfHwgdGhpcy55ID4gMCkge1xuICAgICAgeSA9IDA7XG4gICAgfSBlbHNlIGlmICh0aGlzLnkgPCB0aGlzLm1heFNjcm9sbFkpIHtcbiAgICAgIHkgPSB0aGlzLm1heFNjcm9sbFk7XG4gICAgfVxuXG4gICAgaWYgKHggPT09IHRoaXMueCAmJiB5ID09PSB0aGlzLnkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbFRvKHgsIHksIHRpbWUsIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcpO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgZGlzYWJsZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xuICB9LFxuXG4gIGVuYWJsZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZW5hYmxlZCA9IHRydWU7XG4gIH1cblxuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBJc2Nyb2xsOyJdLCJuYW1lcyI6WyJlYXNpbmdzIiwiayIsIk1hdGgiLCJzcXJ0IiwiYiIsImYiLCJlIiwicG93Iiwic2luIiwiUEkiLCJfZWxlbWVudFN0eWxlIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwic3R5bGUiLCJfdmVuZG9yIiwidmVuZG9ycyIsInRyYW5zZm9ybSIsImkiLCJsIiwibGVuZ3RoIiwic3Vic3RyIiwiX3ByZWZpeFN0eWxlIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJpc0JhZEFuZHJvaWQiLCJhcHBWZXJzaW9uIiwid2luZG93IiwibmF2aWdhdG9yIiwidGVzdCIsInNhZmFyaVZlcnNpb24iLCJtYXRjaCIsInBhcnNlRmxvYXQiLCJnZXRUaW1lIiwiRGF0ZSIsIm5vdyIsIm9mZnNldCIsImVsIiwibGVmdCIsIm9mZnNldExlZnQiLCJ0b3AiLCJvZmZzZXRUb3AiLCJvZmZzZXRQYXJlbnQiLCJnZXRSZWN0IiwiU1ZHRWxlbWVudCIsInJlY3QiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJ3aWR0aCIsImhlaWdodCIsIm9mZnNldFdpZHRoIiwib2Zmc2V0SGVpZ2h0IiwiaGFzUG9pbnRlciIsIlBvaW50ZXJFdmVudCIsIk1TUG9pbnRlckV2ZW50IiwiaGFzVG91Y2giLCJnZXRUb3VjaEFjdGlvbiIsImV2ZW50UGFzc3Rocm91Z2giLCJhZGRQaW5jaCIsInRvdWNoQWN0aW9uIiwiYWRkRXZlbnQiLCJ0eXBlIiwiZm4iLCJjYXB0dXJlIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50IiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsInByZWZpeFBvaW50ZXJFdmVudCIsInBvaW50ZXJFdmVudCIsImV2ZW50VHlwZSIsInByZXZlbnREZWZhdWx0RXhjZXB0aW9uIiwiZXhjZXB0aW9ucyIsIm1vbWVudHVtIiwiY3VycmVudCIsInN0YXJ0IiwidGltZSIsImxvd2VyTWFyZ2luIiwid3JhcHBlclNpemUiLCJkZWNlbGVyYXRpb24iLCJkaXN0YW5jZSIsInNwZWVkIiwiYWJzIiwiZGVzdGluYXRpb24iLCJkdXJhdGlvbiIsInVuZGVmaW5lZCIsInJvdW5kIiwickFGIiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwid2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwibW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwib1JlcXVlc3RBbmltYXRpb25GcmFtZSIsIm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiY2FsbGJhY2siLCJzZXRUaW1lb3V0IiwiSXNjcm9sbCIsImVsZW0iLCJvcHRpb25zIiwid3JhcHBlciIsInF1ZXJ5U2VsZWN0b3IiLCJzY3JvbGxlciIsImNoaWxkcmVuIiwic2Nyb2xsZXJTdHlsZSIsIm9ubW91c2Vkb3duIiwidGFnTmFtZSIsInNjcm9sbFkiLCJzY3JvbGxYIiwiZnJlZVNjcm9sbCIsImRpcmVjdGlvbkxvY2tUaHJlc2hvbGQiLCJib3VuY2VFYXNpbmciLCJjaXJjdWxhciIsInJlc2l6ZVBvbGxpbmciLCJ4IiwieSIsImRpcmVjdGlvblgiLCJkaXJlY3Rpb25ZIiwiX2V2ZW50cyIsIl9pbml0IiwicmVmcmVzaCIsInNjcm9sbFRvIiwic3RhcnRYIiwic3RhcnRZIiwiZW5hYmxlIiwicHJvdG90eXBlIiwiX2luaXRFdmVudHMiLCJyZW1vdmUiLCJ0YXJnZXQiLCJiaW5kVG9XcmFwcGVyIiwiY2xpY2siLCJkaXNhYmxlTW91c2UiLCJkaXNhYmxlUG9pbnRlciIsImRpc2FibGVUb3VjaCIsIl9zdGFydCIsIl9tb3ZlIiwiX2VuZCIsIl9yZXNpemUiLCJfdHJhbnNpdGlvbkVuZCIsImxvZyIsImJ1dHRvbiIsIndoaWNoIiwiZW5hYmxlZCIsImluaXRpYXRlZCIsInByZXZlbnREZWZhdWx0IiwicG9pbnQiLCJ0b3VjaGVzIiwicG9zIiwibW92ZWQiLCJkaXN0WCIsImRpc3RZIiwiZGlyZWN0aW9uTG9ja2VkIiwic3RhcnRUaW1lIiwidXNlVHJhbnNpdGlvbiIsImlzSW5UcmFuc2l0aW9uIiwiX3RyYW5zaXRpb25UaW1lIiwiZ2V0Q29tcHV0ZWRQb3NpdGlvbiIsIl90cmFuc2xhdGUiLCJpc0FuaW1hdGluZyIsImFic1N0YXJ0WCIsImFic1N0YXJ0WSIsInBvaW50WCIsInBhZ2VYIiwicG9pbnRZIiwicGFnZVkiLCJkZWx0YVgiLCJ0aW1lc3RhbXAiLCJuZXdYIiwibmV3WSIsImFic0Rpc3RYIiwiYWJzRGlzdFkiLCJkZWx0YVkiLCJlbmRUaW1lIiwiaGFzSG9yaXpvbnRhbFNjcm9sbCIsImhhc1ZlcnRpY2FsU2Nyb2xsIiwibWF4U2Nyb2xsWCIsImJvdW5jZSIsIm1heFNjcm9sbFkiLCJjaGFuZ2VkVG91Y2hlcyIsIm1vbWVudHVtWCIsIm1vbWVudHVtWSIsImRpc3RhbmNlWCIsImRpc3RhbmNlWSIsImVhc2luZyIsInJlc2V0UG9zaXRpb24iLCJib3VuY2VUaW1lIiwidGFwIiwiZmxpY2siLCJ3cmFwcGVyV2lkdGgiLCJ3cmFwcGVySGVpZ2h0IiwibWF4Iiwic25hcCIsInF1YWRyYXRpYyIsInRoYXQiLCJyZXNpemVUaW1lb3V0IiwibWF0cml4IiwiZ2V0Q29tcHV0ZWRTdHlsZSIsInVzZVRyYW5zZm9ybSIsInN0eWxlVXRpbHMiLCJzcGxpdCIsInJlcGxhY2UiLCJ0cmFuc2l0aW9uVHlwZSIsIl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJfYW5pbWF0ZSIsIm9mZnNldFgiLCJvZmZzZXRZIiwibm9kZVR5cGUiLCJvZmZzZXRVdGlscyIsImVhc2luZ1N0eWxlIiwidHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIiwiZHVyYXRpb25Qcm9wIiwidHJhbnNpdGlvbkR1cmF0aW9uIiwic2VsZiIsImRlc3RYIiwiZGVzdFkiLCJlYXNpbmdGbiIsImRlc3RUaW1lIiwic3RlcCIsImNsaWVudFdpZHRoIiwiY2xpZW50SGVpZ2h0Iiwic2Nyb2xsZXJXaWR0aCIsInNjcm9sbGVySGVpZ2h0Iiwid3JhcHBlck9mZnNldCJdLCJtYXBwaW5ncyI6IkFBQUEsSUFBSUEsVUFBVTthQUNEO1dBQ0Ysc0NBREU7UUFFTCxVQUFVQyxDQUFWLEVBQWE7YUFDUkEsS0FBSyxJQUFJQSxDQUFULENBQVA7O0dBSlE7WUFPRjtXQUNELGlDQURDO1FBRUosVUFBVUEsQ0FBVixFQUFhO2FBQ1JDLEtBQUtDLElBQUwsQ0FBVSxJQUFLLEVBQUVGLENBQUYsR0FBTUEsQ0FBckIsQ0FBUDs7R0FWUTtRQWFOO1dBQ0cseUNBREg7UUFFQSxVQUFVQSxDQUFWLEVBQWE7VUFDWEcsSUFBSSxDQUFSO2FBQ08sQ0FBQ0gsSUFBSUEsSUFBSSxDQUFULElBQWNBLENBQWQsSUFBbUIsQ0FBQ0csSUFBSSxDQUFMLElBQVVILENBQVYsR0FBY0csQ0FBakMsSUFBc0MsQ0FBN0M7O0dBakJRO1VBb0JKO1dBQ0MsRUFERDtRQUVGLFVBQVVILENBQVYsRUFBYTtVQUNYLENBQUNBLEtBQUssQ0FBTixJQUFZLElBQUksSUFBcEIsRUFBMkI7ZUFDbEIsU0FBU0EsQ0FBVCxHQUFhQSxDQUFwQjtPQURGLE1BRU8sSUFBSUEsSUFBSyxJQUFJLElBQWIsRUFBb0I7ZUFDbEIsVUFBVUEsS0FBTSxNQUFNLElBQXRCLElBQStCQSxDQUEvQixHQUFtQyxJQUExQztPQURLLE1BRUEsSUFBSUEsSUFBSyxNQUFNLElBQWYsRUFBc0I7ZUFDcEIsVUFBVUEsS0FBTSxPQUFPLElBQXZCLElBQWdDQSxDQUFoQyxHQUFvQyxNQUEzQztPQURLLE1BRUE7ZUFDRSxVQUFVQSxLQUFNLFFBQVEsSUFBeEIsSUFBaUNBLENBQWpDLEdBQXFDLFFBQTVDOzs7R0E5Qk07V0FrQ0g7V0FDQSxFQURBO1FBRUgsVUFBVUEs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

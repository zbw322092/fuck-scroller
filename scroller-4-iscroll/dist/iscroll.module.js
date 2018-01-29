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

export default Iscroll;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5tb2R1bGUuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9lYXNpbmdzLmpzIiwiLi4vc3JjL3V0aWxzL3N0eWxlLmpzIiwiLi4vc3JjL3V0aWxzL2lzQmFkQW5kcm9pZC5qcyIsIi4uL3NyYy91dGlscy9nZXRUaW1lLmpzIiwiLi4vc3JjL3V0aWxzL29mZnNldC5qcyIsIi4uL3NyYy91dGlscy9nZXRSZWN0LmpzIiwiLi4vc3JjL3V0aWxzL2RldGVjdG9yLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRvdWNoQWN0aW9uLmpzIiwiLi4vc3JjL3V0aWxzL2V2ZW50SGFuZGxlci5qcyIsIi4uL3NyYy91dGlscy9wcmVmaXhQb2ludGVyRXZlbnQuanMiLCIuLi9zcmMvdXRpbHMvZXZlbnRUeXBlLmpzIiwiLi4vc3JjL3V0aWxzL3ByZXZlbnREZWZhdWx0RXhjZXB0aW9uLmpzIiwiLi4vc3JjL3V0aWxzL21vbWVudHVtLmpzIiwiLi4vc3JjL215LWlzY3JvbGwuanMiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIGVhc2luZ3MgPSB7XG4gIHF1YWRyYXRpYzoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBrICogKDIgLSBrKTtcbiAgICB9XG4gIH0sXG4gIGNpcmN1bGFyOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xLCAwLjU3LCAwLjEsIDEpJyxcdC8vIE5vdCBwcm9wZXJseSBcImNpcmN1bGFyXCIgYnV0IHRoaXMgbG9va3MgYmV0dGVyLCBpdCBzaG91bGQgYmUgKDAuMDc1LCAwLjgyLCAwLjE2NSwgMSlcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoMSAtICgtLWsgKiBrKSk7XG4gICAgfVxuICB9LFxuICBiYWNrOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xNzUsIDAuODg1LCAwLjMyLCAxLjI3NSknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGIgPSA0O1xuICAgICAgcmV0dXJuIChrID0gayAtIDEpICogayAqICgoYiArIDEpICogayArIGIpICsgMTtcbiAgICB9XG4gIH0sXG4gIGJvdW5jZToge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIGlmICgoayAvPSAxKSA8ICgxIC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIGsgKiBrO1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDEuNSAvIDIuNzUpKSAqIGsgKyAwLjc1O1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIuNSAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi4yNSAvIDIuNzUpKSAqIGsgKyAwLjkzNzU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuNjI1IC8gMi43NSkpICogayArIDAuOTg0Mzc1O1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZWxhc3RpYzoge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciBmID0gMC4yMixcbiAgICAgICAgZSA9IDAuNDtcblxuICAgICAgaWYgKGsgPT09IDApIHsgcmV0dXJuIDA7IH1cbiAgICAgIGlmIChrID09IDEpIHsgcmV0dXJuIDE7IH1cblxuICAgICAgcmV0dXJuIChlICogTWF0aC5wb3coMiwgLSAxMCAqIGspICogTWF0aC5zaW4oKGsgLSBmIC8gNCkgKiAoMiAqIE1hdGguUEkpIC8gZikgKyAxKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGVhc2luZ3M7IiwidmFyIF9lbGVtZW50U3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKS5zdHlsZTtcblxudmFyIF92ZW5kb3IgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgdmVuZG9ycyA9IFsndCcsICd3ZWJraXRUJywgJ01velQnLCAnbXNUJywgJ09UJ10sXG4gICAgdHJhbnNmb3JtLFxuICAgIGkgPSAwLFxuICAgIGwgPSB2ZW5kb3JzLmxlbmd0aDtcblxuICB3aGlsZSAoaSA8IGwpIHtcbiAgICB0cmFuc2Zvcm0gPSB2ZW5kb3JzW2ldICsgJ3JhbnNmb3JtJztcbiAgICBpZiAodHJhbnNmb3JtIGluIF9lbGVtZW50U3R5bGUpIHtcbiAgICAgIHJldHVybiB2ZW5kb3JzW2ldLnN1YnN0cigwLCB2ZW5kb3JzW2ldLmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICBpKys7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59KSgpO1xuXG5mdW5jdGlvbiBfcHJlZml4U3R5bGUgKHN0eWxlKSB7XG4gIGlmICggX3ZlbmRvciA9PT0gZmFsc2UgKSByZXR1cm4gZmFsc2U7IC8vIG5vIHZlbmRvciBmb3VuZFxuICBpZiAoIF92ZW5kb3IgPT09ICcnICkgcmV0dXJuIHN0eWxlOyAvLyBubyBwcmVmaXggbmVlZGVkXG4gIHJldHVybiBfdmVuZG9yICsgc3R5bGUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHlsZS5zdWJzdHIoMSk7IC8vIG90aGVyd2lzZSBhZGQgcHJlZml4XG59XG5cbi8vIHN0eWxlIHRoYXQgaGFzIHZlbmRvciBwcmVmaXgsIGVnOiB3ZWJraXRUcmFuc2Zvcm1cbnZhciBzdHlsZSA9IHtcbiAgdHJhbnNmb3JtOiBfcHJlZml4U3R5bGUoJ3RyYW5zZm9ybScpLFxuICB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uJyksXG4gIHRyYW5zaXRpb25EdXJhdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uRHVyYXRpb24nKSxcbiAgdHJhbnNpdGlvbkRlbGF5OiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EZWxheScpLFxuICB0cmFuc2Zvcm1PcmlnaW46IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtT3JpZ2luJyksXG4gIHRvdWNoQWN0aW9uOiBfcHJlZml4U3R5bGUoJ3RvdWNoQWN0aW9uJylcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHN0eWxlOyIsInZhciBpc0JhZEFuZHJvaWQgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgYXBwVmVyc2lvbiA9IHdpbmRvdy5uYXZpZ2F0b3IuYXBwVmVyc2lvbjtcblxuICBpZiAoL0FuZHJvaWQvLnRlc3QoYXBwVmVyc2lvbikgJiYgISgvQ2hyb21lXFwvXFxkLy50ZXN0KGFwcFZlcnNpb24pKSkge1xuICAgIHZhciBzYWZhcmlWZXJzaW9uID0gYXBwVmVyc2lvbi5tYXRjaCgvU2FmYXJpXFwvKFxcZCsuXFxkKS8pO1xuICAgIGlmKHNhZmFyaVZlcnNpb24gJiYgdHlwZW9mIHNhZmFyaVZlcnNpb24gPT09IFwib2JqZWN0XCIgJiYgc2FmYXJpVmVyc2lvbi5sZW5ndGggPj0gMikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoc2FmYXJpVmVyc2lvblsxXSkgPCA1MzUuMTk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzQmFkQW5kcm9pZDsiLCIvKipcbiAqIDEuIERhdGUucHJvdG90eXBlLmdldFRpbWUgaGFzIEJFVFRFUiBjb21wYXRpYmlsaXR5IHRoYW4gRGF0ZS5ub3dcbiAqIHJlZmVyZW5jZTogXG4gKiAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9nZXRUaW1lI0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0RhdGUvbm93I0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogXG4gKiAyLiBEYXRlLnByb3RvdHlwZS5nZXRUaW1lIHNwZWVkIGlzIFNMT1dTRVIgdGhhbiBEYXRlLm5vd1xuICogcmVmZXJlbmNlOlxuICogIGh0dHBzOi8vanNwZXJmLmNvbS9kYXRlLW5vdy12cy1kYXRlLWdldHRpbWUvN1xuICovXG5cbnZhciBnZXRUaW1lID0gRGF0ZS5ub3cgfHxcbiAgZnVuY3Rpb24gZ2V0VGltZSgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbmV4cG9ydCBkZWZhdWx0IGdldFRpbWU7IiwidmFyIG9mZnNldCA9IGZ1bmN0aW9uIChlbCkge1xuICB2YXIgbGVmdCA9IC1lbC5vZmZzZXRMZWZ0LFxuICB0b3AgPSAtZWwub2Zmc2V0VG9wO1xuXG4gIC8qKlxuICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvSFRNTEVsZW1lbnQvb2Zmc2V0UGFyZW50XG4gICAqIFJldHVybnMgbnVsbCB3aGVuIHRoZSBlbGVtZW50IGhhcyBzdHlsZS5kaXNwbGF5IHNldCB0byBcIm5vbmVcIi4gVGhlIG9mZnNldFBhcmVudCBcbiAgICogaXMgdXNlZnVsIGJlY2F1c2Ugb2Zmc2V0VG9wIGFuZCBvZmZzZXRMZWZ0IGFyZSByZWxhdGl2ZSB0byBpdHMgcGFkZGluZyBlZGdlLlxuICAgKi9cbiAgd2hpbGUgKGVsID0gZWwub2Zmc2V0UGFyZW50KSB7XG4gICAgbGVmdCAtPSBlbC5vZmZzZXRMZWZ0O1xuICAgIHRvcCAtPSBlbC5vZmZzZXRUb3A7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGxlZnQ6IGxlZnQsXG4gICAgdG9wOiB0b3BcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgb2Zmc2V0OyIsImZ1bmN0aW9uIGdldFJlY3QoZWwpIHtcbiAgaWYgKGVsIGluc3RhbmNlb2YgU1ZHRWxlbWVudCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wIDogcmVjdC50b3AsXG4gICAgICBsZWZ0IDogcmVjdC5sZWZ0LFxuICAgICAgd2lkdGggOiByZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0IDogcmVjdC5oZWlnaHRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcCA6IGVsLm9mZnNldFRvcCxcbiAgICAgIGxlZnQgOiBlbC5vZmZzZXRMZWZ0LFxuICAgICAgd2lkdGggOiBlbC5vZmZzZXRXaWR0aCxcbiAgICAgIGhlaWdodCA6IGVsLm9mZnNldEhlaWdodFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZ2V0UmVjdDsiLCJ2YXIgaGFzUG9pbnRlciA9ICEhKHdpbmRvdy5Qb2ludGVyRXZlbnQgfHwgd2luZG93Lk1TUG9pbnRlckV2ZW50KTsgLy8gSUUxMCBpcyBwcmVmaXhlZFxudmFyIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93O1xuXG5leHBvcnQge1xuICBoYXNQb2ludGVyLFxuICBoYXNUb3VjaFxufSIsInZhciBnZXRUb3VjaEFjdGlvbiA9IGZ1bmN0aW9uIChldmVudFBhc3N0aHJvdWdoLCBhZGRQaW5jaCkge1xuICB2YXIgdG91Y2hBY3Rpb24gPSAnbm9uZSc7XG4gIGlmIChldmVudFBhc3N0aHJvdWdoID09PSAndmVydGljYWwnKSB7XG4gICAgdG91Y2hBY3Rpb24gPSAncGFuLXknO1xuICB9IGVsc2UgaWYgKGV2ZW50UGFzc3Rocm91Z2ggPT09ICdob3Jpem9udGFsJykge1xuICAgIHRvdWNoQWN0aW9uID0gJ3Bhbi14JztcbiAgfVxuXG4gIGlmIChhZGRQaW5jaCAmJiB0b3VjaEFjdGlvbiAhPSAnbm9uZScpIHtcbiAgICAvLyBhZGQgcGluY2gtem9vbSBzdXBwb3J0IGlmIHRoZSBicm93c2VyIHN1cHBvcnRzIGl0LCBidXQgaWYgbm90IChlZy4gQ2hyb21lIDw1NSkgZG8gbm90aGluZ1xuICAgIHRvdWNoQWN0aW9uICs9ICcgcGluY2gtem9vbSc7XG4gIH1cbiAgcmV0dXJuIHRvdWNoQWN0aW9uO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRUb3VjaEFjdGlvbjsiLCJmdW5jdGlvbiBhZGRFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59O1xuXG5mdW5jdGlvbiByZW1vdmVFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59XG5cbmV4cG9ydCB7XG4gIGFkZEV2ZW50LFxuICByZW1vdmVFdmVudFxufTsiLCJmdW5jdGlvbiBwcmVmaXhQb2ludGVyRXZlbnQgKHBvaW50ZXJFdmVudCkge1xuICByZXR1cm4gd2luZG93Lk1TUG9pbnRlckV2ZW50ID8gXG4gICAgJ01TUG9pbnRlcicgKyBwb2ludGVyRXZlbnQuY2hhckF0KDcpLnRvVXBwZXJDYXNlKCkgKyBwb2ludGVyRXZlbnQuc3Vic3RyKDgpIDpcbiAgICBwb2ludGVyRXZlbnQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHByZWZpeFBvaW50ZXJFdmVudDsiLCJ2YXIgZXZlbnRUeXBlID0ge1xuICB0b3VjaHN0YXJ0OiAxLFxuICB0b3VjaG1vdmU6IDEsXG4gIHRvdWNoZW5kOiAxLFxuXG4gIG1vdXNlZG93bjogMixcbiAgbW91c2Vtb3ZlOiAyLFxuICBtb3VzZXVwOiAyLFxuXG4gIHBvaW50ZXJkb3duOiAzLFxuICBwb2ludGVybW92ZTogMyxcbiAgcG9pbnRlcnVwOiAzLFxuXG4gIE1TUG9pbnRlckRvd246IDMsXG4gIE1TUG9pbnRlck1vdmU6IDMsXG4gIE1TUG9pbnRlclVwOiAzXG59O1xuXG5leHBvcnQgZGVmYXVsdCBldmVudFR5cGU7IiwidmFyIHByZXZlbnREZWZhdWx0RXhjZXB0aW9uID0gZnVuY3Rpb24gKGVsLCBleGNlcHRpb25zKSB7XG4gIGZvciAodmFyIGkgaW4gZXhjZXB0aW9ucykge1xuICAgIGlmICggZXhjZXB0aW9uc1tpXS50ZXN0KGVsW2ldKSApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHByZXZlbnREZWZhdWx0RXhjZXB0aW9uOyIsInZhciBtb21lbnR1bSA9IGZ1bmN0aW9uIChjdXJyZW50LCBzdGFydCwgdGltZSwgbG93ZXJNYXJnaW4sIHdyYXBwZXJTaXplLCBkZWNlbGVyYXRpb24pIHtcbiAgdmFyIGRpc3RhbmNlID0gY3VycmVudCAtIHN0YXJ0LFxuICAgIHNwZWVkID0gTWF0aC5hYnMoZGlzdGFuY2UpIC8gdGltZSxcbiAgICBkZXN0aW5hdGlvbixcbiAgICBkdXJhdGlvbjtcblxuICBkZWNlbGVyYXRpb24gPSBkZWNlbGVyYXRpb24gPT09IHVuZGVmaW5lZCA/IDAuMDAwNiA6IGRlY2VsZXJhdGlvbjtcblxuICBkZXN0aW5hdGlvbiA9IGN1cnJlbnQgKyAoIHNwZWVkICogc3BlZWQgKSAvICggMiAqIGRlY2VsZXJhdGlvbiApICogKCBkaXN0YW5jZSA8IDAgPyAtMSA6IDEgKTtcbiAgZHVyYXRpb24gPSBzcGVlZCAvIGRlY2VsZXJhdGlvbjtcblxuICBpZiAoIGRlc3RpbmF0aW9uIDwgbG93ZXJNYXJnaW4gKSB7XG4gICAgZGVzdGluYXRpb24gPSB3cmFwcGVyU2l6ZSA/IGxvd2VyTWFyZ2luIC0gKCB3cmFwcGVyU2l6ZSAvIDIuNSAqICggc3BlZWQgLyA4ICkgKSA6IGxvd2VyTWFyZ2luO1xuICAgIGRpc3RhbmNlID0gTWF0aC5hYnMoZGVzdGluYXRpb24gLSBjdXJyZW50KTtcbiAgICBkdXJhdGlvbiA9IGRpc3RhbmNlIC8gc3BlZWQ7XG4gIH0gZWxzZSBpZiAoIGRlc3RpbmF0aW9uID4gMCApIHtcbiAgICBkZXN0aW5hdGlvbiA9IHdyYXBwZXJTaXplID8gd3JhcHBlclNpemUgLyAyLjUgKiAoIHNwZWVkIC8gOCApIDogMDtcbiAgICBkaXN0YW5jZSA9IE1hdGguYWJzKGN1cnJlbnQpICsgZGVzdGluYXRpb247XG4gICAgZHVyYXRpb24gPSBkaXN0YW5jZSAvIHNwZWVkO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBkZXN0aW5hdGlvbjogTWF0aC5yb3VuZChkZXN0aW5hdGlvbiksXG4gICAgZHVyYXRpb246IGR1cmF0aW9uXG4gIH07XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1vbWVudHVtOyIsImltcG9ydCBlYXNpbmdzIGZyb20gJy4vdXRpbHMvZWFzaW5ncyc7XG5pbXBvcnQgc3R5bGVVdGlscyBmcm9tICcuL3V0aWxzL3N0eWxlJztcbmltcG9ydCBpc0JhZEFuZHJvaWQgZnJvbSAnLi91dGlscy9pc0JhZEFuZHJvaWQnO1xuaW1wb3J0IGdldFRpbWUgZnJvbSAnLi91dGlscy9nZXRUaW1lJztcbmltcG9ydCBvZmZzZXRVdGlscyBmcm9tICcuL3V0aWxzL29mZnNldCc7XG5pbXBvcnQgZ2V0UmVjdCBmcm9tICcuL3V0aWxzL2dldFJlY3QnO1xuaW1wb3J0IHsgaGFzUG9pbnRlciwgaGFzVG91Y2ggfSBmcm9tICcuL3V0aWxzL2RldGVjdG9yJztcbmltcG9ydCBnZXRUb3VjaEFjdGlvbiBmcm9tICcuL3V0aWxzL2dldFRvdWNoQWN0aW9uJztcbmltcG9ydCB7IGFkZEV2ZW50LCByZW1vdmVFdmVudCB9IGZyb20gJy4vdXRpbHMvZXZlbnRIYW5kbGVyJztcbmltcG9ydCBwcmVmaXhQb2ludGVyRXZlbnQgZnJvbSAnLi91dGlscy9wcmVmaXhQb2ludGVyRXZlbnQnO1xuaW1wb3J0IGV2ZW50VHlwZSBmcm9tICcuL3V0aWxzL2V2ZW50VHlwZSc7XG5pbXBvcnQgcHJldmVudERlZmF1bHRFeGNlcHRpb24gZnJvbSAnLi91dGlscy9wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbic7XG5pbXBvcnQgbW9tZW50dW0gZnJvbSAnLi91dGlscy9tb21lbnR1bSc7XG5cbi8vIGRlYWwgd2l0aCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgY29tcGF0YmlsaXR5XG52YXIgckFGID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGZ1bmN0aW9uIChjYWxsYmFjaykgeyB3aW5kb3cuc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTsgfTtcblxuZnVuY3Rpb24gSXNjcm9sbChlbGVtLCBvcHRpb25zKSB7XG4gIC8qKlxuICAgKiBnZXQgc2Nyb2xsIG5vZGUgZWxlbWVudFxuICAgKi9cbiAgdGhpcy53cmFwcGVyID0gdHlwZW9mIGVsZW0gPT09ICdzdHJpbmcnID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtKSA6IGVsZW07XG4gIHRoaXMuc2Nyb2xsZXIgPSB0aGlzLndyYXBwZXIuY2hpbGRyZW5bMF07XG4gIHRoaXMuc2Nyb2xsZXJTdHlsZSA9IHRoaXMuc2Nyb2xsZXIuc3R5bGU7XG5cbiAgLyoqXG4gICAqIG1lcmdlIGRlZmF1bHQgb3B0aW9ucyBhbmQgY3VzdG9taXplZCBvcHRpb25zXG4gICAqL1xuICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgZGlzYWJsZVBvaW50ZXI6ICFoYXNQb2ludGVyLFxuICAgIGRpc2FibGVUb3VjaDogaGFzUG9pbnRlciB8fCAhaGFzVG91Y2gsXG4gICAgZGlzYWJsZU1vdXNlOiBoYXNQb2ludGVyIHx8ICFoYXNUb3VjaCxcbiAgICB1c2VUcmFuc2l0aW9uOiB0cnVlLFxuICAgIHVzZVRyYW5zZm9ybTogdHJ1ZSxcbiAgICBzY3JvbGxZOiB0cnVlLFxuICAgIHN0YXJ0WDogMCxcbiAgICBzdGFydFk6IDAsXG4gICAgYmluZFRvV3JhcHBlcjogdHlwZW9mIHdpbmRvdy5vbm1vdXNlZG93biA9PT0gXCJ1bmRlZmluZWRcIixcbiAgICBwcmV2ZW50RGVmYXVsdDogdHJ1ZSxcbiAgICBwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbjogeyB0YWdOYW1lOiAvXihJTlBVVHxURVhUQVJFQXxCVVRUT058U0VMRUNUKSQvIH0sXG4gICAgZGlyZWN0aW9uTG9ja1RocmVzaG9sZDogNSxcbiAgICBib3VuY2U6IHRydWUsXG4gICAgYm91bmNlVGltZTogNjAwLFxuICAgIGJvdW5jZUVhc2luZzogJycsXG4gICAgbW9tZW50dW06IHRydWVcbiAgfTtcblxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnNbaV0gPSBvcHRpb25zW2ldO1xuICB9XG5cbiAgdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PT0gdHJ1ZSA/ICd2ZXJ0aWNhbCcgOiB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaDtcblxuICAvLyBJZiB5b3Ugd2FudCBldmVudFBhc3N0aHJvdWdoIEkgaGF2ZSB0byBsb2NrIG9uZSBvZiB0aGUgYXhlc1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWSA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSAndmVydGljYWwnID8gZmFsc2UgOiB0aGlzLm9wdGlvbnMuc2Nyb2xsWTtcbiAgdGhpcy5vcHRpb25zLnNjcm9sbFggPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ2hvcml6b250YWwnID8gZmFsc2UgOiB0aGlzLm9wdGlvbnMuc2Nyb2xsWDtcblxuICB0aGlzLm9wdGlvbnMuZnJlZVNjcm9sbCA9IHRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsICYmICF0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaDtcbiAgdGhpcy5vcHRpb25zLmRpcmVjdGlvbkxvY2tUaHJlc2hvbGQgPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA/IDAgOiB0aGlzLm9wdGlvbnMuZGlyZWN0aW9uTG9ja1RocmVzaG9sZDtcblxuICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nID0gdHlwZW9mIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcgPT0gJ3N0cmluZycgP1xuICAgIGVhc2luZ3NbdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZ10gfHwgZWFzaW5ncy5jaXJjdWxhciA6XG4gICAgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZztcblxuICB0aGlzLm9wdGlvbnMucmVzaXplUG9sbGluZyA9IHRoaXMub3B0aW9ucy5yZXNpemVQb2xsaW5nID09PSB1bmRlZmluZWQgPyA2MCA6IHRoaXMub3B0aW9ucy5yZXNpemVQb2xsaW5nO1xuXG4gIHRoaXMueCA9IDA7XG4gIHRoaXMueSA9IDA7XG4gIHRoaXMuZGlyZWN0aW9uWCA9IDA7XG4gIHRoaXMuZGlyZWN0aW9uWSA9IDA7XG4gIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIHRoaXMuX2luaXQoKTtcbiAgdGhpcy5yZWZyZXNoKCk7XG4gIHRoaXMuc2Nyb2xsVG8odGhpcy5vcHRpb25zLnN0YXJ0WCwgdGhpcy5vcHRpb25zLnN0YXJ0WSk7XG4gIHRoaXMuZW5hYmxlKCk7XG59XG5cbklzY3JvbGwucHJvdG90eXBlID0ge1xuXG4gIF9pbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faW5pdEV2ZW50cygpO1xuICB9LFxuXG4gIF9pbml0RXZlbnRzOiBmdW5jdGlvbiAocmVtb3ZlKSB7XG4gICAgdmFyIGV2ZW50VHlwZSA9IHJlbW92ZSA/IHJlbW92ZUV2ZW50IDogYWRkRXZlbnQsXG4gICAgICB0YXJnZXQgPSB0aGlzLm9wdGlvbnMuYmluZFRvV3JhcHBlciA/IHRoaXMud3JhcHBlciA6IHdpbmRvdztcblxuICAgIGV2ZW50VHlwZSh3aW5kb3csICdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh3aW5kb3csICdyZXNpemUnLCB0aGlzKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2spIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsICdjbGljaycsIHRoaXMsIHRydWUpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVNb3VzZSkge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ21vdXNlZG93bicsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNlbW92ZScsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNlY2FuY2VsJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAnbW91c2V1cCcsIHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChoYXNQb2ludGVyICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVBvaW50ZXIpIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsIHByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcmRvd24nKSwgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJtb3ZlJyksIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVyY2FuY2VsJyksIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVydXAnKSwgdGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKGhhc1RvdWNoICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVRvdWNoKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCAndG91Y2hzdGFydCcsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ3RvdWNobW92ZScsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ3RvdWNoY2FuY2VsJywgdGhpcyk7XG4gICAgICBldmVudFR5cGUodGFyZ2V0LCAndG91Y2hlbmQnLCB0aGlzKTtcbiAgICB9XG5cbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ3RyYW5zaXRpb25lbmQnLCB0aGlzKTtcbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ3dlYmtpdFRyYW5zaXRpb25FbmQnLCB0aGlzKTtcbiAgICBldmVudFR5cGUodGhpcy5zY3JvbGxlciwgJ29UcmFuc2l0aW9uRW5kJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICdNU1RyYW5zaXRpb25FbmQnLCB0aGlzKTtcbiAgfSxcblxuICBoYW5kbGVFdmVudDogZnVuY3Rpb24gKGUpIHtcbiAgICBzd2l0Y2ggKGUudHlwZSkge1xuICAgICAgY2FzZSAndG91Y2hzdGFydCc6XG4gICAgICBjYXNlICdwb2ludGVyZG93bic6XG4gICAgICBjYXNlICdNU1BvaW50ZXJEb3duJzpcbiAgICAgIGNhc2UgJ21vdXNlZG93bic6XG4gICAgICAgIHRoaXMuX3N0YXJ0KGUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndG91Y2htb3ZlJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJtb3ZlJzpcbiAgICAgIGNhc2UgJ01TUG9pbnRlck1vdmUnOlxuICAgICAgY2FzZSAnbW91c2Vtb3ZlJzpcbiAgICAgICAgdGhpcy5fbW92ZShlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3RvdWNoZW5kJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJ1cCc6XG4gICAgICBjYXNlICdNU1BvaW50ZXJVcCc6XG4gICAgICBjYXNlICdtb3VzZXVwJzpcbiAgICAgIGNhc2UgJ3RvdWNoY2FuY2VsJzpcbiAgICAgIGNhc2UgJ3BvaW50ZXJjYW5jZWwnOlxuICAgICAgY2FzZSAnTVNQb2ludGVyQ2FuY2VsJzpcbiAgICAgIGNhc2UgJ21vdXNlY2FuY2VsJzpcbiAgICAgICAgdGhpcy5fZW5kKGUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ29yaWVudGF0aW9uY2hhbmdlJzpcbiAgICAgIGNhc2UgJ3Jlc2l6ZSc6XG4gICAgICAgIHRoaXMuX3Jlc2l6ZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3RyYW5zaXRpb25lbmQnOlxuICAgICAgY2FzZSAnd2Via2l0VHJhbnNpdGlvbkVuZCc6XG4gICAgICBjYXNlICdvVHJhbnNpdGlvbkVuZCc6XG4gICAgICBjYXNlICdNU1RyYW5zaXRpb25FbmQnOlxuICAgICAgICB0aGlzLl90cmFuc2l0aW9uRW5kKGUpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH0sXG5cbiAgX3N0YXJ0OiBmdW5jdGlvbiAoZSkge1xuICAgIGNvbnNvbGUubG9nKCdzdGFydCBldmVudCB0eXBlOiAnLCBlLnR5cGUpO1xuICAgIC8vIFJlYWN0IHRvIGxlZnQgbW91c2UgYnV0dG9uIG9ubHlcbiAgICBpZiAoZXZlbnRUeXBlW2UudHlwZV0gIT09IDEpIHsgLy8gbm90IHRvdWNoIGV2ZW50XG4gICAgICB2YXIgYnV0dG9uO1xuICAgICAgaWYgKCFlLndoaWNoKSB7XG4gICAgICAgIC8qIElFIGNhc2UgKi9cbiAgICAgICAgYnV0dG9uID0gKGUuYnV0dG9uIDwgMikgPyAwIDpcbiAgICAgICAgICAoKGUuYnV0dG9uID09IDQpID8gMSA6IDIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLyogQWxsIG90aGVycyAqL1xuICAgICAgICBidXR0b24gPSBlLmJ1dHRvbjtcbiAgICAgIH1cblxuICAgICAgLy8gbm90IGxlZnQgbW91c2UgYnV0dG9uXG4gICAgICBpZiAoYnV0dG9uICE9PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZW5hYmxlZCB8fCAodGhpcy5pbml0aWF0ZWQgJiYgZXZlbnRUeXBlW2UudHlwZV0gIT09IHRoaXMuaW5pdGlhdGVkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHQgJiYgIWlzQmFkQW5kcm9pZCAmJiAhcHJldmVudERlZmF1bHRFeGNlcHRpb24oZS50YXJnZXQsIHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbikpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnQgPSBlLnRvdWNoZXMgPyBlLnRvdWNoZXNbMF0gOiBlLFxuICAgICAgcG9zO1xuXG4gICAgdGhpcy5pbml0aWF0ZWQgPSBldmVudFR5cGVbZS50eXBlXTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5kaXN0WCA9IDA7XG4gICAgdGhpcy5kaXN0WSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25YID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gMDtcblxuICAgIHRoaXMuc3RhcnRUaW1lID0gZ2V0VGltZSgpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRoaXMuaXNJblRyYW5zaXRpb24pIHtcbiAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1lKCk7XG4gICAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gZmFsc2U7XG4gICAgICBwb3MgPSB0aGlzLmdldENvbXB1dGVkUG9zaXRpb24oKTtcbiAgICAgIHRoaXMuX3RyYW5zbGF0ZShNYXRoLnJvdW5kKHBvcy54KSwgTWF0aC5yb3VuZChwb3MueSkpO1xuICAgICAgdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxFbmQnKTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiB0aGlzLmlzQW5pbWF0aW5nKSB7XG4gICAgICB0aGlzLmlzQW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuICAgIH1cblxuICAgIHRoaXMuc3RhcnRYID0gdGhpcy54O1xuICAgIHRoaXMuc3RhcnRZID0gdGhpcy55O1xuICAgIHRoaXMuYWJzU3RhcnRYID0gdGhpcy54O1xuICAgIHRoaXMuYWJzU3RhcnRZID0gdGhpcy55O1xuICAgIHRoaXMucG9pbnRYID0gcG9pbnQucGFnZVg7XG4gICAgdGhpcy5wb2ludFkgPSBwb2ludC5wYWdlWTtcblxuICAgIHRoaXMuX2V4ZWNFdmVudCgnYmVmb3JlU2Nyb2xsU3RhcnQnKTtcbiAgfSxcblxuICBfbW92ZTogZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCB8fCBldmVudFR5cGVbZS50eXBlXSAhPT0gdGhpcy5pbml0aWF0ZWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdkbyBub3QgbW92ZSBzY3JvbGwnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnByZXZlbnREZWZhdWx0KSB7XHQvLyBpbmNyZWFzZXMgcGVyZm9ybWFuY2Ugb24gQW5kcm9pZD8gVE9ETzogY2hlY2shXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgdmFyIHBvaW50ID0gZS50b3VjaGVzID8gZS50b3VjaGVzWzBdIDogZSxcbiAgICAgIGRlbHRhWCA9IHBvaW50LnBhZ2VYIC0gdGhpcy5wb2ludFgsIC8vIHRoZSBtb3ZlZCBkaXN0YW5jZVxuICAgICAgZGVsdGFZID0gcG9pbnQucGFnZVkgLSB0aGlzLnBvaW50WSxcbiAgICAgIHRpbWVzdGFtcCA9IGdldFRpbWUoKSxcbiAgICAgIG5ld1gsIG5ld1ksXG4gICAgICBhYnNEaXN0WCwgYWJzRGlzdFk7XG5cbiAgICB0aGlzLnBvaW50WCA9IHBvaW50LnBhZ2VYO1xuICAgIHRoaXMucG9pbnRZID0gcG9pbnQucGFnZVk7XG5cbiAgICB0aGlzLmRpc3RYICs9IGRlbHRhWDtcbiAgICB0aGlzLmRpc3RZICs9IGRlbHRhWTtcbiAgICBhYnNEaXN0WCA9IE1hdGguYWJzKHRoaXMuZGlzdFgpOyAvLyBhYnNvbHV0ZSBtb3ZlZCBkaXN0YW5jZVxuICAgIGFic0Rpc3RZID0gTWF0aC5hYnModGhpcy5kaXN0WSk7XG5cbiAgICAvKipcbiAgICAgKiAgV2UgbmVlZCB0byBtb3ZlIGF0IGxlYXN0IDEwIHBpeGVscyBmb3IgdGhlIHNjcm9sbGluZyB0byBpbml0aWF0ZVxuICAgICAqICB0aGlzLmVuZFRpbWUgaXMgaW5pdGlhdGVkIGluIHRoaXMucHJvdG90eXBlLnJlZnJlc2ggbWV0aG9kXG4gICAgICovXG4gICAgaWYgKHRpbWVzdGFtcCAtIHRoaXMuZW5kVGltZSA+IDMwMCAmJiAoYWJzRGlzdFggPCAxMCAmJiBhYnNEaXN0WSA8IDEwKSkge1xuICAgICAgY29uc29sZS5sb2coJ2xlc3MgdGhhbiAxMCBweCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHlvdSBhcmUgc2Nyb2xsaW5nIGluIG9uZSBkaXJlY3Rpb24gbG9jayB0aGUgb3RoZXJcbiAgICBpZiAoIXRoaXMuZGlyZWN0aW9uTG9ja2VkICYmICF0aGlzLm9wdGlvbnMuZnJlZVNjcm9sbCkge1xuXG4gICAgICBpZiAoYWJzRGlzdFggPiBhYnNEaXN0WSArIHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ2gnO1x0XHQvLyBsb2NrIGhvcml6b250YWxseVxuICAgICAgfSBlbHNlIGlmIChhYnNEaXN0WSA+PSBhYnNEaXN0WCArIHRoaXMub3B0aW9ucy5kaXJlY3Rpb25Mb2NrVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ3YnO1x0XHQvLyBsb2NrIHZlcnRpY2FsbHlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gJ24nO1x0XHQvLyBubyBsb2NrXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICBpZiAodGhpcy5kaXJlY3Rpb25Mb2NrZWQgPT0gJ2gnKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ3ZlcnRpY2FsJykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICdob3Jpem9udGFsJykge1xuICAgICAgICB0aGlzLmluaXRpYXRlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGRlbHRhWSA9IDA7XG4gICAgfSBlbHNlIGlmICh0aGlzLmRpcmVjdGlvbkxvY2tlZCA9PSAndicpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAnaG9yaXpvbnRhbCcpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAndmVydGljYWwnKSB7XG4gICAgICAgIHRoaXMuaW5pdGlhdGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZGVsdGFYID0gMDtcbiAgICB9XG5cbiAgICBkZWx0YVggPSB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPyBkZWx0YVggOiAwO1xuICAgIGRlbHRhWSA9IHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPyBkZWx0YVkgOiAwO1xuXG4gICAgbmV3WCA9IHRoaXMueCArIGRlbHRhWDtcbiAgICBuZXdZID0gdGhpcy55ICsgZGVsdGFZO1xuXG4gICAgLy8gU2xvdyBkb3duIGlmIG91dHNpZGUgb2YgdGhlIGJvdW5kYXJpZXNcbiAgICBpZiAobmV3WCA+IDAgfHwgbmV3WCA8IHRoaXMubWF4U2Nyb2xsWCkge1xuICAgICAgY29uc29sZS5sb2coJ3h4eHh4eHh4Jyk7XG4gICAgICBuZXdYID0gdGhpcy5vcHRpb25zLmJvdW5jZSA/IHRoaXMueCArIGRlbHRhWCAvIDMgOiBuZXdYID4gMCA/IDAgOiB0aGlzLm1heFNjcm9sbFg7XG4gICAgfVxuICAgIGlmIChuZXdZID4gMCB8fCBuZXdZIDwgdGhpcy5tYXhTY3JvbGxZKSB7XG4gICAgICBjb25zb2xlLmxvZygneXl5eXl5eXknKTtcbiAgICAgIG5ld1kgPSB0aGlzLm9wdGlvbnMuYm91bmNlID8gdGhpcy55ICsgZGVsdGFZIC8gMyA6IG5ld1kgPiAwID8gMCA6IHRoaXMubWF4U2Nyb2xsWTtcbiAgICB9XG5cbiAgICB0aGlzLmRpcmVjdGlvblggPSBkZWx0YVggPiAwID8gLTEgOiBkZWx0YVggPCAwID8gMSA6IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25ZID0gZGVsdGFZID4gMCA/IC0xIDogZGVsdGFZIDwgMCA/IDEgOiAwO1xuXG4gICAgaWYgKCF0aGlzLm1vdmVkKSB7XG4gICAgICB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbFN0YXJ0Jyk7XG4gICAgfVxuXG4gICAgdGhpcy5tb3ZlZCA9IHRydWU7XG5cbiAgICBjb25zb2xlLmxvZygnbmV3WDogJyxuZXdYLCAnbmV3WTogJywgbmV3WSk7XG4gICAgdGhpcy5fdHJhbnNsYXRlKG5ld1gsIG5ld1kpO1xuXG4gICAgaWYgKHRpbWVzdGFtcCAtIHRoaXMuc3RhcnRUaW1lID4gMzAwKSB7XG4gICAgICB0aGlzLnN0YXJ0VGltZSA9IHRpbWVzdGFtcDtcbiAgICAgIHRoaXMuc3RhcnRYID0gdGhpcy54O1xuICAgICAgdGhpcy5zdGFydFkgPSB0aGlzLnk7XG4gICAgfVxuICB9LFxuXG4gIF9lbmQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQgfHwgZXZlbnRUeXBlW2UudHlwZV0gIT09IHRoaXMuaW5pdGlhdGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdCAmJiAhcHJldmVudERlZmF1bHRFeGNlcHRpb24oZS50YXJnZXQsIHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbikpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnQgPSBlLmNoYW5nZWRUb3VjaGVzID8gZS5jaGFuZ2VkVG91Y2hlc1swXSA6IGUsXG4gICAgICBtb21lbnR1bVgsXG4gICAgICBtb21lbnR1bVksXG4gICAgICBkdXJhdGlvbiA9IGdldFRpbWUoKSAtIHRoaXMuc3RhcnRUaW1lLFxuICAgICAgbmV3WCA9IE1hdGgucm91bmQodGhpcy54KSxcbiAgICAgIG5ld1kgPSBNYXRoLnJvdW5kKHRoaXMueSksXG4gICAgICBkaXN0YW5jZVggPSBNYXRoLmFicyhuZXdYIC0gdGhpcy5zdGFydFgpLFxuICAgICAgZGlzdGFuY2VZID0gTWF0aC5hYnMobmV3WSAtIHRoaXMuc3RhcnRZKSxcbiAgICAgIHRpbWUgPSAwLFxuICAgICAgZWFzaW5nID0gJyc7XG5cbiAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gMDtcbiAgICB0aGlzLmluaXRpYXRlZCA9IDA7XG4gICAgdGhpcy5lbmRUaW1lID0gZ2V0VGltZSgpO1xuXG4gICAgLy8gcmVzZXQgaWYgd2UgYXJlIG91dHNpZGUgb2YgdGhlIGJvdW5kYXJpZXNcbiAgICBpZiAodGhpcy5yZXNldFBvc2l0aW9uKHRoaXMub3B0aW9ucy5ib3VuY2VUaW1lKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsVG8obmV3WCwgbmV3WSk7XHQvLyBlbnN1cmVzIHRoYXQgdGhlIGxhc3QgcG9zaXRpb24gaXMgcm91bmRlZFxuXG4gICAgLy8gd2Ugc2Nyb2xsZWQgbGVzcyB0aGFuIDEwIHBpeGVsc1xuICAgIGlmICghdGhpcy5tb3ZlZCkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy50YXApIHtcbiAgICAgICAgLy8gdXRpbHMudGFwKGUsIHRoaXMub3B0aW9ucy50YXApO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrKSB7XG4gICAgICAgIC8vIHV0aWxzLmNsaWNrKGUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbENhbmNlbCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMuZmxpY2sgJiYgZHVyYXRpb24gPCAyMDAgJiYgZGlzdGFuY2VYIDwgMTAwICYmIGRpc3RhbmNlWSA8IDEwMCkge1xuICAgICAgdGhpcy5fZXhlY0V2ZW50KCdmbGljaycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHN0YXJ0IG1vbWVudHVtIGFuaW1hdGlvbiBpZiBuZWVkZWRcbiAgICBpZiAodGhpcy5vcHRpb25zLm1vbWVudHVtICYmIGR1cmF0aW9uIDwgMzAwKSB7XG4gICAgICBtb21lbnR1bVggPSB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPyBtb21lbnR1bSh0aGlzLngsIHRoaXMuc3RhcnRYLCBkdXJhdGlvbiwgdGhpcy5tYXhTY3JvbGxYLCB0aGlzLm9wdGlvbnMuYm91bmNlID8gdGhpcy53cmFwcGVyV2lkdGggOiAwLCB0aGlzLm9wdGlvbnMuZGVjZWxlcmF0aW9uKSA6IHsgZGVzdGluYXRpb246IG5ld1gsIGR1cmF0aW9uOiAwIH07XG4gICAgICBtb21lbnR1bVkgPSB0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsID8gbW9tZW50dW0odGhpcy55LCB0aGlzLnN0YXJ0WSwgZHVyYXRpb24sIHRoaXMubWF4U2Nyb2xsWSwgdGhpcy5vcHRpb25zLmJvdW5jZSA/IHRoaXMud3JhcHBlckhlaWdodCA6IDAsIHRoaXMub3B0aW9ucy5kZWNlbGVyYXRpb24pIDogeyBkZXN0aW5hdGlvbjogbmV3WSwgZHVyYXRpb246IDAgfTtcbiAgICAgIG5ld1ggPSBtb21lbnR1bVguZGVzdGluYXRpb247XG4gICAgICBuZXdZID0gbW9tZW50dW1ZLmRlc3RpbmF0aW9uO1xuICAgICAgdGltZSA9IE1hdGgubWF4KG1vbWVudHVtWC5kdXJhdGlvbiwgbW9tZW50dW1ZLmR1cmF0aW9uKTtcbiAgICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSAxO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc25hcCkge1xuICAgICAgLy8gZG8gc29tZXRpbmdcbiAgICB9XG5cbiAgICBpZiAobmV3WCAhPSB0aGlzLnggfHwgbmV3WSAhPSB0aGlzLnkpIHtcbiAgICAgIC8vIGNoYW5nZSBlYXNpbmcgZnVuY3Rpb24gd2hlbiBzY3JvbGxlciBnb2VzIG91dCBvZiB0aGUgYm91bmRhcmllc1xuICAgICAgaWYgKG5ld1ggPiAwIHx8IG5ld1ggPCB0aGlzLm1heFNjcm9sbFggfHwgbmV3WSA+IDAgfHwgbmV3WSA8IHRoaXMubWF4U2Nyb2xsWSkge1xuICAgICAgICBlYXNpbmcgPSBlYXNpbmdzLnF1YWRyYXRpYztcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKCdlbmQgZW5kIGVuZCBlbmQhJyk7XG4gICAgICB0aGlzLnNjcm9sbFRvKG5ld1gsIG5ld1ksIHRpbWUsIGVhc2luZyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxFbmQnKTtcblxuICB9LFxuXG4gIF90cmFuc2l0aW9uRW5kOiBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLnRhcmdldCAhPSB0aGlzLnNjcm9sbGVyIHx8ICF0aGlzLmlzSW5UcmFuc2l0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fdHJhbnNpdGlvblRpbWUoKTtcbiAgICBpZiAoIXRoaXMucmVzZXRQb3NpdGlvbih0aGlzLm9wdGlvbnMuYm91bmNlVGltZSkpIHtcbiAgICAgIHRoaXMuaXNJblRyYW5zaXRpb24gPSBmYWxzZTtcbiAgICAgIHRoaXMuX2V4ZWNFdmVudCgnc2Nyb2xsRW5kJyk7XG4gICAgfVxuICB9LFxuXG4gIF9yZXNpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5yZXNpemVUaW1lb3V0KTtcblxuICAgIHRoaXMucmVzaXplVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgY29uc29sZS5sb2coJ3Jlc2l6ZSBub3cnKTtcbiAgICAgIHRoYXQucmVmcmVzaCgpO1xuICAgIH0sIHRoaXMub3B0aW9ucy5yZXNpemVQb2xsaW5nKTtcbiAgfSxcblxuXHRvbjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdFx0aWYgKCAhdGhpcy5fZXZlbnRzW3R5cGVdICkge1xuXHRcdFx0dGhpcy5fZXZlbnRzW3R5cGVdID0gW107XG5cdFx0fVxuXG5cdFx0dGhpcy5fZXZlbnRzW3R5cGVdLnB1c2goZm4pO1xuICB9LFxuICBcblx0b2ZmOiBmdW5jdGlvbiAodHlwZSwgZm4pIHtcblx0XHRpZiAoICF0aGlzLl9ldmVudHNbdHlwZV0gKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGluZGV4ID0gdGhpcy5fZXZlbnRzW3R5cGVdLmluZGV4T2YoZm4pO1xuXG5cdFx0aWYgKCBpbmRleCA+IC0xICkge1xuXHRcdFx0dGhpcy5fZXZlbnRzW3R5cGVdLnNwbGljZShpbmRleCwgMSk7XG5cdFx0fVxuXHR9LFxuXG4gIF9leGVjRXZlbnQ6IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgaSA9IDAsXG4gICAgICBsID0gdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcblxuICAgIGlmICghbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuXHRcdGZvciAoIDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdHRoaXMuX2V2ZW50c1t0eXBlXVtpXS5hcHBseSh0aGlzLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuXHRcdH1cblxuICB9LFxuXG4gIGdldENvbXB1dGVkUG9zaXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbWF0cml4ID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy5zY3JvbGxlciwgbnVsbCksXG4gICAgICB4LCB5O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2Zvcm0pIHtcbiAgICAgIG1hdHJpeCA9IG1hdHJpeFtzdHlsZVV0aWxzLnRyYW5zZm9ybV0uc3BsaXQoJyknKVswXS5zcGxpdCgnLCAnKTtcbiAgICAgIHggPSArKG1hdHJpeFsxMl0gfHwgbWF0cml4WzRdKTtcbiAgICAgIHkgPSArKG1hdHJpeFsxM10gfHwgbWF0cml4WzVdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZWcuIHRyYW5zZm9ybSAnMHB4JyB0byAwXG4gICAgICB4ID0gK21hdHJpeC5sZWZ0LnJlcGxhY2UoL1teLVxcZC5dL2csICcnKTtcbiAgICAgIHkgPSArbWF0cml4LnRvcC5yZXBsYWNlKC9bXi1cXGQuXS9nLCAnJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgeDogeCwgeTogeSB9O1xuICB9LFxuXG4gIHNjcm9sbFRvOiBmdW5jdGlvbiAoeCwgeSwgdGltZSwgZWFzaW5nKSB7XG4gICAgZWFzaW5nID0gZWFzaW5nIHx8IGVhc2luZ3MuY2lyY3VsYXI7XG4gICAgdGhpcy5pc0luVHJhbnNpdGlvbiA9IHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRpbWUgPiAwO1xuICAgIHZhciB0cmFuc2l0aW9uVHlwZSA9IHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIGVhc2luZy5zdHlsZTtcblxuICAgIGlmICghdGltZSB8fCB0cmFuc2l0aW9uVHlwZSkge1xuICAgICAgaWYgKHRyYW5zaXRpb25UeXBlKSB7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbihlYXNpbmcuc3R5bGUpO1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uVGltZSh0aW1lKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3RyYW5zbGF0ZSh4LCB5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fYW5pbWF0ZSh4LCB5LCB0aW1lLCBlYXNpbmcuZm4pO1xuICAgIH1cbiAgfSxcblxuICBzY3JvbGxUb0VsZW1lbnQ6IGZ1bmN0aW9uIChlbCwgdGltZSwgb2Zmc2V0WCwgb2Zmc2V0WSwgZWFzaW5nKSB7XG4gICAgZWwgPSBlbC5ub2RlVHlwZSA/IGVsIDogdGhpcy5zY3JvbGxlci5xdWVyeVNlbGVjdG9yKGVsKTtcblxuICAgIC8vIGlmIG5vIGVsZW1lbnQgc2VsZWN0ZWQsIHRoZW4gcmV0dXJuXG4gICAgaWYgKCFlbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBwb3MgPSBvZmZzZXRVdGlscyhlbCk7XG5cbiAgICBwb3MubGVmdCAtPSB0aGlzLndyYXBwZXJPZmZzZXQubGVmdDtcbiAgICBwb3MudG9wIC09IHRoaXMud3JhcHBlck9mZnNldC50b3A7XG5cbiAgICAvLyBpZiBvZmZzZXRYL1kgYXJlIHRydWUgd2UgY2VudGVyIHRoZSBlbGVtZW50IHRvIHRoZSBzY3JlZW5cbiAgICB2YXIgZWxSZWN0ID0gZ2V0UmVjdChlbCk7XG4gICAgdmFyIHdyYXBwZXJSZWN0ID0gZ2V0UmVjdCh0aGlzLndyYXBwZXIpO1xuICAgIGlmIChvZmZzZXRYID09PSB0cnVlKSB7XG4gICAgICBvZmZzZXRYID0gTWF0aC5yb3VuZChlbFJlY3Qud2lkdGggLyAyIC0gd3JhcHBlclJlY3Qud2lkdGggLyAyKTtcbiAgICB9XG4gICAgaWYgKG9mZnNldFkgPT09IHRydWUpIHtcbiAgICAgIG9mZnNldFkgPSBNYXRoLnJvdW5kKGVsUmVjdC5oZWlnaHQgLyAyIC0gd3JhcHBlclJlY3QuaGVpZ2h0IC8gMik7XG4gICAgfVxuXG4gICAgcG9zLmxlZnQgLT0gb2Zmc2V0WCB8fCAwO1xuICAgIHBvcy50b3AgLT0gb2Zmc2V0WSB8fCAwO1xuXG4gICAgcG9zLmxlZnQgPSBwb3MubGVmdCA+IDAgPyAwIDogcG9zLmxlZnQgPCB0aGlzLm1heFNjcm9sbFggPyB0aGlzLm1heFNjcm9sbFggOiBwb3MubGVmdDtcbiAgICBwb3MudG9wID0gcG9zLnRvcCA+IDAgPyAwIDogcG9zLnRvcCA8IHRoaXMubWF4U2Nyb2xsWSA/IHRoaXMubWF4U2Nyb2xsWSA6IHBvcy50b3A7XG5cbiAgICB0aW1lID0gdGltZSA9PT0gdW5kZWZpbmVkIHx8IHRpbWUgPT09IG51bGwgfHwgdGltZSA9PT0gJ2F1dG8nID8gTWF0aC5tYXgoTWF0aC5hYnModGhpcy54IC0gcG9zLmxlZnQpLCBNYXRoLmFicyh0aGlzLnkgLSBwb3MudG9wKSkgOiB0aW1lO1xuXG4gICAgdGhpcy5zY3JvbGxUbyhwb3MubGVmdCwgcG9zLnRvcCwgdGltZSwgZWFzaW5nKTtcblxuICB9LFxuXG4gIF90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IGZ1bmN0aW9uIChlYXNpbmdTdHlsZSkge1xuICAgIC8vIGFzc2lnbiBlYXNpbmcgY3NzIHN0eWxlIHRvIHNjcm9sbCBjb250YWluZXIgdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIHByb3BlcnR5XG4gICAgLy8gZXhhbXBsZTogY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpXG4gICAgdGhpcy5zY3JvbGxlclN0eWxlW3N0eWxlVXRpbHMudHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uXSA9IGVhc2luZ1N0eWxlO1xuICB9LFxuXG4gIF90cmFuc2l0aW9uVGltZTogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICAvLyBpZiBkbyBub3QgdXNlIHRyYW5zaXRpb24gdG8gc2Nyb2xsLCByZXR1cm5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcbiAgICAvLyB0cmFuc2l0aW9uRHVyYXRpb24gd2hpY2ggaGFzIHZlbmRvciBwcmVmaXhcbiAgICB2YXIgZHVyYXRpb25Qcm9wID0gc3R5bGVVdGlscy50cmFuc2l0aW9uRHVyYXRpb247XG4gICAgaWYgKCFkdXJhdGlvblByb3ApIHsgLy8gaWYgbm8gdmVuZG9yIGZvdW5kLCBkdXJhdGlvblByb3Agd2lsbCBiZSBmYWxzZVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gdGltZSArICdtcyc7IC8vIGFzc2lnbiBtcyB0byB0cmFuc2l0aW9uRHVyYXRpb24gcHJvcFxuXG4gICAgaWYgKCF0aW1lICYmIGlzQmFkQW5kcm9pZCkge1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSAnMC4wMDAxbXMnO1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICByQUYoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoc2VsZi5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPT09ICcwLjAwMDFtcycpIHtcbiAgICAgICAgICBzZWxmLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9ICcwcyc7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfdHJhbnNsYXRlOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgIGNvbnNvbGUubG9nKCd0cmFuc2xhdGUgbm93ISE6ICcsIHgsICcgJywgeSk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2Zvcm0pIHtcblxuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW3N0eWxlVXRpbHMudHJhbnNmb3JtXSA9XG4gICAgICAgICd0cmFuc2xhdGUoJyArIHggKyAncHgsJyArIHkgKyAncHgpJyArICd0cmFuc2xhdGVaKDApJztcblxuICAgIH0gZWxzZSB7XG4gICAgICB4ID0gTWF0aC5yb3VuZCh4KTtcbiAgICAgIHkgPSBNYXRoLnJvdW5kKHkpO1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlLmxlZnQgPSB4ICsgJ3B4JztcbiAgICAgIHRoaXMuc2Nyb2xsZXJTdHlsZS50b3AgPSB5ICsgJ3B4JztcbiAgICB9XG5cbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gIH0sXG5cbiAgX2FuaW1hdGU6IGZ1bmN0aW9uIChkZXN0WCwgZGVzdFksIGR1cmF0aW9uLCBlYXNpbmdGbikge1xuICAgIHZhciB0aGF0ID0gdGhpcyxcbiAgICAgIHN0YXJ0WCA9IHRoaXMueCxcbiAgICAgIHN0YXJ0WSA9IHRoaXMueSxcbiAgICAgIHN0YXJ0VGltZSA9IGdldFRpbWUoKSxcbiAgICAgIGRlc3RUaW1lID0gc3RhcnRUaW1lICsgZHVyYXRpb247XG5cbiAgICBmdW5jdGlvbiBzdGVwKCkge1xuICAgICAgdmFyIG5vdyA9IGdldFRpbWUoKSxcbiAgICAgICAgbmV3WCwgbmV3WSxcbiAgICAgICAgZWFzaW5nO1xuXG4gICAgICBpZiAobm93ID49IGRlc3RUaW1lKSB7XG4gICAgICAgIHRoYXQuaXNBbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhhdC5fdHJhbnNsYXRlKGRlc3RYLCBkZXN0WSk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBub3cgPSAobm93IC0gc3RhcnRUaW1lKSAvIGR1cmF0aW9uO1xuICAgICAgZWFzaW5nID0gZWFzaW5nRm4obm93KTtcbiAgICAgIG5ld1ggPSAoZGVzdFggLSBzdGFydFgpICogZWFzaW5nICsgc3RhcnRYO1xuICAgICAgbmV3WSA9IChkZXN0WSAtIHN0YXJ0WSkgKiBlYXNpbmcgKyBzdGFydFk7XG4gICAgICB0aGF0Ll90cmFuc2xhdGUobmV3WCwgbmV3WSk7XG5cbiAgICAgIGlmICh0aGF0LmlzQW5pbWF0aW5nKSB7XG4gICAgICAgIHJBRihzdGVwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzQW5pbWF0aW5nID0gdHJ1ZTtcbiAgICBzdGVwKCk7XG4gIH0sXG5cbiAgcmVmcmVzaDogZnVuY3Rpb24gKCkge1xuICAgIGdldFJlY3QodGhpcy53cmFwcGVyKTsgLy8gRm9yY2UgcmVmbG93XG5cbiAgICB0aGlzLndyYXBwZXJXaWR0aCA9IHRoaXMud3JhcHBlci5jbGllbnRXaWR0aDtcbiAgICB0aGlzLndyYXBwZXJIZWlnaHQgPSB0aGlzLndyYXBwZXIuY2xpZW50SGVpZ2h0O1xuXG4gICAgdmFyIHJlY3QgPSBnZXRSZWN0KHRoaXMuc2Nyb2xsZXIpO1xuXG4gICAgdGhpcy5zY3JvbGxlcldpZHRoID0gcmVjdC53aWR0aDtcbiAgICB0aGlzLnNjcm9sbGVySGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XG5cbiAgICAvKipcbiAgICAgKiB0aGlzLm1heFNjcm9sbFggb3IgdGhpcy5tYXhTY3JvbGxZIHNtYWxsZXIgdGhhbiAwLCBtZWFuaW5nXG4gICAgICogb3ZlcmZsb3cgaGFwcGVuZWQuXG4gICAgICovXG4gICAgdGhpcy5tYXhTY3JvbGxYID0gdGhpcy53cmFwcGVyV2lkdGggLSB0aGlzLnNjcm9sbGVyV2lkdGg7XG4gICAgdGhpcy5tYXhTY3JvbGxZID0gdGhpcy53cmFwcGVySGVpZ2h0IC0gdGhpcy5zY3JvbGxlckhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIG9wdGlvbiBlbmFibGVzIHNjcm9sbCBBTkQgb3ZlcmZsb3cgZXhpc3RzXG4gICAgICovXG4gICAgdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsID0gdGhpcy5vcHRpb25zLnNjcm9sbFggJiYgdGhpcy5tYXhTY3JvbGxYIDwgMDtcbiAgICB0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsID0gdGhpcy5vcHRpb25zLnNjcm9sbFkgJiYgdGhpcy5tYXhTY3JvbGxZIDwgMDtcblxuICAgIGlmICghdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsKSB7XG4gICAgICB0aGlzLm1heFNjcm9sbFggPSAwO1xuICAgICAgdGhpcy5zY3JvbGxlcldpZHRoID0gdGhpcy53cmFwcGVyV2lkdGg7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsKSB7XG4gICAgICB0aGlzLm1heFNjcm9sbFkgPSAwO1xuICAgICAgdGhpcy5zY3JvbGxlckhlaWdodCA9IHRoaXMud3JhcHBlckhlaWdodDtcbiAgICB9XG5cbiAgICB0aGlzLmVuZFRpbWUgPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uWCA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25ZID0gMDtcblxuICAgIGlmIChoYXNQb2ludGVyICYmICF0aGlzLm9wdGlvbnMuZGlzYWJsZVBvaW50ZXIpIHtcbiAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSA9XG4gICAgICAgIGdldFRvdWNoQWN0aW9uKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoLCB0cnVlKTtcblxuICAgICAgaWYgKCF0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0pIHtcbiAgICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dID1cbiAgICAgICAgICBnZXRUb3VjaEFjdGlvbih0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCwgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMud3JhcHBlck9mZnNldCA9IG9mZnNldFV0aWxzKHRoaXMud3JhcHBlcik7XG5cbiAgICB0aGlzLl9leGVjRXZlbnQoJ3JlZnJlc2gnKTtcblxuICAgIHRoaXMucmVzZXRQb3NpdGlvbigpO1xuICB9LFxuXG4gIHJlc2V0UG9zaXRpb246IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdmFyIHggPSB0aGlzLngsXG4gICAgICB5ID0gdGhpcy55O1xuXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcblxuICAgIGlmICghdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsIHx8IHRoaXMueCA+IDApIHtcbiAgICAgIHggPSAwO1xuICAgIH0gZWxzZSBpZiAodGhpcy54IDwgdGhpcy5tYXhTY3JvbGxYKSB7XG4gICAgICB4ID0gdGhpcy5tYXhTY3JvbGxYO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5oYXNWZXJ0aWNhbFNjcm9sbCB8fCB0aGlzLnkgPiAwKSB7XG4gICAgICB5ID0gMDtcbiAgICB9IGVsc2UgaWYgKHRoaXMueSA8IHRoaXMubWF4U2Nyb2xsWSkge1xuICAgICAgeSA9IHRoaXMubWF4U2Nyb2xsWTtcbiAgICB9XG5cbiAgICBpZiAoeCA9PT0gdGhpcy54ICYmIHkgPT09IHRoaXMueSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsVG8oeCwgeSwgdGltZSwgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZyk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBkaXNhYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGVkID0gZmFsc2U7XG4gIH0sXG5cbiAgZW5hYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGVkID0gdHJ1ZTtcbiAgfVxuXG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IElzY3JvbGw7Il0sIm5hbWVzIjpbImVhc2luZ3MiLCJrIiwiTWF0aCIsInNxcnQiLCJiIiwiZiIsImUiLCJwb3ciLCJzaW4iLCJQSSIsIl9lbGVtZW50U3R5bGUiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzdHlsZSIsIl92ZW5kb3IiLCJ2ZW5kb3JzIiwidHJhbnNmb3JtIiwiaSIsImwiLCJsZW5ndGgiLCJzdWJzdHIiLCJfcHJlZml4U3R5bGUiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsImlzQmFkQW5kcm9pZCIsImFwcFZlcnNpb24iLCJ3aW5kb3ciLCJuYXZpZ2F0b3IiLCJ0ZXN0Iiwic2FmYXJpVmVyc2lvbiIsIm1hdGNoIiwicGFyc2VGbG9hdCIsImdldFRpbWUiLCJEYXRlIiwibm93Iiwib2Zmc2V0IiwiZWwiLCJsZWZ0Iiwib2Zmc2V0TGVmdCIsInRvcCIsIm9mZnNldFRvcCIsIm9mZnNldFBhcmVudCIsImdldFJlY3QiLCJTVkdFbGVtZW50IiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsIndpZHRoIiwiaGVpZ2h0Iiwib2Zmc2V0V2lkdGgiLCJvZmZzZXRIZWlnaHQiLCJoYXNQb2ludGVyIiwiUG9pbnRlckV2ZW50IiwiTVNQb2ludGVyRXZlbnQiLCJoYXNUb3VjaCIsImdldFRvdWNoQWN0aW9uIiwiZXZlbnRQYXNzdGhyb3VnaCIsImFkZFBpbmNoIiwidG91Y2hBY3Rpb24iLCJhZGRFdmVudCIsInR5cGUiLCJmbiIsImNhcHR1cmUiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnQiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwicHJlZml4UG9pbnRlckV2ZW50IiwicG9pbnRlckV2ZW50IiwiZXZlbnRUeXBlIiwicHJldmVudERlZmF1bHRFeGNlcHRpb24iLCJleGNlcHRpb25zIiwibW9tZW50dW0iLCJjdXJyZW50Iiwic3RhcnQiLCJ0aW1lIiwibG93ZXJNYXJnaW4iLCJ3cmFwcGVyU2l6ZSIsImRlY2VsZXJhdGlvbiIsImRpc3RhbmNlIiwic3BlZWQiLCJhYnMiLCJkZXN0aW5hdGlvbiIsImR1cmF0aW9uIiwidW5kZWZpbmVkIiwicm91bmQiLCJyQUYiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ3ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJtb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJvUmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwibXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJjYWxsYmFjayIsInNldFRpbWVvdXQiLCJJc2Nyb2xsIiwiZWxlbSIsIm9wdGlvbnMiLCJ3cmFwcGVyIiwicXVlcnlTZWxlY3RvciIsInNjcm9sbGVyIiwiY2hpbGRyZW4iLCJzY3JvbGxlclN0eWxlIiwib25tb3VzZWRvd24iLCJ0YWdOYW1lIiwic2Nyb2xsWSIsInNjcm9sbFgiLCJmcmVlU2Nyb2xsIiwiZGlyZWN0aW9uTG9ja1RocmVzaG9sZCIsImJvdW5jZUVhc2luZyIsImNpcmN1bGFyIiwicmVzaXplUG9sbGluZyIsIngiLCJ5IiwiZGlyZWN0aW9uWCIsImRpcmVjdGlvblkiLCJfZXZlbnRzIiwiX2luaXQiLCJyZWZyZXNoIiwic2Nyb2xsVG8iLCJzdGFydFgiLCJzdGFydFkiLCJlbmFibGUiLCJwcm90b3R5cGUiLCJfaW5pdEV2ZW50cyIsInJlbW92ZSIsInRhcmdldCIsImJpbmRUb1dyYXBwZXIiLCJjbGljayIsImRpc2FibGVNb3VzZSIsImRpc2FibGVQb2ludGVyIiwiZGlzYWJsZVRvdWNoIiwiX3N0YXJ0IiwiX21vdmUiLCJfZW5kIiwiX3Jlc2l6ZSIsIl90cmFuc2l0aW9uRW5kIiwibG9nIiwiYnV0dG9uIiwid2hpY2giLCJlbmFibGVkIiwiaW5pdGlhdGVkIiwicHJldmVudERlZmF1bHQiLCJwb2ludCIsInRvdWNoZXMiLCJwb3MiLCJtb3ZlZCIsImRpc3RYIiwiZGlzdFkiLCJkaXJlY3Rpb25Mb2NrZWQiLCJzdGFydFRpbWUiLCJ1c2VUcmFuc2l0aW9uIiwiaXNJblRyYW5zaXRpb24iLCJfdHJhbnNpdGlvblRpbWUiLCJnZXRDb21wdXRlZFBvc2l0aW9uIiwiX3RyYW5zbGF0ZSIsIl9leGVjRXZlbnQiLCJpc0FuaW1hdGluZyIsImFic1N0YXJ0WCIsImFic1N0YXJ0WSIsInBvaW50WCIsInBhZ2VYIiwicG9pbnRZIiwicGFnZVkiLCJkZWx0YVgiLCJ0aW1lc3RhbXAiLCJuZXdYIiwibmV3WSIsImFic0Rpc3RYIiwiYWJzRGlzdFkiLCJkZWx0YVkiLCJlbmRUaW1lIiwiaGFzSG9yaXpvbnRhbFNjcm9sbCIsImhhc1ZlcnRpY2FsU2Nyb2xsIiwibWF4U2Nyb2xsWCIsImJvdW5jZSIsIm1heFNjcm9sbFkiLCJjaGFuZ2VkVG91Y2hlcyIsIm1vbWVudHVtWCIsIm1vbWVudHVtWSIsImRpc3RhbmNlWCIsImRpc3RhbmNlWSIsImVhc2luZyIsInJlc2V0UG9zaXRpb24iLCJib3VuY2VUaW1lIiwidGFwIiwiZmxpY2siLCJ3cmFwcGVyV2lkdGgiLCJ3cmFwcGVySGVpZ2h0IiwibWF4Iiwic25hcCIsInF1YWRyYXRpYyIsInRoYXQiLCJyZXNpemVUaW1lb3V0IiwicHVzaCIsImluZGV4IiwiaW5kZXhPZiIsInNwbGljZSIsImFwcGx5Iiwic2xpY2UiLCJjYWxsIiwiYXJndW1lbnRzIiwibWF0cml4IiwiZ2V0Q29tcHV0ZWRTdHlsZSIsInVzZVRyYW5zZm9ybSIsInN0eWxlVXRpbHMiLCJzcGxpdCIsInJlcGxhY2UiLCJ0cmFuc2l0aW9uVHlwZSIsIl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJfYW5pbWF0ZSIsIm9mZnNldFgiLCJvZmZzZXRZIiwibm9kZVR5cGUiLCJvZmZzZXRVdGlscyIsIndyYXBwZXJPZmZzZXQiLCJlbFJlY3QiLCJ3cmFwcGVyUmVjdCIsImVhc2luZ1N0eWxlIiwidHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIiwiZHVyYXRpb25Qcm9wIiwidHJhbnNpdGlvbkR1cmF0aW9uIiwic2VsZiIsImRlc3RYIiwiZGVzdFkiLCJlYXNpbmdGbiIsImRlc3RUaW1lIiwic3RlcCIsImNsaWVudFdpZHRoIiwiY2xpZW50SGVpZ2h0Iiwic2Nyb2xsZXJXaWR0aCIsInNjcm9sbGVySGVpZ2h0Il0sIm1hcHBpbmdzIjoiQUFBQSxJQUFJQSxVQUFVO2FBQ0Q7V0FDRixzQ0FERTtRQUVMLFVBQVVDLENBQVYsRUFBYTthQUNSQSxLQUFLLElBQUlBLENBQVQsQ0FBUDs7R0FKUTtZQU9GO1dBQ0QsaUNBREM7UUFFSixVQUFVQSxDQUFWLEVBQWE7YUFDUkMsS0FBS0MsSUFBTCxDQUFVLElBQUssRUFBRUYsQ0FBRixHQUFNQSxDQUFyQixDQUFQOztHQVZRO1FBYU47V0FDRyx5Q0FESDtRQUVBLFVBQVVBLENBQVYsRUFBYTtVQUNYRyxJQUFJLENBQVI7YUFDTyxDQUFDSCxJQUFJQSxJQUFJLENBQVQsSUFBY0EsQ0FBZCxJQUFtQixDQUFDRyxJQUFJLENBQUwsSUFBVUgsQ0FBVixHQUFjRyxDQUFqQyxJQUFzQyxDQUE3Qzs7R0FqQlE7VUFvQko7V0FDQyxFQUREO1FBRUYsVUFBVUgsQ0FBVixFQUFhO1VBQ1gsQ0FBQ0EsS0FBSyxDQUFOLElBQVksSUFBSSxJQUFwQixFQUEyQjtlQUNsQixTQUFTQSxDQUFULEdBQWFBLENBQXBCO09BREYsTUFFTyxJQUFJQSxJQUFLLElBQUksSUFBYixFQUFvQjtlQUNsQixVQUFVQSxLQUFNLE1BQU0sSUFBdEIsSUFBK0JBLENBQS9CLEdBQW1DLElBQTFDO09BREssTUFFQSxJQUFJQSxJQUFLLE1BQU0sSUFBZixFQUFzQjtlQUNwQixVQUFVQSxLQUFNLE9BQU8sSUFBdkIsSUFBZ0NBLENBQWhDLEdBQW9DLE1BQTNDO09BREssTUFFQTtlQUNFLFVBQVVBLEtBQU0sUUFBUSxJQUF4QixJQUFpQ0EsQ0FBakMsR0FBcUMsUUFBNUM7OztHQTlCTTtXQWtDSDtXQUNBLEVBREE7UUFFSCxVQUFVQSxDQUFWLEVBQWE7VUFDWEksSUFBSSxJQUFSO1VBQ0VDLElBQUksR0FETjs7VUFH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

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

export default Iscroll;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5tb2R1bGUuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9lYXNpbmdzLmpzIiwiLi4vc3JjL3V0aWxzL3N0eWxlLmpzIiwiLi4vc3JjL3V0aWxzL2lzQmFkQW5kcm9pZC5qcyIsIi4uL3NyYy91dGlscy9nZXRUaW1lLmpzIiwiLi4vc3JjL3V0aWxzL29mZnNldC5qcyIsIi4uL3NyYy91dGlscy9nZXRSZWN0LmpzIiwiLi4vc3JjL3V0aWxzL2RldGVjdG9yLmpzIiwiLi4vc3JjL3V0aWxzL2dldFRvdWNoQWN0aW9uLmpzIiwiLi4vc3JjL3V0aWxzL2V2ZW50SGFuZGxlci5qcyIsIi4uL3NyYy91dGlscy9wcmVmaXhQb2ludGVyRXZlbnQuanMiLCIuLi9zcmMvdXRpbHMvZXZlbnRUeXBlLmpzIiwiLi4vc3JjL3V0aWxzL3ByZXZlbnREZWZhdWx0RXhjZXB0aW9uLmpzIiwiLi4vc3JjL3V0aWxzL21vbWVudHVtLmpzIiwiLi4vc3JjL215LWlzY3JvbGwuanMiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIGVhc2luZ3MgPSB7XG4gIHF1YWRyYXRpYzoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBrICogKDIgLSBrKTtcbiAgICB9XG4gIH0sXG4gIGNpcmN1bGFyOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xLCAwLjU3LCAwLjEsIDEpJyxcdC8vIE5vdCBwcm9wZXJseSBcImNpcmN1bGFyXCIgYnV0IHRoaXMgbG9va3MgYmV0dGVyLCBpdCBzaG91bGQgYmUgKDAuMDc1LCAwLjgyLCAwLjE2NSwgMSlcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoMSAtICgtLWsgKiBrKSk7XG4gICAgfVxuICB9LFxuICBiYWNrOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xNzUsIDAuODg1LCAwLjMyLCAxLjI3NSknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGIgPSA0O1xuICAgICAgcmV0dXJuIChrID0gayAtIDEpICogayAqICgoYiArIDEpICogayArIGIpICsgMTtcbiAgICB9XG4gIH0sXG4gIGJvdW5jZToge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIGlmICgoayAvPSAxKSA8ICgxIC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIGsgKiBrO1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDEuNSAvIDIuNzUpKSAqIGsgKyAwLjc1O1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIuNSAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi4yNSAvIDIuNzUpKSAqIGsgKyAwLjkzNzU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuNjI1IC8gMi43NSkpICogayArIDAuOTg0Mzc1O1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZWxhc3RpYzoge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciBmID0gMC4yMixcbiAgICAgICAgZSA9IDAuNDtcblxuICAgICAgaWYgKGsgPT09IDApIHsgcmV0dXJuIDA7IH1cbiAgICAgIGlmIChrID09IDEpIHsgcmV0dXJuIDE7IH1cblxuICAgICAgcmV0dXJuIChlICogTWF0aC5wb3coMiwgLSAxMCAqIGspICogTWF0aC5zaW4oKGsgLSBmIC8gNCkgKiAoMiAqIE1hdGguUEkpIC8gZikgKyAxKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGVhc2luZ3M7IiwidmFyIF9lbGVtZW50U3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKS5zdHlsZTtcblxudmFyIF92ZW5kb3IgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgdmVuZG9ycyA9IFsndCcsICd3ZWJraXRUJywgJ01velQnLCAnbXNUJywgJ09UJ10sXG4gICAgdHJhbnNmb3JtLFxuICAgIGkgPSAwLFxuICAgIGwgPSB2ZW5kb3JzLmxlbmd0aDtcblxuICB3aGlsZSAoaSA8IGwpIHtcbiAgICB0cmFuc2Zvcm0gPSB2ZW5kb3JzW2ldICsgJ3JhbnNmb3JtJztcbiAgICBpZiAodHJhbnNmb3JtIGluIF9lbGVtZW50U3R5bGUpIHtcbiAgICAgIHJldHVybiB2ZW5kb3JzW2ldLnN1YnN0cigwLCB2ZW5kb3JzW2ldLmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICBpKys7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59KSgpO1xuXG5mdW5jdGlvbiBfcHJlZml4U3R5bGUgKHN0eWxlKSB7XG4gIGlmICggX3ZlbmRvciA9PT0gZmFsc2UgKSByZXR1cm4gZmFsc2U7IC8vIG5vIHZlbmRvciBmb3VuZFxuICBpZiAoIF92ZW5kb3IgPT09ICcnICkgcmV0dXJuIHN0eWxlOyAvLyBubyBwcmVmaXggbmVlZGVkXG4gIHJldHVybiBfdmVuZG9yICsgc3R5bGUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHlsZS5zdWJzdHIoMSk7IC8vIG90aGVyd2lzZSBhZGQgcHJlZml4XG59XG5cbi8vIHN0eWxlIHRoYXQgaGFzIHZlbmRvciBwcmVmaXgsIGVnOiB3ZWJraXRUcmFuc2Zvcm1cbnZhciBzdHlsZSA9IHtcbiAgdHJhbnNmb3JtOiBfcHJlZml4U3R5bGUoJ3RyYW5zZm9ybScpLFxuICB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uJyksXG4gIHRyYW5zaXRpb25EdXJhdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uRHVyYXRpb24nKSxcbiAgdHJhbnNpdGlvbkRlbGF5OiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EZWxheScpLFxuICB0cmFuc2Zvcm1PcmlnaW46IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtT3JpZ2luJyksXG4gIHRvdWNoQWN0aW9uOiBfcHJlZml4U3R5bGUoJ3RvdWNoQWN0aW9uJylcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHN0eWxlOyIsInZhciBpc0JhZEFuZHJvaWQgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgYXBwVmVyc2lvbiA9IHdpbmRvdy5uYXZpZ2F0b3IuYXBwVmVyc2lvbjtcblxuICBpZiAoL0FuZHJvaWQvLnRlc3QoYXBwVmVyc2lvbikgJiYgISgvQ2hyb21lXFwvXFxkLy50ZXN0KGFwcFZlcnNpb24pKSkge1xuICAgIHZhciBzYWZhcmlWZXJzaW9uID0gYXBwVmVyc2lvbi5tYXRjaCgvU2FmYXJpXFwvKFxcZCsuXFxkKS8pO1xuICAgIGlmKHNhZmFyaVZlcnNpb24gJiYgdHlwZW9mIHNhZmFyaVZlcnNpb24gPT09IFwib2JqZWN0XCIgJiYgc2FmYXJpVmVyc2lvbi5sZW5ndGggPj0gMikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoc2FmYXJpVmVyc2lvblsxXSkgPCA1MzUuMTk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzQmFkQW5kcm9pZDsiLCIvKipcbiAqIDEuIERhdGUucHJvdG90eXBlLmdldFRpbWUgaGFzIEJFVFRFUiBjb21wYXRpYmlsaXR5IHRoYW4gRGF0ZS5ub3dcbiAqIHJlZmVyZW5jZTogXG4gKiAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9nZXRUaW1lI0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0RhdGUvbm93I0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICogXG4gKiAyLiBEYXRlLnByb3RvdHlwZS5nZXRUaW1lIHNwZWVkIGlzIFNMT1dTRVIgdGhhbiBEYXRlLm5vd1xuICogcmVmZXJlbmNlOlxuICogIGh0dHBzOi8vanNwZXJmLmNvbS9kYXRlLW5vdy12cy1kYXRlLWdldHRpbWUvN1xuICovXG5cbnZhciBnZXRUaW1lID0gRGF0ZS5ub3cgfHxcbiAgZnVuY3Rpb24gZ2V0VGltZSgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbmV4cG9ydCBkZWZhdWx0IGdldFRpbWU7IiwidmFyIG9mZnNldCA9IGZ1bmN0aW9uIChlbCkge1xuICB2YXIgbGVmdCA9IC1lbC5vZmZzZXRMZWZ0LFxuICB0b3AgPSAtZWwub2Zmc2V0VG9wO1xuXG4gIC8qKlxuICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvSFRNTEVsZW1lbnQvb2Zmc2V0UGFyZW50XG4gICAqIFJldHVybnMgbnVsbCB3aGVuIHRoZSBlbGVtZW50IGhhcyBzdHlsZS5kaXNwbGF5IHNldCB0byBcIm5vbmVcIi4gVGhlIG9mZnNldFBhcmVudCBcbiAgICogaXMgdXNlZnVsIGJlY2F1c2Ugb2Zmc2V0VG9wIGFuZCBvZmZzZXRMZWZ0IGFyZSByZWxhdGl2ZSB0byBpdHMgcGFkZGluZyBlZGdlLlxuICAgKi9cbiAgd2hpbGUgKGVsID0gZWwub2Zmc2V0UGFyZW50KSB7XG4gICAgbGVmdCAtPSBlbC5vZmZzZXRMZWZ0O1xuICAgIHRvcCAtPSBlbC5vZmZzZXRUb3A7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGxlZnQ6IGxlZnQsXG4gICAgdG9wOiB0b3BcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgb2Zmc2V0OyIsImZ1bmN0aW9uIGdldFJlY3QoZWwpIHtcbiAgaWYgKGVsIGluc3RhbmNlb2YgU1ZHRWxlbWVudCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wIDogcmVjdC50b3AsXG4gICAgICBsZWZ0IDogcmVjdC5sZWZ0LFxuICAgICAgd2lkdGggOiByZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0IDogcmVjdC5oZWlnaHRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcCA6IGVsLm9mZnNldFRvcCxcbiAgICAgIGxlZnQgOiBlbC5vZmZzZXRMZWZ0LFxuICAgICAgd2lkdGggOiBlbC5vZmZzZXRXaWR0aCxcbiAgICAgIGhlaWdodCA6IGVsLm9mZnNldEhlaWdodFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZ2V0UmVjdDsiLCJ2YXIgaGFzUG9pbnRlciA9ICEhKHdpbmRvdy5Qb2ludGVyRXZlbnQgfHwgd2luZG93Lk1TUG9pbnRlckV2ZW50KTsgLy8gSUUxMCBpcyBwcmVmaXhlZFxudmFyIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93O1xuXG5leHBvcnQge1xuICBoYXNQb2ludGVyLFxuICBoYXNUb3VjaFxufSIsInZhciBnZXRUb3VjaEFjdGlvbiA9IGZ1bmN0aW9uIChldmVudFBhc3N0aHJvdWdoLCBhZGRQaW5jaCkge1xuICB2YXIgdG91Y2hBY3Rpb24gPSAnbm9uZSc7XG4gIGlmIChldmVudFBhc3N0aHJvdWdoID09PSAndmVydGljYWwnKSB7XG4gICAgdG91Y2hBY3Rpb24gPSAncGFuLXknO1xuICB9IGVsc2UgaWYgKGV2ZW50UGFzc3Rocm91Z2ggPT09ICdob3Jpem9udGFsJykge1xuICAgIHRvdWNoQWN0aW9uID0gJ3Bhbi14JztcbiAgfVxuXG4gIGlmIChhZGRQaW5jaCAmJiB0b3VjaEFjdGlvbiAhPSAnbm9uZScpIHtcbiAgICAvLyBhZGQgcGluY2gtem9vbSBzdXBwb3J0IGlmIHRoZSBicm93c2VyIHN1cHBvcnRzIGl0LCBidXQgaWYgbm90IChlZy4gQ2hyb21lIDw1NSkgZG8gbm90aGluZ1xuICAgIHRvdWNoQWN0aW9uICs9ICcgcGluY2gtem9vbSc7XG4gIH1cbiAgcmV0dXJuIHRvdWNoQWN0aW9uO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRUb3VjaEFjdGlvbjsiLCJmdW5jdGlvbiBhZGRFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59O1xuXG5mdW5jdGlvbiByZW1vdmVFdmVudCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJlKSB7XG4gIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgZm4sICEhY2FwdHVyZSk7XG59XG5cbmV4cG9ydCB7XG4gIGFkZEV2ZW50LFxuICByZW1vdmVFdmVudFxufTsiLCJmdW5jdGlvbiBwcmVmaXhQb2ludGVyRXZlbnQgKHBvaW50ZXJFdmVudCkge1xuICByZXR1cm4gd2luZG93Lk1TUG9pbnRlckV2ZW50ID8gXG4gICAgJ01TUG9pbnRlcicgKyBwb2ludGVyRXZlbnQuY2hhckF0KDcpLnRvVXBwZXJDYXNlKCkgKyBwb2ludGVyRXZlbnQuc3Vic3RyKDgpIDpcbiAgICBwb2ludGVyRXZlbnQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHByZWZpeFBvaW50ZXJFdmVudDsiLCJ2YXIgZXZlbnRUeXBlID0ge1xuICB0b3VjaHN0YXJ0OiAxLFxuICB0b3VjaG1vdmU6IDEsXG4gIHRvdWNoZW5kOiAxLFxuXG4gIG1vdXNlZG93bjogMixcbiAgbW91c2Vtb3ZlOiAyLFxuICBtb3VzZXVwOiAyLFxuXG4gIHBvaW50ZXJkb3duOiAzLFxuICBwb2ludGVybW92ZTogMyxcbiAgcG9pbnRlcnVwOiAzLFxuXG4gIE1TUG9pbnRlckRvd246IDMsXG4gIE1TUG9pbnRlck1vdmU6IDMsXG4gIE1TUG9pbnRlclVwOiAzXG59O1xuXG5leHBvcnQgZGVmYXVsdCBldmVudFR5cGU7IiwidmFyIHByZXZlbnREZWZhdWx0RXhjZXB0aW9uID0gZnVuY3Rpb24gKGVsLCBleGNlcHRpb25zKSB7XG4gIGZvciAodmFyIGkgaW4gZXhjZXB0aW9ucykge1xuICAgIGlmICggZXhjZXB0aW9uc1tpXS50ZXN0KGVsW2ldKSApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHByZXZlbnREZWZhdWx0RXhjZXB0aW9uOyIsInZhciBtb21lbnR1bSA9IGZ1bmN0aW9uIChjdXJyZW50LCBzdGFydCwgdGltZSwgbG93ZXJNYXJnaW4sIHdyYXBwZXJTaXplLCBkZWNlbGVyYXRpb24pIHtcbiAgdmFyIGRpc3RhbmNlID0gY3VycmVudCAtIHN0YXJ0LFxuICAgIHNwZWVkID0gTWF0aC5hYnMoZGlzdGFuY2UpIC8gdGltZSxcbiAgICBkZXN0aW5hdGlvbixcbiAgICBkdXJhdGlvbjtcblxuICBkZWNlbGVyYXRpb24gPSBkZWNlbGVyYXRpb24gPT09IHVuZGVmaW5lZCA/IDAuMDAwNiA6IGRlY2VsZXJhdGlvbjtcblxuICBkZXN0aW5hdGlvbiA9IGN1cnJlbnQgKyAoIHNwZWVkICogc3BlZWQgKSAvICggMiAqIGRlY2VsZXJhdGlvbiApICogKCBkaXN0YW5jZSA8IDAgPyAtMSA6IDEgKTtcbiAgZHVyYXRpb24gPSBzcGVlZCAvIGRlY2VsZXJhdGlvbjtcblxuICBpZiAoIGRlc3RpbmF0aW9uIDwgbG93ZXJNYXJnaW4gKSB7XG4gICAgZGVzdGluYXRpb24gPSB3cmFwcGVyU2l6ZSA/IGxvd2VyTWFyZ2luIC0gKCB3cmFwcGVyU2l6ZSAvIDIuNSAqICggc3BlZWQgLyA4ICkgKSA6IGxvd2VyTWFyZ2luO1xuICAgIGRpc3RhbmNlID0gTWF0aC5hYnMoZGVzdGluYXRpb24gLSBjdXJyZW50KTtcbiAgICBkdXJhdGlvbiA9IGRpc3RhbmNlIC8gc3BlZWQ7XG4gIH0gZWxzZSBpZiAoIGRlc3RpbmF0aW9uID4gMCApIHtcbiAgICBkZXN0aW5hdGlvbiA9IHdyYXBwZXJTaXplID8gd3JhcHBlclNpemUgLyAyLjUgKiAoIHNwZWVkIC8gOCApIDogMDtcbiAgICBkaXN0YW5jZSA9IE1hdGguYWJzKGN1cnJlbnQpICsgZGVzdGluYXRpb247XG4gICAgZHVyYXRpb24gPSBkaXN0YW5jZSAvIHNwZWVkO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBkZXN0aW5hdGlvbjogTWF0aC5yb3VuZChkZXN0aW5hdGlvbiksXG4gICAgZHVyYXRpb246IGR1cmF0aW9uXG4gIH07XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1vbWVudHVtOyIsImltcG9ydCBlYXNpbmdzIGZyb20gJy4vdXRpbHMvZWFzaW5ncyc7XG5pbXBvcnQgc3R5bGVVdGlscyBmcm9tICcuL3V0aWxzL3N0eWxlJztcbmltcG9ydCBpc0JhZEFuZHJvaWQgZnJvbSAnLi91dGlscy9pc0JhZEFuZHJvaWQnO1xuaW1wb3J0IGdldFRpbWUgZnJvbSAnLi91dGlscy9nZXRUaW1lJztcbmltcG9ydCBvZmZzZXRVdGlscyBmcm9tICcuL3V0aWxzL29mZnNldCc7XG5pbXBvcnQgZ2V0UmVjdCBmcm9tICcuL3V0aWxzL2dldFJlY3QnO1xuaW1wb3J0IHsgaGFzUG9pbnRlciwgaGFzVG91Y2ggfSBmcm9tICcuL3V0aWxzL2RldGVjdG9yJztcbmltcG9ydCBnZXRUb3VjaEFjdGlvbiBmcm9tICcuL3V0aWxzL2dldFRvdWNoQWN0aW9uJztcbmltcG9ydCB7IGFkZEV2ZW50LCByZW1vdmVFdmVudCB9IGZyb20gJy4vdXRpbHMvZXZlbnRIYW5kbGVyJztcbmltcG9ydCBwcmVmaXhQb2ludGVyRXZlbnQgZnJvbSAnLi91dGlscy9wcmVmaXhQb2ludGVyRXZlbnQnO1xuaW1wb3J0IGV2ZW50VHlwZSBmcm9tICcuL3V0aWxzL2V2ZW50VHlwZSc7XG5pbXBvcnQgcHJldmVudERlZmF1bHRFeGNlcHRpb24gZnJvbSAnLi91dGlscy9wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbic7XG5pbXBvcnQgbW9tZW50dW0gZnJvbSAnLi91dGlscy9tb21lbnR1bSc7XG5cbi8vIGRlYWwgd2l0aCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgY29tcGF0YmlsaXR5XG52YXIgckFGID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGZ1bmN0aW9uIChjYWxsYmFjaykgeyB3aW5kb3cuc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTsgfTtcblxuZnVuY3Rpb24gSXNjcm9sbChlbGVtLCBvcHRpb25zKSB7XG4gIC8qKlxuICAgKiBnZXQgc2Nyb2xsIG5vZGUgZWxlbWVudFxuICAgKi9cbiAgdGhpcy53cmFwcGVyID0gdHlwZW9mIGVsZW0gPT09ICdzdHJpbmcnID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtKSA6IGVsZW07XG4gIHRoaXMuc2Nyb2xsZXIgPSB0aGlzLndyYXBwZXIuY2hpbGRyZW5bMF07XG4gIHRoaXMuc2Nyb2xsZXJTdHlsZSA9IHRoaXMuc2Nyb2xsZXIuc3R5bGU7XG5cbiAgLyoqXG4gICAqIG1lcmdlIGRlZmF1bHQgb3B0aW9ucyBhbmQgY3VzdG9taXplZCBvcHRpb25zXG4gICAqL1xuICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgZGlzYWJsZVBvaW50ZXI6ICFoYXNQb2ludGVyLFxuICAgIGRpc2FibGVUb3VjaDogaGFzUG9pbnRlciB8fCAhaGFzVG91Y2gsXG4gICAgZGlzYWJsZU1vdXNlOiBoYXNQb2ludGVyIHx8ICFoYXNUb3VjaCxcbiAgICB1c2VUcmFuc2l0aW9uOiB0cnVlLFxuICAgIHVzZVRyYW5zZm9ybTogdHJ1ZSxcbiAgICBzY3JvbGxZOiB0cnVlLFxuICAgIHN0YXJ0WDogMCxcbiAgICBzdGFydFk6IDAsXG4gICAgYmluZFRvV3JhcHBlcjogdHlwZW9mIHdpbmRvdy5vbm1vdXNlZG93biA9PT0gXCJ1bmRlZmluZWRcIixcbiAgICBwcmV2ZW50RGVmYXVsdDogdHJ1ZSxcbiAgICBwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbjogeyB0YWdOYW1lOiAvXihJTlBVVHxURVhUQVJFQXxCVVRUT058U0VMRUNUKSQvIH0sXG4gICAgZGlyZWN0aW9uTG9ja1RocmVzaG9sZDogNSxcbiAgICBib3VuY2U6IHRydWUsXG4gICAgYm91bmNlVGltZTogNjAwLFxuICAgIGJvdW5jZUVhc2luZzogJycsXG4gICAgbW9tZW50dW06IHRydWVcbiAgfTtcblxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnNbaV0gPSBvcHRpb25zW2ldO1xuICB9XG5cbiAgdGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PT0gdHJ1ZSA/ICd2ZXJ0aWNhbCcgOiB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaDtcblxuICAvLyBJZiB5b3Ugd2FudCBldmVudFBhc3N0aHJvdWdoIEkgaGF2ZSB0byBsb2NrIG9uZSBvZiB0aGUgYXhlc1xuICB0aGlzLm9wdGlvbnMuc2Nyb2xsWSA9IHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09PSAndmVydGljYWwnID8gZmFsc2UgOiB0aGlzLm9wdGlvbnMuc2Nyb2xsWTtcbiAgdGhpcy5vcHRpb25zLnNjcm9sbFggPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PT0gJ2hvcml6b250YWwnID8gZmFsc2UgOiB0aGlzLm9wdGlvbnMuc2Nyb2xsWDtcblxuICB0aGlzLm9wdGlvbnMuZnJlZVNjcm9sbCA9IHRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsICYmICF0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaDtcbiAgdGhpcy5vcHRpb25zLmRpcmVjdGlvbkxvY2tUaHJlc2hvbGQgPSB0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA/IDAgOiB0aGlzLm9wdGlvbnMuZGlyZWN0aW9uTG9ja1RocmVzaG9sZDtcblxuICB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nID0gdHlwZW9mIHRoaXMub3B0aW9ucy5ib3VuY2VFYXNpbmcgPT0gJ3N0cmluZycgP1xuICAgIGVhc2luZ3NbdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZ10gfHwgZWFzaW5ncy5jaXJjdWxhciA6XG4gICAgdGhpcy5vcHRpb25zLmJvdW5jZUVhc2luZztcblxuICB0aGlzLnggPSAwO1xuICB0aGlzLnkgPSAwO1xuXHR0aGlzLmRpcmVjdGlvblggPSAwO1xuXHR0aGlzLmRpcmVjdGlvblkgPSAwO1xuXHR0aGlzLl9ldmVudHMgPSB7fTtcblxuICB0aGlzLl9pbml0KCk7XG4gIHRoaXMucmVmcmVzaCgpO1xuICB0aGlzLnNjcm9sbFRvKHRoaXMub3B0aW9ucy5zdGFydFgsIHRoaXMub3B0aW9ucy5zdGFydFkpO1xuICB0aGlzLmVuYWJsZSgpO1xufVxuXG5Jc2Nyb2xsLnByb3RvdHlwZSA9IHtcblxuICBfaW5pdDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2luaXRFdmVudHMoKTtcbiAgfSxcblxuICBfaW5pdEV2ZW50czogZnVuY3Rpb24gKHJlbW92ZSkge1xuICAgIHZhciBldmVudFR5cGUgPSByZW1vdmUgPyByZW1vdmVFdmVudCA6IGFkZEV2ZW50LFxuICAgICAgdGFyZ2V0ID0gdGhpcy5vcHRpb25zLmJpbmRUb1dyYXBwZXIgPyB0aGlzLndyYXBwZXIgOiB3aW5kb3c7XG5cbiAgICBldmVudFR5cGUod2luZG93LCAnb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzKTtcbiAgICBldmVudFR5cGUod2luZG93LCAncmVzaXplJywgdGhpcyk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCAnY2xpY2snLCB0aGlzLCB0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlTW91c2UpIHtcbiAgICAgIGV2ZW50VHlwZSh0aGlzLndyYXBwZXIsICdtb3VzZWRvd24nLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICdtb3VzZW1vdmUnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICdtb3VzZWNhbmNlbCcsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ21vdXNldXAnLCB0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAoaGFzUG9pbnRlciAmJiAhdGhpcy5vcHRpb25zLmRpc2FibGVQb2ludGVyKSB7XG4gICAgICBldmVudFR5cGUodGhpcy53cmFwcGVyLCBwcmVmaXhQb2ludGVyRXZlbnQoJ3BvaW50ZXJkb3duJyksIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgcHJlZml4UG9pbnRlckV2ZW50KCdwb2ludGVybW92ZScpLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsIHByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcmNhbmNlbCcpLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsIHByZWZpeFBvaW50ZXJFdmVudCgncG9pbnRlcnVwJyksIHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChoYXNUb3VjaCAmJiAhdGhpcy5vcHRpb25zLmRpc2FibGVUb3VjaCkge1xuICAgICAgZXZlbnRUeXBlKHRoaXMud3JhcHBlciwgJ3RvdWNoc3RhcnQnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICd0b3VjaG1vdmUnLCB0aGlzKTtcbiAgICAgIGV2ZW50VHlwZSh0YXJnZXQsICd0b3VjaGNhbmNlbCcsIHRoaXMpO1xuICAgICAgZXZlbnRUeXBlKHRhcmdldCwgJ3RvdWNoZW5kJywgdGhpcyk7XG4gICAgfVxuXG4gICAgZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICd0cmFuc2l0aW9uZW5kJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICd3ZWJraXRUcmFuc2l0aW9uRW5kJywgdGhpcyk7XG4gICAgZXZlbnRUeXBlKHRoaXMuc2Nyb2xsZXIsICdvVHJhbnNpdGlvbkVuZCcsIHRoaXMpO1xuICAgIGV2ZW50VHlwZSh0aGlzLnNjcm9sbGVyLCAnTVNUcmFuc2l0aW9uRW5kJywgdGhpcyk7XG4gIH0sXG5cbiAgaGFuZGxlRXZlbnQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ3RvdWNoc3RhcnQnOlxuICAgICAgY2FzZSAncG9pbnRlcmRvd24nOlxuICAgICAgY2FzZSAnTVNQb2ludGVyRG93bic6XG4gICAgICBjYXNlICdtb3VzZWRvd24nOlxuICAgICAgICB0aGlzLl9zdGFydChlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3RvdWNobW92ZSc6XG4gICAgICBjYXNlICdwb2ludGVybW92ZSc6XG4gICAgICBjYXNlICdNU1BvaW50ZXJNb3ZlJzpcbiAgICAgIGNhc2UgJ21vdXNlbW92ZSc6XG4gICAgICAgIHRoaXMuX21vdmUoZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd0b3VjaGVuZCc6XG4gICAgICBjYXNlICdwb2ludGVydXAnOlxuICAgICAgY2FzZSAnTVNQb2ludGVyVXAnOlxuICAgICAgY2FzZSAnbW91c2V1cCc6XG4gICAgICBjYXNlICd0b3VjaGNhbmNlbCc6XG4gICAgICBjYXNlICdwb2ludGVyY2FuY2VsJzpcbiAgICAgIGNhc2UgJ01TUG9pbnRlckNhbmNlbCc6XG4gICAgICBjYXNlICdtb3VzZWNhbmNlbCc6XG4gICAgICAgIHRoaXMuX2VuZChlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9LFxuXG4gIF9zdGFydDogZnVuY3Rpb24gKGUpIHtcbiAgICBjb25zb2xlLmxvZyhlLnR5cGUpO1xuICAgIC8vIFJlYWN0IHRvIGxlZnQgbW91c2UgYnV0dG9uIG9ubHlcbiAgICBpZiAoZXZlbnRUeXBlW2UudHlwZV0gIT09IDEpIHsgLy8gbm90IHRvdWNoIGV2ZW50XG4gICAgICB2YXIgYnV0dG9uO1xuICAgICAgaWYgKCFlLndoaWNoKSB7XG4gICAgICAgIC8qIElFIGNhc2UgKi9cbiAgICAgICAgYnV0dG9uID0gKGUuYnV0dG9uIDwgMikgPyAwIDpcbiAgICAgICAgICAoKGUuYnV0dG9uID09IDQpID8gMSA6IDIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLyogQWxsIG90aGVycyAqL1xuICAgICAgICBidXR0b24gPSBlLmJ1dHRvbjtcbiAgICAgIH1cblxuICAgICAgLy8gbm90IGxlZnQgbW91c2UgYnV0dG9uXG4gICAgICBpZiAoYnV0dG9uICE9PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZW5hYmxlZCB8fCAodGhpcy5pbml0aWF0ZWQgJiYgZXZlbnRUeXBlW2UudHlwZV0gIT09IHRoaXMuaW5pdGlhdGVkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucHJldmVudERlZmF1bHQgJiYgIWlzQmFkQW5kcm9pZCAmJiAhcHJldmVudERlZmF1bHRFeGNlcHRpb24oZS50YXJnZXQsIHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbikpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnQgPSBlLnRvdWNoZXMgPyBlLnRvdWNoZXNbMF0gOiBlLFxuICAgICAgcG9zO1xuXG4gICAgdGhpcy5pbml0aWF0ZWQgPSBldmVudFR5cGVbZS50eXBlXTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5kaXN0WCA9IDA7XG4gICAgdGhpcy5kaXN0WSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25YID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSAwO1xuICAgIHRoaXMuZGlyZWN0aW9uTG9ja2VkID0gMDtcblxuICAgIHRoaXMuc3RhcnRUaW1lID0gZ2V0VGltZSgpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRoaXMuaXNJblRyYW5zaXRpb24pIHtcbiAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1lKCk7XG4gICAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gZmFsc2U7XG4gICAgICBwb3MgPSB0aGlzLmdldENvbXB1dGVkUG9zaXRpb24oKTtcbiAgICAgIHRoaXMuX3RyYW5zbGF0ZShNYXRoLnJvdW5kKHBvcy54KSwgTWF0aC5yb3VuZChwb3MueSkpO1xuICAgICAgLy8gdGhpcy5fZXhlY0V2ZW50KCdzY3JvbGxFbmQnKTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbiAmJiB0aGlzLmlzQW5pbWF0aW5nKSB7XG4gICAgICB0aGlzLmlzQW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuICAgIH1cblxuICAgIHRoaXMuc3RhcnRYID0gdGhpcy54O1xuICAgIHRoaXMuc3RhcnRZID0gdGhpcy55O1xuICAgIHRoaXMuYWJzU3RhcnRYID0gdGhpcy54O1xuICAgIHRoaXMuYWJzU3RhcnRZID0gdGhpcy55O1xuICAgIHRoaXMucG9pbnRYID0gcG9pbnQucGFnZVg7XG4gICAgdGhpcy5wb2ludFkgPSBwb2ludC5wYWdlWTtcblxuICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgnYmVmb3JlU2Nyb2xsU3RhcnQnKTtcbiAgfSxcblxuICBfbW92ZTogZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCB8fCBldmVudFR5cGVbZS50eXBlXSAhPT0gdGhpcy5pbml0aWF0ZWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKDExMSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdCkge1x0Ly8gaW5jcmVhc2VzIHBlcmZvcm1hbmNlIG9uIEFuZHJvaWQ/IFRPRE86IGNoZWNrIVxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIHZhciBwb2ludCA9IGUudG91Y2hlcyA/IGUudG91Y2hlc1swXSA6IGUsXG4gICAgICBkZWx0YVggPSBwb2ludC5wYWdlWCAtIHRoaXMucG9pbnRYLCAvLyB0aGUgbW92ZWQgZGlzdGFuY2VcbiAgICAgIGRlbHRhWSA9IHBvaW50LnBhZ2VZIC0gdGhpcy5wb2ludFksXG4gICAgICB0aW1lc3RhbXAgPSBnZXRUaW1lKCksXG4gICAgICBuZXdYLCBuZXdZLFxuICAgICAgYWJzRGlzdFgsIGFic0Rpc3RZO1xuXG4gICAgdGhpcy5wb2ludFggPSBwb2ludC5wYWdlWDtcbiAgICB0aGlzLnBvaW50WSA9IHBvaW50LnBhZ2VZO1xuXG4gICAgdGhpcy5kaXN0WCArPSBkZWx0YVg7XG4gICAgdGhpcy5kaXN0WSArPSBkZWx0YVk7XG4gICAgYWJzRGlzdFggPSBNYXRoLmFicyh0aGlzLmRpc3RYKTsgLy8gYWJzb2x1dGUgbW92ZWQgZGlzdGFuY2VcbiAgICBhYnNEaXN0WSA9IE1hdGguYWJzKHRoaXMuZGlzdFkpO1xuXG4gICAgLyoqXG4gICAgICogIFdlIG5lZWQgdG8gbW92ZSBhdCBsZWFzdCAxMCBwaXhlbHMgZm9yIHRoZSBzY3JvbGxpbmcgdG8gaW5pdGlhdGVcbiAgICAgKiAgdGhpcy5lbmRUaW1lIGlzIGluaXRpYXRlZCBpbiB0aGlzLnByb3RvdHlwZS5yZWZyZXNoIG1ldGhvZFxuICAgICAqL1xuICAgIGlmICh0aW1lc3RhbXAgLSB0aGlzLmVuZFRpbWUgPiAzMDAgJiYgKGFic0Rpc3RYIDwgMTAgJiYgYWJzRGlzdFkgPCAxMCkpIHtcbiAgICAgIGNvbnNvbGUubG9nKDIyMilcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiB5b3UgYXJlIHNjcm9sbGluZyBpbiBvbmUgZGlyZWN0aW9uIGxvY2sgdGhlIG90aGVyXG4gICAgaWYgKCF0aGlzLmRpcmVjdGlvbkxvY2tlZCAmJiAhdGhpcy5vcHRpb25zLmZyZWVTY3JvbGwpIHtcblxuICAgICAgaWYgKGFic0Rpc3RYID4gYWJzRGlzdFkgKyB0aGlzLm9wdGlvbnMuZGlyZWN0aW9uTG9ja1RocmVzaG9sZCkge1xuICAgICAgICB0aGlzLmRpcmVjdGlvbkxvY2tlZCA9ICdoJztcdFx0Ly8gbG9jayBob3Jpem9udGFsbHlcbiAgICAgIH0gZWxzZSBpZiAoYWJzRGlzdFkgPj0gYWJzRGlzdFggKyB0aGlzLm9wdGlvbnMuZGlyZWN0aW9uTG9ja1RocmVzaG9sZCkge1xuICAgICAgICB0aGlzLmRpcmVjdGlvbkxvY2tlZCA9ICd2JztcdFx0Ly8gbG9jayB2ZXJ0aWNhbGx5XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRpcmVjdGlvbkxvY2tlZCA9ICduJztcdFx0Ly8gbm8gbG9ja1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZGlyZWN0aW9uTG9ja2VkID09ICdoJykge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoID09ICd2ZXJ0aWNhbCcpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuZXZlbnRQYXNzdGhyb3VnaCA9PSAnaG9yaXpvbnRhbCcpIHtcbiAgICAgICAgdGhpcy5pbml0aWF0ZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBkZWx0YVkgPSAwO1xuICAgIH0gZWxzZSBpZiAodGhpcy5kaXJlY3Rpb25Mb2NrZWQgPT0gJ3YnKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ2hvcml6b250YWwnKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2ggPT0gJ3ZlcnRpY2FsJykge1xuICAgICAgICB0aGlzLmluaXRpYXRlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGRlbHRhWCA9IDA7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHRoaXMuaGFzVmVydGljYWxTY3JvbGwsIGRlbHRhWSk7XG4gICAgZGVsdGFYID0gdGhpcy5oYXNIb3Jpem9udGFsU2Nyb2xsID8gZGVsdGFYIDogMDtcbiAgICBkZWx0YVkgPSB0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsID8gZGVsdGFZIDogMDtcblxuICAgIG5ld1ggPSB0aGlzLnggKyBkZWx0YVg7XG4gICAgbmV3WSA9IHRoaXMueSArIGRlbHRhWTtcblxuICAgIC8vIFNsb3cgZG93biBpZiBvdXRzaWRlIG9mIHRoZSBib3VuZGFyaWVzXG4gICAgaWYgKG5ld1ggPiAwIHx8IG5ld1ggPCB0aGlzLm1heFNjcm9sbFgpIHtcbiAgICAgIG5ld1ggPSB0aGlzLm9wdGlvbnMuYm91bmNlID8gdGhpcy54ICsgZGVsdGFYIC8gMyA6IG5ld1ggPiAwID8gMCA6IHRoaXMubWF4U2Nyb2xsWDtcbiAgICB9XG4gICAgaWYgKG5ld1kgPiAwIHx8IG5ld1kgPCB0aGlzLm1heFNjcm9sbFkpIHtcbiAgICAgIG5ld1kgPSB0aGlzLm9wdGlvbnMuYm91bmNlID8gdGhpcy55ICsgZGVsdGFZIC8gMyA6IG5ld1kgPiAwID8gMCA6IHRoaXMubWF4U2Nyb2xsWTtcbiAgICB9XG5cbiAgICB0aGlzLmRpcmVjdGlvblggPSBkZWx0YVggPiAwID8gLTEgOiBkZWx0YVggPCAwID8gMSA6IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25ZID0gZGVsdGFZID4gMCA/IC0xIDogZGVsdGFZIDwgMCA/IDEgOiAwO1xuXG4gICAgaWYgKCF0aGlzLm1vdmVkKSB7XG4gICAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbFN0YXJ0Jyk7XG4gICAgfVxuXG4gICAgdGhpcy5tb3ZlZCA9IHRydWU7XG5cbiAgICB0aGlzLl90cmFuc2xhdGUobmV3WCwgbmV3WSk7XG5cbiAgICBpZiAodGltZXN0YW1wIC0gdGhpcy5zdGFydFRpbWUgPiAzMDApIHtcbiAgICAgIHRoaXMuc3RhcnRUaW1lID0gdGltZXN0YW1wO1xuICAgICAgdGhpcy5zdGFydFggPSB0aGlzLng7XG4gICAgICB0aGlzLnN0YXJ0WSA9IHRoaXMueTtcbiAgICB9XG4gIH0sXG5cbiAgX2VuZDogZnVuY3Rpb24gKGUpIHtcblx0XHRpZiAoICF0aGlzLmVuYWJsZWQgfHwgZXZlbnRUeXBlW2UudHlwZV0gIT09IHRoaXMuaW5pdGlhdGVkICkge1xuXHRcdFx0cmV0dXJuO1xuICAgIH1cbiAgICBcblx0XHRpZiAoIHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdCAmJiAhcHJldmVudERlZmF1bHRFeGNlcHRpb24oZS50YXJnZXQsIHRoaXMub3B0aW9ucy5wcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbikgKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIFxuXHRcdHZhciBwb2ludCA9IGUuY2hhbmdlZFRvdWNoZXMgPyBlLmNoYW5nZWRUb3VjaGVzWzBdIDogZSxcbiAgICBtb21lbnR1bVgsXG4gICAgbW9tZW50dW1ZLFxuICAgIGR1cmF0aW9uID0gZ2V0VGltZSgpIC0gdGhpcy5zdGFydFRpbWUsXG4gICAgbmV3WCA9IE1hdGgucm91bmQodGhpcy54KSxcbiAgICBuZXdZID0gTWF0aC5yb3VuZCh0aGlzLnkpLFxuICAgIGRpc3RhbmNlWCA9IE1hdGguYWJzKG5ld1ggLSB0aGlzLnN0YXJ0WCksXG4gICAgZGlzdGFuY2VZID0gTWF0aC5hYnMobmV3WSAtIHRoaXMuc3RhcnRZKSxcbiAgICB0aW1lID0gMCxcbiAgICBlYXNpbmcgPSAnJztcblxuXHRcdHRoaXMuaXNJblRyYW5zaXRpb24gPSAwO1xuXHRcdHRoaXMuaW5pdGlhdGVkID0gMDtcbiAgICB0aGlzLmVuZFRpbWUgPSBnZXRUaW1lKCk7XG4gICAgXG5cdFx0Ly8gcmVzZXQgaWYgd2UgYXJlIG91dHNpZGUgb2YgdGhlIGJvdW5kYXJpZXNcblx0XHRpZiAoIHRoaXMucmVzZXRQb3NpdGlvbih0aGlzLm9wdGlvbnMuYm91bmNlVGltZSkgKSB7XG5cdFx0XHRyZXR1cm47XG4gICAgfVxuICAgIFxuICAgIHRoaXMuc2Nyb2xsVG8obmV3WCwgbmV3WSk7XHQvLyBlbnN1cmVzIHRoYXQgdGhlIGxhc3QgcG9zaXRpb24gaXMgcm91bmRlZFxuXG5cdFx0Ly8gd2Ugc2Nyb2xsZWQgbGVzcyB0aGFuIDEwIHBpeGVsc1xuXHRcdGlmICggIXRoaXMubW92ZWQgKSB7XG5cdFx0XHRpZiAoIHRoaXMub3B0aW9ucy50YXAgKSB7XG5cdFx0XHRcdC8vIHV0aWxzLnRhcChlLCB0aGlzLm9wdGlvbnMudGFwKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCB0aGlzLm9wdGlvbnMuY2xpY2sgKSB7XG5cdFx0XHRcdC8vIHV0aWxzLmNsaWNrKGUpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbENhbmNlbCcpO1xuXHRcdFx0cmV0dXJuO1xuICAgIH1cblxuXHRcdGlmICggdGhpcy5fZXZlbnRzLmZsaWNrICYmIGR1cmF0aW9uIDwgMjAwICYmIGRpc3RhbmNlWCA8IDEwMCAmJiBkaXN0YW5jZVkgPCAxMDAgKSB7XG5cdFx0XHQvLyB0aGlzLl9leGVjRXZlbnQoJ2ZsaWNrJyk7XG5cdFx0XHRyZXR1cm47XG4gICAgfVxuICAgIFxuICAgIC8vIHN0YXJ0IG1vbWVudHVtIGFuaW1hdGlvbiBpZiBuZWVkZWRcbiAgICBpZiAoIHRoaXMub3B0aW9ucy5tb21lbnR1bSAmJiBkdXJhdGlvbiA8IDMwMCApIHtcblx0XHRcdG1vbWVudHVtWCA9IHRoaXMuaGFzSG9yaXpvbnRhbFNjcm9sbCA/IG1vbWVudHVtKHRoaXMueCwgdGhpcy5zdGFydFgsIGR1cmF0aW9uLCB0aGlzLm1heFNjcm9sbFgsIHRoaXMub3B0aW9ucy5ib3VuY2UgPyB0aGlzLndyYXBwZXJXaWR0aCA6IDAsIHRoaXMub3B0aW9ucy5kZWNlbGVyYXRpb24pIDogeyBkZXN0aW5hdGlvbjogbmV3WCwgZHVyYXRpb246IDAgfTtcblx0XHRcdG1vbWVudHVtWSA9IHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPyBtb21lbnR1bSh0aGlzLnksIHRoaXMuc3RhcnRZLCBkdXJhdGlvbiwgdGhpcy5tYXhTY3JvbGxZLCB0aGlzLm9wdGlvbnMuYm91bmNlID8gdGhpcy53cmFwcGVySGVpZ2h0IDogMCwgdGhpcy5vcHRpb25zLmRlY2VsZXJhdGlvbikgOiB7IGRlc3RpbmF0aW9uOiBuZXdZLCBkdXJhdGlvbjogMCB9O1xuXHRcdFx0bmV3WCA9IG1vbWVudHVtWC5kZXN0aW5hdGlvbjtcblx0XHRcdG5ld1kgPSBtb21lbnR1bVkuZGVzdGluYXRpb247XG5cdFx0XHR0aW1lID0gTWF0aC5tYXgobW9tZW50dW1YLmR1cmF0aW9uLCBtb21lbnR1bVkuZHVyYXRpb24pO1xuXHRcdFx0dGhpcy5pc0luVHJhbnNpdGlvbiA9IDE7XG4gICAgfVxuXG4gICAgaWYgKCB0aGlzLm9wdGlvbnMuc25hcCApIHtcbiAgICAgIC8vIGRvIHNvbWV0aW5nXG4gICAgfVxuXG4gICAgaWYgKCBuZXdYICE9IHRoaXMueCB8fCBuZXdZICE9IHRoaXMueSApIHtcbiAgICAgIC8vIGNoYW5nZSBlYXNpbmcgZnVuY3Rpb24gd2hlbiBzY3JvbGxlciBnb2VzIG91dCBvZiB0aGUgYm91bmRhcmllc1xuXHRcdFx0aWYgKCBuZXdYID4gMCB8fCBuZXdYIDwgdGhpcy5tYXhTY3JvbGxYIHx8IG5ld1kgPiAwIHx8IG5ld1kgPCB0aGlzLm1heFNjcm9sbFkgKSB7XG5cdFx0XHRcdGVhc2luZyA9IGVhc2luZ3MucXVhZHJhdGljO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coJ2VuZGVuZGVuZGVuZCEnKTtcblx0XHRcdHRoaXMuc2Nyb2xsVG8obmV3WCwgbmV3WSwgdGltZSwgZWFzaW5nKTtcblx0XHRcdHJldHVybjtcbiAgICB9XG5cbiAgICAvLyB0aGlzLl9leGVjRXZlbnQoJ3Njcm9sbEVuZCcpO1xuICAgIFxuICB9LFxuXG4gIGdldENvbXB1dGVkUG9zaXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbWF0cml4ID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy5zY3JvbGxlciwgbnVsbCksXG4gICAgICB4LCB5O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VUcmFuc2Zvcm0pIHtcbiAgICAgIG1hdHJpeCA9IG1hdHJpeFtzdHlsZVV0aWxzLnRyYW5zZm9ybV0uc3BsaXQoJyknKVswXS5zcGxpdCgnLCAnKTtcbiAgICAgIHggPSArKG1hdHJpeFsxMl0gfHwgbWF0cml4WzRdKTtcbiAgICAgIHkgPSArKG1hdHJpeFsxM10gfHwgbWF0cml4WzVdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZWcuIHRyYW5zZm9ybSAnMHB4JyB0byAwXG4gICAgICB4ID0gK21hdHJpeC5sZWZ0LnJlcGxhY2UoL1teLVxcZC5dL2csICcnKTtcbiAgICAgIHkgPSArbWF0cml4LnRvcC5yZXBsYWNlKC9bXi1cXGQuXS9nLCAnJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgeDogeCwgeTogeSB9O1xuICB9LFxuXG4gIHNjcm9sbFRvOiBmdW5jdGlvbiAoeCwgeSwgdGltZSwgZWFzaW5nKSB7XG4gICAgZWFzaW5nID0gZWFzaW5nIHx8IGVhc2luZ3MuY2lyY3VsYXI7XG4gICAgdGhpcy5pc0luVHJhbnNpdGlvbiA9IHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRpbWUgPiAwO1xuICAgIHZhciB0cmFuc2l0aW9uVHlwZSA9IHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIGVhc2luZy5zdHlsZTtcblxuICAgIGlmICghdGltZSB8fCB0cmFuc2l0aW9uVHlwZSkge1xuICAgICAgaWYgKHRyYW5zaXRpb25UeXBlKSB7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbihlYXNpbmcuc3R5bGUpO1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uVGltZSh0aW1lKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3RyYW5zbGF0ZSh4LCB5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fYW5pbWF0ZSh4LCB5LCB0aW1lLCBlYXNpbmcuZm4pO1xuICAgIH1cbiAgfSxcblxuICBzY3JvbGxUb0VsZW1lbnQ6IGZ1bmN0aW9uIChlbCwgdGltZSwgb2Zmc2V0WCwgb2Zmc2V0WSwgZWFzaW5nKSB7XG4gICAgZWwgPSBlbC5ub2RlVHlwZSA/IGVsIDogdGhpcy5zY3JvbGxlci5xdWVyeVNlbGVjdG9yKGVsKTtcblxuICAgIC8vIGlmIG5vIGVsZW1lbnQgc2VsZWN0ZWQsIHRoZW4gcmV0dXJuXG4gICAgaWYgKCFlbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBwb3MgPSBvZmZzZXRVdGlscyhlbCk7XG4gIH0sXG5cbiAgX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogZnVuY3Rpb24gKGVhc2luZ1N0eWxlKSB7XG4gICAgLy8gYXNzaWduIGVhc2luZyBjc3Mgc3R5bGUgdG8gc2Nyb2xsIGNvbnRhaW5lciB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24gcHJvcGVydHlcbiAgICAvLyBleGFtcGxlOiBjdWJpYy1iZXppZXIoMC4yNSwgMC40NiwgMC40NSwgMC45NClcbiAgICB0aGlzLnNjcm9sbGVyU3R5bGVbc3R5bGVVdGlscy50cmFuc2l0aW9uVGltaW5nRnVuY3Rpb25dID0gZWFzaW5nU3R5bGU7XG4gIH0sXG5cbiAgX3RyYW5zaXRpb25UaW1lOiBmdW5jdGlvbiAodGltZSkge1xuICAgIC8vIGlmIGRvIG5vdCB1c2UgdHJhbnNpdGlvbiB0byBzY3JvbGwsIHJldHVyblxuICAgIGlmICghdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aW1lID0gdGltZSB8fCAwO1xuICAgIC8vIHRyYW5zaXRpb25EdXJhdGlvbiB3aGljaCBoYXMgdmVuZG9yIHByZWZpeFxuICAgIHZhciBkdXJhdGlvblByb3AgPSBzdHlsZVV0aWxzLnRyYW5zaXRpb25EdXJhdGlvbjtcbiAgICBpZiAoIWR1cmF0aW9uUHJvcCkgeyAvLyBpZiBubyB2ZW5kb3IgZm91bmQsIGR1cmF0aW9uUHJvcCB3aWxsIGJlIGZhbHNlXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSB0aW1lICsgJ21zJzsgLy8gYXNzaWduIG1zIHRvIHRyYW5zaXRpb25EdXJhdGlvbiBwcm9wXG5cbiAgICBpZiAoIXRpbWUgJiYgaXNCYWRBbmRyb2lkKSB7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9ICcwLjAwMDFtcyc7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHJBRihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzZWxmLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9PT0gJzAuMDAwMW1zJykge1xuICAgICAgICAgIHNlbGYuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gJzBzJztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIF90cmFuc2xhdGU6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgY29uc29sZS5sb2coJ3RyYW5zbGF0ZSBub3chITogJywgeCwgJyAnLCB5KTtcbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVRyYW5zZm9ybSkge1xuXG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGVbc3R5bGVVdGlscy50cmFuc2Zvcm1dID1cbiAgICAgICAgJ3RyYW5zbGF0ZSgnICsgeCArICdweCwnICsgeSArICdweCknICsgJ3RyYW5zbGF0ZVooMCknO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHggPSBNYXRoLnJvdW5kKHgpO1xuICAgICAgeSA9IE1hdGgucm91bmQoeSk7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGUubGVmdCA9IHggKyAncHgnO1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlLnRvcCA9IHkgKyAncHgnO1xuICAgIH1cblxuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgfSxcblxuICBfYW5pbWF0ZTogZnVuY3Rpb24gKGRlc3RYLCBkZXN0WSwgZHVyYXRpb24sIGVhc2luZ0ZuKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzLFxuICAgICAgc3RhcnRYID0gdGhpcy54LFxuICAgICAgc3RhcnRZID0gdGhpcy55LFxuICAgICAgc3RhcnRUaW1lID0gZ2V0VGltZSgpLFxuICAgICAgZGVzdFRpbWUgPSBzdGFydFRpbWUgKyBkdXJhdGlvbjtcblxuICAgIGZ1bmN0aW9uIHN0ZXAoKSB7XG4gICAgICB2YXIgbm93ID0gZ2V0VGltZSgpLFxuICAgICAgICBuZXdYLCBuZXdZLFxuICAgICAgICBlYXNpbmc7XG5cbiAgICAgIGlmIChub3cgPj0gZGVzdFRpbWUpIHtcbiAgICAgICAgdGhhdC5pc0FuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICB0aGF0Ll90cmFuc2xhdGUoZGVzdFgsIGRlc3RZKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIG5vdyA9IChub3cgLSBzdGFydFRpbWUpIC8gZHVyYXRpb247XG4gICAgICBlYXNpbmcgPSBlYXNpbmdGbihub3cpO1xuICAgICAgbmV3WCA9IChkZXN0WCAtIHN0YXJ0WCkgKiBlYXNpbmcgKyBzdGFydFg7XG4gICAgICBuZXdZID0gKGRlc3RZIC0gc3RhcnRZKSAqIGVhc2luZyArIHN0YXJ0WTtcbiAgICAgIHRoYXQuX3RyYW5zbGF0ZShuZXdYLCBuZXdZKTtcblxuICAgICAgaWYgKHRoYXQuaXNBbmltYXRpbmcpIHtcbiAgICAgICAgckFGKHN0ZXApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNBbmltYXRpbmcgPSB0cnVlO1xuICAgIHN0ZXAoKTtcbiAgfSxcblxuICByZWZyZXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgZ2V0UmVjdCh0aGlzLndyYXBwZXIpOyAvLyBGb3JjZSByZWZsb3dcblxuICAgIHRoaXMud3JhcHBlcldpZHRoID0gdGhpcy53cmFwcGVyLmNsaWVudFdpZHRoO1xuICAgIHRoaXMud3JhcHBlckhlaWdodCA9IHRoaXMud3JhcHBlci5jbGllbnRIZWlnaHQ7XG5cbiAgICB2YXIgcmVjdCA9IGdldFJlY3QodGhpcy5zY3JvbGxlcik7XG5cbiAgICB0aGlzLnNjcm9sbGVyV2lkdGggPSByZWN0LndpZHRoO1xuICAgIHRoaXMuc2Nyb2xsZXJIZWlnaHQgPSByZWN0LmhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIHRoaXMubWF4U2Nyb2xsWCBvciB0aGlzLm1heFNjcm9sbFkgc21hbGxlciB0aGFuIDAsIG1lYW5pbmdcbiAgICAgKiBvdmVyZmxvdyBoYXBwZW5lZC5cbiAgICAgKi9cbiAgICB0aGlzLm1heFNjcm9sbFggPSB0aGlzLndyYXBwZXJXaWR0aCAtIHRoaXMuc2Nyb2xsZXJXaWR0aDtcbiAgICB0aGlzLm1heFNjcm9sbFkgPSB0aGlzLndyYXBwZXJIZWlnaHQgLSB0aGlzLnNjcm9sbGVySGVpZ2h0O1xuXG4gICAgLyoqXG4gICAgICogb3B0aW9uIGVuYWJsZXMgc2Nyb2xsIEFORCBvdmVyZmxvdyBleGlzdHNcbiAgICAgKi9cbiAgICB0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgPSB0aGlzLm9wdGlvbnMuc2Nyb2xsWCAmJiB0aGlzLm1heFNjcm9sbFggPCAwO1xuICAgIHRoaXMuaGFzVmVydGljYWxTY3JvbGwgPSB0aGlzLm9wdGlvbnMuc2Nyb2xsWSAmJiB0aGlzLm1heFNjcm9sbFkgPCAwO1xuXG4gICAgaWYgKCF0aGlzLmhhc0hvcml6b250YWxTY3JvbGwpIHtcbiAgICAgIHRoaXMubWF4U2Nyb2xsWCA9IDA7XG4gICAgICB0aGlzLnNjcm9sbGVyV2lkdGggPSB0aGlzLndyYXBwZXJXaWR0aDtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaGFzVmVydGljYWxTY3JvbGwpIHtcbiAgICAgIHRoaXMubWF4U2Nyb2xsWSA9IDA7XG4gICAgICB0aGlzLnNjcm9sbGVySGVpZ2h0ID0gdGhpcy53cmFwcGVySGVpZ2h0O1xuICAgIH1cblxuICAgIHRoaXMuZW5kVGltZSA9IDA7XG4gICAgdGhpcy5kaXJlY3Rpb25YID0gMDtcbiAgICB0aGlzLmRpcmVjdGlvblkgPSAwO1xuXG4gICAgaWYgKGhhc1BvaW50ZXIgJiYgIXRoaXMub3B0aW9ucy5kaXNhYmxlUG9pbnRlcikge1xuICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW3N0eWxlVXRpbHMudG91Y2hBY3Rpb25dID1cbiAgICAgICAgZ2V0VG91Y2hBY3Rpb24odGhpcy5vcHRpb25zLmV2ZW50UGFzc3Rocm91Z2gsIHRydWUpO1xuXG4gICAgICBpZiAoIXRoaXMud3JhcHBlci5zdHlsZVtzdHlsZVV0aWxzLnRvdWNoQWN0aW9uXSkge1xuICAgICAgICB0aGlzLndyYXBwZXIuc3R5bGVbc3R5bGVVdGlscy50b3VjaEFjdGlvbl0gPVxuICAgICAgICAgIGdldFRvdWNoQWN0aW9uKHRoaXMub3B0aW9ucy5ldmVudFBhc3N0aHJvdWdoLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy53cmFwcGVyT2Zmc2V0ID0gb2Zmc2V0VXRpbHModGhpcy53cmFwcGVyKTtcblxuICAgIC8vIHRoaXMuX2V4ZWNFdmVudCgncmVmcmVzaCcpO1xuXG4gICAgdGhpcy5yZXNldFBvc2l0aW9uKCk7XG4gIH0sXG5cbiAgcmVzZXRQb3NpdGlvbjogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgIHkgPSB0aGlzLnk7XG5cbiAgICB0aW1lID0gdGltZSB8fCAwO1xuXG4gICAgaWYgKCF0aGlzLmhhc0hvcml6b250YWxTY3JvbGwgfHwgdGhpcy54ID4gMCkge1xuICAgICAgeCA9IDA7XG4gICAgfSBlbHNlIGlmICh0aGlzLnggPCB0aGlzLm1heFNjcm9sbFgpIHtcbiAgICAgIHggPSB0aGlzLm1heFNjcm9sbFg7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmhhc1ZlcnRpY2FsU2Nyb2xsIHx8IHRoaXMueSA+IDApIHtcbiAgICAgIHkgPSAwO1xuICAgIH0gZWxzZSBpZiAodGhpcy55IDwgdGhpcy5tYXhTY3JvbGxZKSB7XG4gICAgICB5ID0gdGhpcy5tYXhTY3JvbGxZO1xuICAgIH1cblxuICAgIGlmICh4ID09PSB0aGlzLnggJiYgeSA9PT0gdGhpcy55KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy5zY3JvbGxUbyh4LCB5LCB0aW1lLCB0aGlzLm9wdGlvbnMuYm91bmNlRWFzaW5nKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGRpc2FibGU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVuYWJsZWQgPSBmYWxzZTtcbiAgfSxcblxuICBlbmFibGU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVuYWJsZWQgPSB0cnVlO1xuICB9XG5cblxufTtcblxuZXhwb3J0IGRlZmF1bHQgSXNjcm9sbDsiXSwibmFtZXMiOlsiZWFzaW5ncyIsImsiLCJNYXRoIiwic3FydCIsImIiLCJmIiwiZSIsInBvdyIsInNpbiIsIlBJIiwiX2VsZW1lbnRTdHlsZSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInN0eWxlIiwiX3ZlbmRvciIsInZlbmRvcnMiLCJ0cmFuc2Zvcm0iLCJpIiwibCIsImxlbmd0aCIsInN1YnN0ciIsIl9wcmVmaXhTdHlsZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwiaXNCYWRBbmRyb2lkIiwiYXBwVmVyc2lvbiIsIndpbmRvdyIsIm5hdmlnYXRvciIsInRlc3QiLCJzYWZhcmlWZXJzaW9uIiwibWF0Y2giLCJwYXJzZUZsb2F0IiwiZ2V0VGltZSIsIkRhdGUiLCJub3ciLCJvZmZzZXQiLCJlbCIsImxlZnQiLCJvZmZzZXRMZWZ0IiwidG9wIiwib2Zmc2V0VG9wIiwib2Zmc2V0UGFyZW50IiwiZ2V0UmVjdCIsIlNWR0VsZW1lbnQiLCJyZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0Iiwid2lkdGgiLCJoZWlnaHQiLCJvZmZzZXRXaWR0aCIsIm9mZnNldEhlaWdodCIsImhhc1BvaW50ZXIiLCJQb2ludGVyRXZlbnQiLCJNU1BvaW50ZXJFdmVudCIsImhhc1RvdWNoIiwiZ2V0VG91Y2hBY3Rpb24iLCJldmVudFBhc3N0aHJvdWdoIiwiYWRkUGluY2giLCJ0b3VjaEFjdGlvbiIsImFkZEV2ZW50IiwidHlwZSIsImZuIiwiY2FwdHVyZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZW1vdmVFdmVudCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJwcmVmaXhQb2ludGVyRXZlbnQiLCJwb2ludGVyRXZlbnQiLCJldmVudFR5cGUiLCJwcmV2ZW50RGVmYXVsdEV4Y2VwdGlvbiIsImV4Y2VwdGlvbnMiLCJtb21lbnR1bSIsImN1cnJlbnQiLCJzdGFydCIsInRpbWUiLCJsb3dlck1hcmdpbiIsIndyYXBwZXJTaXplIiwiZGVjZWxlcmF0aW9uIiwiZGlzdGFuY2UiLCJzcGVlZCIsImFicyIsImRlc3RpbmF0aW9uIiwiZHVyYXRpb24iLCJ1bmRlZmluZWQiLCJyb3VuZCIsInJBRiIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsIndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSIsIm1velJlcXVlc3RBbmltYXRpb25GcmFtZSIsIm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJtc1JlcXVlc3RBbmltYXRpb25GcmFtZSIsImNhbGxiYWNrIiwic2V0VGltZW91dCIsIklzY3JvbGwiLCJlbGVtIiwib3B0aW9ucyIsIndyYXBwZXIiLCJxdWVyeVNlbGVjdG9yIiwic2Nyb2xsZXIiLCJjaGlsZHJlbiIsInNjcm9sbGVyU3R5bGUiLCJvbm1vdXNlZG93biIsInRhZ05hbWUiLCJzY3JvbGxZIiwic2Nyb2xsWCIsImZyZWVTY3JvbGwiLCJkaXJlY3Rpb25Mb2NrVGhyZXNob2xkIiwiYm91bmNlRWFzaW5nIiwiY2lyY3VsYXIiLCJ4IiwieSIsImRpcmVjdGlvblgiLCJkaXJlY3Rpb25ZIiwiX2V2ZW50cyIsIl9pbml0IiwicmVmcmVzaCIsInNjcm9sbFRvIiwic3RhcnRYIiwic3RhcnRZIiwiZW5hYmxlIiwicHJvdG90eXBlIiwiX2luaXRFdmVudHMiLCJyZW1vdmUiLCJ0YXJnZXQiLCJiaW5kVG9XcmFwcGVyIiwiY2xpY2siLCJkaXNhYmxlTW91c2UiLCJkaXNhYmxlUG9pbnRlciIsImRpc2FibGVUb3VjaCIsIl9zdGFydCIsIl9tb3ZlIiwiX2VuZCIsImxvZyIsImJ1dHRvbiIsIndoaWNoIiwiZW5hYmxlZCIsImluaXRpYXRlZCIsInByZXZlbnREZWZhdWx0IiwicG9pbnQiLCJ0b3VjaGVzIiwicG9zIiwibW92ZWQiLCJkaXN0WCIsImRpc3RZIiwiZGlyZWN0aW9uTG9ja2VkIiwic3RhcnRUaW1lIiwidXNlVHJhbnNpdGlvbiIsImlzSW5UcmFuc2l0aW9uIiwiX3RyYW5zaXRpb25UaW1lIiwiZ2V0Q29tcHV0ZWRQb3NpdGlvbiIsIl90cmFuc2xhdGUiLCJpc0FuaW1hdGluZyIsImFic1N0YXJ0WCIsImFic1N0YXJ0WSIsInBvaW50WCIsInBhZ2VYIiwicG9pbnRZIiwicGFnZVkiLCJkZWx0YVgiLCJ0aW1lc3RhbXAiLCJuZXdYIiwibmV3WSIsImFic0Rpc3RYIiwiYWJzRGlzdFkiLCJkZWx0YVkiLCJlbmRUaW1lIiwiaGFzVmVydGljYWxTY3JvbGwiLCJoYXNIb3Jpem9udGFsU2Nyb2xsIiwibWF4U2Nyb2xsWCIsImJvdW5jZSIsIm1heFNjcm9sbFkiLCJjaGFuZ2VkVG91Y2hlcyIsIm1vbWVudHVtWCIsIm1vbWVudHVtWSIsImRpc3RhbmNlWCIsImRpc3RhbmNlWSIsImVhc2luZyIsInJlc2V0UG9zaXRpb24iLCJib3VuY2VUaW1lIiwidGFwIiwiZmxpY2siLCJ3cmFwcGVyV2lkdGgiLCJ3cmFwcGVySGVpZ2h0IiwibWF4Iiwic25hcCIsInF1YWRyYXRpYyIsIm1hdHJpeCIsImdldENvbXB1dGVkU3R5bGUiLCJ1c2VUcmFuc2Zvcm0iLCJzdHlsZVV0aWxzIiwic3BsaXQiLCJyZXBsYWNlIiwidHJhbnNpdGlvblR5cGUiLCJfdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIiwiX2FuaW1hdGUiLCJvZmZzZXRYIiwib2Zmc2V0WSIsIm5vZGVUeXBlIiwib2Zmc2V0VXRpbHMiLCJlYXNpbmdTdHlsZSIsInRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiIsImR1cmF0aW9uUHJvcCIsInRyYW5zaXRpb25EdXJhdGlvbiIsInNlbGYiLCJkZXN0WCIsImRlc3RZIiwiZWFzaW5nRm4iLCJ0aGF0IiwiZGVzdFRpbWUiLCJzdGVwIiwiY2xpZW50V2lkdGgiLCJjbGllbnRIZWlnaHQiLCJzY3JvbGxlcldpZHRoIiwic2Nyb2xsZXJIZWlnaHQiLCJ3cmFwcGVyT2Zmc2V0Il0sIm1hcHBpbmdzIjoiQUFBQSxJQUFJQSxVQUFVO2FBQ0Q7V0FDRixzQ0FERTtRQUVMLFVBQVVDLENBQVYsRUFBYTthQUNSQSxLQUFLLElBQUlBLENBQVQsQ0FBUDs7R0FKUTtZQU9GO1dBQ0QsaUNBREM7UUFFSixVQUFVQSxDQUFWLEVBQWE7YUFDUkMsS0FBS0MsSUFBTCxDQUFVLElBQUssRUFBRUYsQ0FBRixHQUFNQSxDQUFyQixDQUFQOztHQVZRO1FBYU47V0FDRyx5Q0FESDtRQUVBLFVBQVVBLENBQVYsRUFBYTtVQUNYRyxJQUFJLENBQVI7YUFDTyxDQUFDSCxJQUFJQSxJQUFJLENBQVQsSUFBY0EsQ0FBZCxJQUFtQixDQUFDRyxJQUFJLENBQUwsSUFBVUgsQ0FBVixHQUFjRyxDQUFqQyxJQUFzQyxDQUE3Qzs7R0FqQlE7VUFvQko7V0FDQyxFQUREO1FBRUYsVUFBVUgsQ0FBVixFQUFhO1VBQ1gsQ0FBQ0EsS0FBSyxDQUFOLElBQVksSUFBSSxJQUFwQixFQUEyQjtlQUNsQixTQUFTQSxDQUFULEdBQWFBLENBQXBCO09BREYsTUFFTyxJQUFJQSxJQUFLLElBQUksSUFBYixFQUFvQjtlQUNsQixVQUFVQSxLQUFNLE1BQU0sSUFBdEIsSUFBK0JBLENBQS9CLEdBQW1DLElBQTFDO09BREssTUFFQSxJQUFJQSxJQUFLLE1BQU0sSUFBZixFQUFzQjtlQUNwQixVQUFVQSxLQUFNLE9BQU8sSUFBdkIsSUFBZ0NBLENBQWhDLEdBQW9DLE1BQTNDO09BREssTUFFQTtlQUNFLFVBQVVBLEtBQU0sUUFBUSxJQUF4QixJQUFpQ0EsQ0FBakMsR0FBcUMsUUFBNUM7OztHQTlCTTtXQWtDSDtXQUNBLEVBREE7UUFFSCxVQUFVQSxDQUFWLEVBQWE7VUFDWEksSUFBSSxJQUFSO1VBQ0VDLElBQUksR0FETjs7VUFHSUwsTUFBTSxDQUFWLEVB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

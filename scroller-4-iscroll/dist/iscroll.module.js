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
    useTransition: true,
    useTransform: true
  };

  for (var i in options) {
    this.options[i] = options[i];
  }

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
  }
};

export default Iscroll;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5tb2R1bGUuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9lYXNpbmdzLmpzIiwiLi4vc3JjL3V0aWxzL3N0eWxlLmpzIiwiLi4vc3JjL3V0aWxzL2lzQmFkQW5kcm9pZC5qcyIsIi4uL3NyYy9teS1pc2Nyb2xsLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBlYXNpbmdzID0ge1xuICBxdWFkcmF0aWM6IHtcbiAgICBzdHlsZTogJ2N1YmljLWJlemllcigwLjI1LCAwLjQ2LCAwLjQ1LCAwLjk0KScsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICByZXR1cm4gayAqICgyIC0gayk7XG4gICAgfVxuICB9LFxuICBjaXJjdWxhcjoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMSwgMC41NywgMC4xLCAxKScsXHQvLyBOb3QgcHJvcGVybHkgXCJjaXJjdWxhclwiIGJ1dCB0aGlzIGxvb2tzIGJldHRlciwgaXQgc2hvdWxkIGJlICgwLjA3NSwgMC44MiwgMC4xNjUsIDEpXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KDEgLSAoLS1rICogaykpO1xuICAgIH1cbiAgfSxcbiAgYmFjazoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMTc1LCAwLjg4NSwgMC4zMiwgMS4yNzUpJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciBiID0gNDtcbiAgICAgIHJldHVybiAoayA9IGsgLSAxKSAqIGsgKiAoKGIgKyAxKSAqIGsgKyBiKSArIDE7XG4gICAgfVxuICB9LFxuICBib3VuY2U6IHtcbiAgICBzdHlsZTogJycsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICBpZiAoKGsgLz0gMSkgPCAoMSAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiBrICogaztcbiAgICAgIH0gZWxzZSBpZiAoayA8ICgyIC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIChrIC09ICgxLjUgLyAyLjc1KSkgKiBrICsgMC43NTtcbiAgICAgIH0gZWxzZSBpZiAoayA8ICgyLjUgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuMjUgLyAyLjc1KSkgKiBrICsgMC45Mzc1O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjYyNSAvIDIuNzUpKSAqIGsgKyAwLjk4NDM3NTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGVsYXN0aWM6IHtcbiAgICBzdHlsZTogJycsXG4gICAgZm46IGZ1bmN0aW9uIChrKSB7XG4gICAgICB2YXIgZiA9IDAuMjIsXG4gICAgICAgIGUgPSAwLjQ7XG5cbiAgICAgIGlmIChrID09PSAwKSB7IHJldHVybiAwOyB9XG4gICAgICBpZiAoayA9PSAxKSB7IHJldHVybiAxOyB9XG5cbiAgICAgIHJldHVybiAoZSAqIE1hdGgucG93KDIsIC0gMTAgKiBrKSAqIE1hdGguc2luKChrIC0gZiAvIDQpICogKDIgKiBNYXRoLlBJKSAvIGYpICsgMSk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBlYXNpbmdzOyIsInZhciBfZWxlbWVudFN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jykuc3R5bGU7XG5cbnZhciBfdmVuZG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgdmFyIHZlbmRvcnMgPSBbJ3QnLCAnd2Via2l0VCcsICdNb3pUJywgJ21zVCcsICdPVCddLFxuICAgIHRyYW5zZm9ybSxcbiAgICBpID0gMCxcbiAgICBsID0gdmVuZG9ycy5sZW5ndGg7XG5cbiAgd2hpbGUgKGkgPCBsKSB7XG4gICAgdHJhbnNmb3JtID0gdmVuZG9yc1tpXSArICdyYW5zZm9ybSc7XG4gICAgaWYgKHRyYW5zZm9ybSBpbiBfZWxlbWVudFN0eWxlKSB7XG4gICAgICByZXR1cm4gdmVuZG9yc1tpXS5zdWJzdHIoMCwgdmVuZG9yc1tpXS5sZW5ndGggLSAxKTtcbiAgICB9XG4gICAgaSsrO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufSkoKTtcblxuZnVuY3Rpb24gX3ByZWZpeFN0eWxlIChzdHlsZSkge1xuICBpZiAoIF92ZW5kb3IgPT09IGZhbHNlICkgcmV0dXJuIGZhbHNlOyAvLyBubyB2ZW5kb3IgZm91bmRcbiAgaWYgKCBfdmVuZG9yID09PSAnJyApIHJldHVybiBzdHlsZTsgLy8gbm8gcHJlZml4IG5lZWRlZFxuICByZXR1cm4gX3ZlbmRvciArIHN0eWxlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3R5bGUuc3Vic3RyKDEpOyAvLyBvdGhlcndpc2UgYWRkIHByZWZpeFxufVxuXG4vLyBzdHlsZSB0aGF0IGhhcyB2ZW5kb3IgcHJlZml4LCBlZzogd2Via2l0VHJhbnNmb3JtXG52YXIgc3R5bGUgPSB7XG4gIHRyYW5zZm9ybTogX3ByZWZpeFN0eWxlKCd0cmFuc2Zvcm0nKSxcbiAgdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uOiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbicpLFxuICB0cmFuc2l0aW9uRHVyYXRpb246IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvbkR1cmF0aW9uJyksXG4gIHRyYW5zaXRpb25EZWxheTogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uRGVsYXknKSxcbiAgdHJhbnNmb3JtT3JpZ2luOiBfcHJlZml4U3R5bGUoJ3RyYW5zZm9ybU9yaWdpbicpLFxuICB0b3VjaEFjdGlvbjogX3ByZWZpeFN0eWxlKCd0b3VjaEFjdGlvbicpXG59O1xuXG5leHBvcnQgZGVmYXVsdCBzdHlsZTsiLCJ2YXIgaXNCYWRBbmRyb2lkID0gKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGFwcFZlcnNpb24gPSB3aW5kb3cubmF2aWdhdG9yLmFwcFZlcnNpb247XG5cbiAgaWYgKC9BbmRyb2lkLy50ZXN0KGFwcFZlcnNpb24pICYmICEoL0Nocm9tZVxcL1xcZC8udGVzdChhcHBWZXJzaW9uKSkpIHtcbiAgICB2YXIgc2FmYXJpVmVyc2lvbiA9IGFwcFZlcnNpb24ubWF0Y2goL1NhZmFyaVxcLyhcXGQrLlxcZCkvKTtcbiAgICBpZihzYWZhcmlWZXJzaW9uICYmIHR5cGVvZiBzYWZhcmlWZXJzaW9uID09PSBcIm9iamVjdFwiICYmIHNhZmFyaVZlcnNpb24ubGVuZ3RoID49IDIpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KHNhZmFyaVZlcnNpb25bMV0pIDwgNTM1LjE5O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59KSgpO1xuXG5leHBvcnQgZGVmYXVsdCBpc0JhZEFuZHJvaWQ7IiwiaW1wb3J0IGVhc2luZ3MgZnJvbSAnLi91dGlscy9lYXNpbmdzJztcbmltcG9ydCBzdHlsZVV0aWxzIGZyb20gJy4vdXRpbHMvc3R5bGUnO1xuaW1wb3J0IGlzQmFkQW5kcm9pZCBmcm9tICcuL3V0aWxzL2lzQmFkQW5kcm9pZCc7XG5cbi8vIGRlYWwgd2l0aCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgY29tcGF0YmlsaXR5XG52YXIgckFGID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZVx0fHxcbiAgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZVx0fHxcbiAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZVx0XHR8fFxuICB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZVx0XHR8fFxuICB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcdFx0fHxcbiAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7IHdpbmRvdy5zZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApOyB9O1xuXG5mdW5jdGlvbiBJc2Nyb2xsIChlbGVtLCBvcHRpb25zKSB7XG4gIC8qKlxuICAgKiBnZXQgc2Nyb2xsIG5vZGUgZWxlbWVudFxuICAgKi9cbiAgdGhpcy53cmFwcGVyID0gdHlwZW9mIGVsZW0gPT09ICdzdHJpbmcnID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtKSA6IGVsZW07XG4gIHRoaXMuc2Nyb2xsZXIgPSB0aGlzLndyYXBwZXIuY2hpbGRyZW5bMF07XG4gIHRoaXMuc2Nyb2xsZXJTdHlsZSA9IHRoaXMuc2Nyb2xsZXIuc3R5bGU7XG5cbiAgLyoqXG4gICAqIG1lcmdlIGRlZmF1bHQgb3B0aW9ucyBhbmQgY3VzdG9taXplZCBvcHRpb25zXG4gICAqL1xuICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgdXNlVHJhbnNpdGlvbjogdHJ1ZSxcbiAgICB1c2VUcmFuc2Zvcm06IHRydWVcbiAgfTtcblxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnNbaV0gPSBvcHRpb25zW2ldO1xuICB9XG5cblx0dGhpcy54ID0gMDtcblx0dGhpcy55ID0gMDtcbn1cblxuSXNjcm9sbC5wcm90b3R5cGUgPSB7XG4gIHNjcm9sbFRvOiBmdW5jdGlvbiAoeCwgeSwgdGltZSwgZWFzaW5nKSB7XG4gICAgZWFzaW5nID0gZWFzaW5nIHx8IGVhc2luZ3MuY2lyY3VsYXI7XG4gICAgdGhpcy5pc0luVHJhbnNpdGlvbiA9IHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIHRpbWUgPiAwO1xuICAgIHZhciB0cmFuc2l0aW9uVHlwZSA9IHRoaXMub3B0aW9ucy51c2VUcmFuc2l0aW9uICYmIGVhc2luZy5zdHlsZTtcblxuICAgIGlmICggIXRpbWUgfHwgdHJhbnNpdGlvblR5cGUgKSB7XG4gICAgICBpZih0cmFuc2l0aW9uVHlwZSkge1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24oZWFzaW5nLnN0eWxlKTtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblRpbWUodGltZSk7XG4gICAgICB9XG4gICAgICB0aGlzLl90cmFuc2xhdGUoeCwgeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FuaW1hdGUoeCwgeSwgdGltZSwgZWFzaW5nLmZuKTtcbiAgICB9XG4gIH0sXG5cbiAgX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogZnVuY3Rpb24gKGVhc2luZ1N0eWxlKSB7XG4gICAgLy8gYXNzaWduIGVhc2luZyBjc3Mgc3R5bGUgdG8gc2Nyb2xsIGNvbnRhaW5lciB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24gcHJvcGVydHlcbiAgICAvLyBleGFtcGxlOiBjdWJpYy1iZXppZXIoMC4yNSwgMC40NiwgMC40NSwgMC45NClcbiAgICB0aGlzLnNjcm9sbGVyU3R5bGVbc3R5bGVVdGlscy50cmFuc2l0aW9uVGltaW5nRnVuY3Rpb25dID0gZWFzaW5nU3R5bGU7XG4gIH0sXG5cbiAgX3RyYW5zaXRpb25UaW1lOiBmdW5jdGlvbiAodGltZSkge1xuICAgIC8vIGlmIGRvIG5vdCB1c2UgdHJhbnNpdGlvbiB0byBzY3JvbGwsIHJldHVyblxuXHRcdGlmICghdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24pIHtcblx0XHRcdHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgdGltZSA9IHRpbWUgfHwgMDtcbiAgICAvLyB0cmFuc2l0aW9uRHVyYXRpb24gd2hpY2ggaGFzIHZlbmRvciBwcmVmaXhcbiAgICB2YXIgZHVyYXRpb25Qcm9wID0gc3R5bGVVdGlscy50cmFuc2l0aW9uRHVyYXRpb247XG5cdFx0aWYoIWR1cmF0aW9uUHJvcCkgeyAvLyBpZiBubyB2ZW5kb3IgZm91bmQsIGR1cmF0aW9uUHJvcCB3aWxsIGJlIGZhbHNlXG5cdFx0XHRyZXR1cm47XG4gICAgfVxuICAgIFxuICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gdGltZSArICdtcyc7IC8vIGFzc2lnbiBtcyB0byB0cmFuc2l0aW9uRHVyYXRpb24gcHJvcFxuXG4gICAgaWYgKCF0aW1lICYmIGlzQmFkQW5kcm9pZCkge1xuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSAnMC4wMDAxbXMnO1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICByQUYoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChzZWxmLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9PT0gJzAuMDAwMW1zJykge1xuICAgICAgICAgIHNlbGYuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID0gJzBzJztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIF90cmFuc2xhdGU6IGZ1bmN0aW9uKHgseSkge1xuICAgIGlmICggdGhpcy5vcHRpb25zLnVzZVRyYW5zZm9ybSApIHtcblxuICAgICAgdGhpcy5zY3JvbGxlclN0eWxlW3N0eWxlVXRpbHMudHJhbnNmb3JtXSA9IFxuICAgICAgICAndHJhbnNsYXRlKCcgKyB4ICsgJ3B4LCcgKyB5ICsgJ3B4KScgKyAndHJhbnNsYXRlWigwKSc7XG5cbiAgICB9IGVsc2Uge1xuXHRcdFx0eCA9IE1hdGgucm91bmQoeCk7XG4gICAgICB5ID0gTWF0aC5yb3VuZCh5KTtcblx0XHRcdHRoaXMuc2Nyb2xsZXJTdHlsZS5sZWZ0ID0geCArICdweCc7XG5cdFx0XHR0aGlzLnNjcm9sbGVyU3R5bGUudG9wID0geSArICdweCc7XG4gICAgfVxuXG5cdFx0dGhpcy54ID0geDtcblx0XHR0aGlzLnkgPSB5O1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBJc2Nyb2xsOyJdLCJuYW1lcyI6WyJlYXNpbmdzIiwiayIsIk1hdGgiLCJzcXJ0IiwiYiIsImYiLCJlIiwicG93Iiwic2luIiwiUEkiLCJfZWxlbWVudFN0eWxlIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwic3R5bGUiLCJfdmVuZG9yIiwidmVuZG9ycyIsInRyYW5zZm9ybSIsImkiLCJsIiwibGVuZ3RoIiwic3Vic3RyIiwiX3ByZWZpeFN0eWxlIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJpc0JhZEFuZHJvaWQiLCJhcHBWZXJzaW9uIiwid2luZG93IiwibmF2aWdhdG9yIiwidGVzdCIsInNhZmFyaVZlcnNpb24iLCJtYXRjaCIsInBhcnNlRmxvYXQiLCJyQUYiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ3ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJtb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJvUmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwibXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJjYWxsYmFjayIsInNldFRpbWVvdXQiLCJJc2Nyb2xsIiwiZWxlbSIsIm9wdGlvbnMiLCJ3cmFwcGVyIiwicXVlcnlTZWxlY3RvciIsInNjcm9sbGVyIiwiY2hpbGRyZW4iLCJzY3JvbGxlclN0eWxlIiwieCIsInkiLCJwcm90b3R5cGUiLCJ0aW1lIiwiZWFzaW5nIiwiY2lyY3VsYXIiLCJpc0luVHJhbnNpdGlvbiIsInVzZVRyYW5zaXRpb24iLCJ0cmFuc2l0aW9uVHlwZSIsIl90cmFuc2l0aW9uVGltaW5nRnVuY3Rpb24iLCJfdHJhbnNpdGlvblRpbWUiLCJfdHJhbnNsYXRlIiwiX2FuaW1hdGUiLCJmbiIsImVhc2luZ1N0eWxlIiwic3R5bGVVdGlscyIsInRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiIsImR1cmF0aW9uUHJvcCIsInRyYW5zaXRpb25EdXJhdGlvbiIsInNlbGYiLCJ1c2VUcmFuc2Zvcm0iLCJyb3VuZCIsImxlZnQiLCJ0b3AiXSwibWFwcGluZ3MiOiJBQUFBLElBQUlBLFVBQVU7YUFDRDtXQUNGLHNDQURFO1FBRUwsVUFBVUMsQ0FBVixFQUFhO2FBQ1JBLEtBQUssSUFBSUEsQ0FBVCxDQUFQOztHQUpRO1lBT0Y7V0FDRCxpQ0FEQztRQUVKLFVBQVVBLENBQVYsRUFBYTthQUNSQyxLQUFLQyxJQUFMLENBQVUsSUFBSyxFQUFFRixDQUFGLEdBQU1BLENBQXJCLENBQVA7O0dBVlE7UUFhTjtXQUNHLHlDQURIO1FBRUEsVUFBVUEsQ0FBVixFQUFhO1VBQ1hHLElBQUksQ0FBUjthQUNPLENBQUNILElBQUlBLElBQUksQ0FBVCxJQUFjQSxDQUFkLElBQW1CLENBQUNHLElBQUksQ0FBTCxJQUFVSCxDQUFWLEdBQWNHLENBQWpDLElBQXNDLENBQTdDOztHQWpCUTtVQW9CSjtXQUNDLEVBREQ7UUFFRixVQUFVSCxDQUFWLEVBQWE7VUFDWCxDQUFDQSxLQUFLLENBQU4sSUFBWSxJQUFJLElBQXBCLEVBQTJCO2VBQ2xCLFNBQVNBLENBQVQsR0FBYUEsQ0FBcEI7T0FERixNQUVPLElBQUlBLElBQUssSUFBSSxJQUFiLEVBQW9CO2VBQ2xCLFVBQVVBLEtBQU0sTUFBTSxJQUF0QixJQUErQkEsQ0FBL0IsR0FBbUMsSUFBMUM7T0FESyxNQUVBLElBQUlBLElBQUssTUFBTSxJQUFmLEVBQXNCO2VBQ3BCLFVBQVVBLEtBQU0sT0FBTyxJQUF2QixJQUFnQ0EsQ0FBaEMsR0FBb0MsTUFBM0M7T0FESyxNQUVBO2VBQ0UsVUFBVUEsS0FBTSxRQUFRLElBQXhCLElBQWlDQSxDQUFqQyxHQUFxQyxRQUE1Qzs7O0dBOUJNO1dBa0NIO1dBQ0EsRUFEQTtRQUVILFVBQVVBLENBQVYsRUFBYTtVQUNYSSxJQUFJLElBQVI7VUFDRUMsSUFBSSxHQUROOztVQUdJTCxNQUFNLENBQVYsRUFBYTtlQUFTLENBQVA7O1VBQ1hBLEtBQUssQ0FBVCxFQUFZO2VBQVMsQ0FBUDs7O2FBRU5LLElBQUlKLEtBQUtLLEdBQUwsQ0FBUyxDQUFULEVBQVksQ0FBRSxFQUFGLEdBQU9OLENBQW5CLENBQUosR0FBNEJDLEtBQUtNLEdBQUwsQ0FBUyxDQUFDUCxJQUFJSSxJQUFJLENBQVQsS0FBZSxJQUFJSCxLQUFLTyxFQUF4QixJQUE4QkosQ0FBdkMsQ0FBNUIsR0FBd0UsQ0FBaEY7OztDQTNDTjs7QUNBQSxJQUFJSyxnQkFBZ0JDLFNBQVNDLGFBQVQsQ0FBdUIsS0FBdkIsRUFBOEJDLEtBQWxEOztBQUVBLElBQUlDLFVBQVcsWUFBWTtNQUNyQkMsVUFBVSxDQUFDLEdBQUQsRUFBTSxTQUFOLEVBQWlCLE1BQWpCLEVBQXlCLEtBQXpCLEVBQWdDLElBQWhDLENBQWQ7TUFDRUMsU0FERjtNQUVFQyxJQUFJLENBRk47TUFHRUMsSUFBSUgsUUFBUUksTUFIZDs7U0FLT0YsSUFBSUMsQ0FBWCxFQUFjO2dCQUNBSCxRQUFRRSxDQUFSLElBQWEsVUFBekI7UUFDSUQsYUFBYU4sYUFBakIsRUFBZ0M7YUFDdkJLLFFBQVFFLENBQVIsRUFBV0csTUFBWCxDQUFrQixDQUFsQixFQUFxQkwsUUFBUUUsQ0FBUixFQUFXRSxNQUFYLEdBQW9CLENBQXpDLENBQVA7Ozs7O1NBS0csS0FBUDtDQWRZLEVBQWQ7O0FBaUJBLFNBQVNFLFlBQVQsQ0FBdUJSLEtBQXZCLEVBQThCO01BQ3ZCQyxZQUFZLEtBQWpCLEVBQXlCLE9BQU8sS0FBUCxDQURHO01BRXZCQSxZQUFZLEVBQWpCLEVBQXNCLE9BQU9ELEtBQVAsQ0FGTTtTQUdyQkMsVUFBVUQsTUFBTVMsTUFBTixDQUFhLENBQWIsRUFBZ0JDLFdBQWhCLEVBQVYsR0FBMENWLE1BQU1PLE1BQU4sQ0FBYSxDQUFiLENBQWpELENBSDRCOzs7O0FBTzlCLElBQUlQLFFBQVE7YUFDQ1EsYUFBYSxXQUFiLENBREQ7NEJBRWdCQSxhQUFhLDBCQUFiLENBRmhCO3NCQUdVQSxhQUFhLG9CQUFiLENBSFY7bUJBSU9BLGFBQWEsaUJBQWIsQ0FKUDttQkFLT0EsYUFBYSxpQkFBYixDQUxQO2VBTUdBLGFBQWEsYUFBYjtDQU5mOztBQzFCQSxJQUFJRyxlQUFnQixZQUFZO01BQzFCQyxhQUFhQyxPQUFPQyxTQUFQLENBQWlCRixVQUFsQzs7TUFFSSxVQUFVRyxJQUFWLENBQWVILFVBQWYsS0FBOEIsQ0FBRSxhQUFhRyxJQUFiLENBQWtCSCxVQUFsQixDQUFwQyxFQUFvRTtRQUM5REksZ0JBQWdCSixXQUFXSyxLQUFYLENBQWlCLGtCQUFqQixDQUFwQjtRQUNHRCxpQkFBaUIsT0FBT0EsYUFBUCxLQUF5QixRQUExQyxJQUFzREEsY0FBY1YsTUFBZCxJQUF3QixDQUFqRixFQUFvRjthQUMzRVksV0FBV0YsY0FBYyxDQUFkLENBQVgsSUFBK0IsTUFBdEM7S0FERixNQUVPO2FBQ0UsSUFBUDs7R0FMSixNQU9PO1dBQ0UsS0FBUDs7Q0FYZSxFQUFuQjs7QUNJQTtBQUNBLElBQUlHLE1BQU1OLE9BQU9PLHFCQUFQLElBQ1JQLE9BQU9RLDJCQURDLElBRVJSLE9BQU9TLHdCQUZDLElBR1JULE9BQU9VLHNCQUhDLElBSVJWLE9BQU9XLHVCQUpDLElBS1IsVUFBVUMsUUFBVixFQUFvQjtTQUFTQyxVQUFQLENBQWtCRCxRQUFsQixFQUE0QixPQUFPLEVBQW5DO0NBTHhCOztBQU9BLFNBQVNFLE9BQVQsQ0FBa0JDLElBQWxCLEVBQXdCQyxPQUF4QixFQUFpQzs7OztPQUkxQkMsT0FBTCxHQUFlLE9BQU9GLElBQVAsS0FBZ0IsUUFBaEIsR0FBMkI5QixTQUFTaUMsYUFBVCxDQUF1QkgsSUFBdkIsQ0FBM0IsR0FBMERBLElBQXpFO09BQ0tJLFFBQUwsR0FBZ0IsS0FBS0YsT0FBTCxDQUFhRyxRQUFiLENBQXNCLENBQXRCLENBQWhCO09BQ0tDLGFBQUwsR0FBcUIsS0FBS0YsUUFBTCxDQUFjaEMsS0FBbkM7Ozs7O09BS0s2QixPQUFMLEdBQWU7bUJBQ0UsSUFERjtrQkFFQztHQUZoQjs7T0FLSyxJQUFJekIsQ0FBVCxJQUFjeUIsT0FBZCxFQUF1QjtTQUNoQkEsT0FBTCxDQUFhekIsQ0FBYixJQUFrQnlCLFFBQVF6QixDQUFSLENBQWxCOzs7T0FHRStCLENBQUwsR0FBUyxDQUFUO09BQ0tDLENBQUwsR0FBUyxDQUFUOzs7QUFHRFQsUUFBUVUsU0FBUixHQUFvQjtZQUNSLFVBQVVGLENBQVYsRUFBYUMsQ0FBYixFQUFnQkUsSUFBaEIsRUFBc0JDLE1BQXRCLEVBQThCO2FBQzdCQSxVQUFVcEQsUUFBUXFELFFBQTNCO1NBQ0tDLGNBQUwsR0FBc0IsS0FBS1osT0FBTCxDQUFhYSxhQUFiLElBQThCSixPQUFPLENBQTNEO1FBQ0lLLGlCQUFpQixLQUFLZCxPQUFMLENBQWFhLGFBQWIsSUFBOEJILE9BQU92QyxLQUExRDs7UUFFSyxDQUFDc0MsSUFBRCxJQUFTSyxjQUFkLEVBQStCO1VBQzFCQSxjQUFILEVBQW1CO2FBQ1pDLHlCQUFMLENBQStCTCxPQUFPdkMsS0FBdEM7YUFDSzZDLGVBQUwsQ0FBcUJQLElBQXJCOztXQUVHUSxVQUFMLENBQWdCWCxDQUFoQixFQUFtQkMsQ0FBbkI7S0FMRixNQU1PO1dBQ0FXLFFBQUwsQ0FBY1osQ0FBZCxFQUFpQkMsQ0FBakIsRUFBb0JFLElBQXBCLEVBQTBCQyxPQUFPUyxFQUFqQzs7R0FiYzs7NkJBaUJTLFVBQVVDLFdBQVYsRUFBdUI7OztTQUczQ2YsYUFBTCxDQUFtQmdCLE1BQVdDLHdCQUE5QixJQUEwREYsV0FBMUQ7R0FwQmdCOzttQkF1QkQsVUFBVVgsSUFBVixFQUFnQjs7UUFFN0IsQ0FBQyxLQUFLVCxPQUFMLENBQWFhLGFBQWxCLEVBQWlDOzs7O1dBSXhCSixRQUFRLENBQWY7O1FBRUljLGVBQWVGLE1BQVdHLGtCQUE5QjtRQUNDLENBQUNELFlBQUosRUFBa0I7Ozs7O1NBSVhsQixhQUFMLENBQW1Ca0IsWUFBbkIsSUFBbUNkLE9BQU8sSUFBMUMsQ0FiK0I7O1FBZTNCLENBQUNBLElBQUQsSUFBUzNCLFlBQWIsRUFBMkI7V0FDcEJ1QixhQUFMLENBQW1Ca0IsWUFBbkIsSUFBbUMsVUFBbkM7VUFDSUUsT0FBTyxJQUFYOztVQUVJLFlBQVc7WUFDVEEsS0FBS3BCLGFBQUwsQ0FBbUJrQixZQUFuQixNQUFxQyxVQUF6QyxFQUFxRDtlQUM5Q2xCLGFBQUwsQ0FBbUJrQixZQUFuQixJQUFtQyxJQUFuQzs7T0FGSjs7R0ExQ2M7O2NBa0ROLFVBQVNqQixDQUFULEVBQVdDLENBQVgsRUFBYztRQUNuQixLQUFLUCxPQUFMLENBQWEwQixZQUFsQixFQUFpQzs7V0FFMUJyQixhQUFMLENBQW1CZ0IsTUFBVy9DLFNBQTlCLElBQ0UsZUFBZWdDLENBQWYsR0FBbUIsS0FBbkIsR0FBMkJDLENBQTNCLEdBQStCLEtBQS9CLEdBQXVDLGVBRHpDO0tBRkYsTUFLTztVQUNKL0MsS0FBS21FLEtBQUwsQ0FBV3JCLENBQVgsQ0FBSjtVQUNPOUMsS0FBS21FLEtBQUwsQ0FBV3BCLENBQVgsQ0FBSjtXQUNFRixhQUFMLENBQW1CdUIsSUFBbkIsR0FBMEJ0QixJQUFJLElBQTlCO1dBQ0tELGFBQUwsQ0FBbUJ3QixHQUFuQixHQUF5QnRCLElBQUksSUFBN0I7OztTQUdJRCxDQUFMLEdBQVNBLENBQVQ7U0FDS0MsQ0FBTCxHQUFTQSxDQUFUOztDQWhFRjs7OzsifQ==

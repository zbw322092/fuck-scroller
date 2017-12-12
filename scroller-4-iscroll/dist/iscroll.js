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

return Iscroll;

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNjcm9sbC5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL3V0aWxzL2Vhc2luZ3MuanMiLCIuLi9zcmMvdXRpbHMvc3R5bGUuanMiLCIuLi9zcmMvdXRpbHMvaXNCYWRBbmRyb2lkLmpzIiwiLi4vc3JjL215LWlzY3JvbGwuanMiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIGVhc2luZ3MgPSB7XG4gIHF1YWRyYXRpYzoge1xuICAgIHN0eWxlOiAnY3ViaWMtYmV6aWVyKDAuMjUsIDAuNDYsIDAuNDUsIDAuOTQpJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBrICogKDIgLSBrKTtcbiAgICB9XG4gIH0sXG4gIGNpcmN1bGFyOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xLCAwLjU3LCAwLjEsIDEpJyxcdC8vIE5vdCBwcm9wZXJseSBcImNpcmN1bGFyXCIgYnV0IHRoaXMgbG9va3MgYmV0dGVyLCBpdCBzaG91bGQgYmUgKDAuMDc1LCAwLjgyLCAwLjE2NSwgMSlcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoMSAtICgtLWsgKiBrKSk7XG4gICAgfVxuICB9LFxuICBiYWNrOiB7XG4gICAgc3R5bGU6ICdjdWJpYy1iZXppZXIoMC4xNzUsIDAuODg1LCAwLjMyLCAxLjI3NSknLFxuICAgIGZuOiBmdW5jdGlvbiAoaykge1xuICAgICAgdmFyIGIgPSA0O1xuICAgICAgcmV0dXJuIChrID0gayAtIDEpICogayAqICgoYiArIDEpICogayArIGIpICsgMTtcbiAgICB9XG4gIH0sXG4gIGJvdW5jZToge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIGlmICgoayAvPSAxKSA8ICgxIC8gMi43NSkpIHtcbiAgICAgICAgcmV0dXJuIDcuNTYyNSAqIGsgKiBrO1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIgLyAyLjc1KSkge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDEuNSAvIDIuNzUpKSAqIGsgKyAwLjc1O1xuICAgICAgfSBlbHNlIGlmIChrIDwgKDIuNSAvIDIuNzUpKSB7XG4gICAgICAgIHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi4yNSAvIDIuNzUpKSAqIGsgKyAwLjkzNzU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuNjI1IC8gMi43NSkpICogayArIDAuOTg0Mzc1O1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZWxhc3RpYzoge1xuICAgIHN0eWxlOiAnJyxcbiAgICBmbjogZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciBmID0gMC4yMixcbiAgICAgICAgZSA9IDAuNDtcblxuICAgICAgaWYgKGsgPT09IDApIHsgcmV0dXJuIDA7IH1cbiAgICAgIGlmIChrID09IDEpIHsgcmV0dXJuIDE7IH1cblxuICAgICAgcmV0dXJuIChlICogTWF0aC5wb3coMiwgLSAxMCAqIGspICogTWF0aC5zaW4oKGsgLSBmIC8gNCkgKiAoMiAqIE1hdGguUEkpIC8gZikgKyAxKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGVhc2luZ3M7IiwidmFyIF9lbGVtZW50U3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKS5zdHlsZTtcblxudmFyIF92ZW5kb3IgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgdmVuZG9ycyA9IFsndCcsICd3ZWJraXRUJywgJ01velQnLCAnbXNUJywgJ09UJ10sXG4gICAgdHJhbnNmb3JtLFxuICAgIGkgPSAwLFxuICAgIGwgPSB2ZW5kb3JzLmxlbmd0aDtcblxuICB3aGlsZSAoaSA8IGwpIHtcbiAgICB0cmFuc2Zvcm0gPSB2ZW5kb3JzW2ldICsgJ3JhbnNmb3JtJztcbiAgICBpZiAodHJhbnNmb3JtIGluIF9lbGVtZW50U3R5bGUpIHtcbiAgICAgIHJldHVybiB2ZW5kb3JzW2ldLnN1YnN0cigwLCB2ZW5kb3JzW2ldLmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICBpKys7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59KSgpO1xuXG5mdW5jdGlvbiBfcHJlZml4U3R5bGUgKHN0eWxlKSB7XG4gIGlmICggX3ZlbmRvciA9PT0gZmFsc2UgKSByZXR1cm4gZmFsc2U7IC8vIG5vIHZlbmRvciBmb3VuZFxuICBpZiAoIF92ZW5kb3IgPT09ICcnICkgcmV0dXJuIHN0eWxlOyAvLyBubyBwcmVmaXggbmVlZGVkXG4gIHJldHVybiBfdmVuZG9yICsgc3R5bGUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHlsZS5zdWJzdHIoMSk7IC8vIG90aGVyd2lzZSBhZGQgcHJlZml4XG59XG5cbi8vIHN0eWxlIHRoYXQgaGFzIHZlbmRvciBwcmVmaXgsIGVnOiB3ZWJraXRUcmFuc2Zvcm1cbnZhciBzdHlsZSA9IHtcbiAgdHJhbnNmb3JtOiBfcHJlZml4U3R5bGUoJ3RyYW5zZm9ybScpLFxuICB0cmFuc2l0aW9uVGltaW5nRnVuY3Rpb246IF9wcmVmaXhTdHlsZSgndHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uJyksXG4gIHRyYW5zaXRpb25EdXJhdGlvbjogX3ByZWZpeFN0eWxlKCd0cmFuc2l0aW9uRHVyYXRpb24nKSxcbiAgdHJhbnNpdGlvbkRlbGF5OiBfcHJlZml4U3R5bGUoJ3RyYW5zaXRpb25EZWxheScpLFxuICB0cmFuc2Zvcm1PcmlnaW46IF9wcmVmaXhTdHlsZSgndHJhbnNmb3JtT3JpZ2luJyksXG4gIHRvdWNoQWN0aW9uOiBfcHJlZml4U3R5bGUoJ3RvdWNoQWN0aW9uJylcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHN0eWxlOyIsInZhciBpc0JhZEFuZHJvaWQgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgYXBwVmVyc2lvbiA9IHdpbmRvdy5uYXZpZ2F0b3IuYXBwVmVyc2lvbjtcblxuICBpZiAoL0FuZHJvaWQvLnRlc3QoYXBwVmVyc2lvbikgJiYgISgvQ2hyb21lXFwvXFxkLy50ZXN0KGFwcFZlcnNpb24pKSkge1xuICAgIHZhciBzYWZhcmlWZXJzaW9uID0gYXBwVmVyc2lvbi5tYXRjaCgvU2FmYXJpXFwvKFxcZCsuXFxkKS8pO1xuICAgIGlmKHNhZmFyaVZlcnNpb24gJiYgdHlwZW9mIHNhZmFyaVZlcnNpb24gPT09IFwib2JqZWN0XCIgJiYgc2FmYXJpVmVyc2lvbi5sZW5ndGggPj0gMikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoc2FmYXJpVmVyc2lvblsxXSkgPCA1MzUuMTk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzQmFkQW5kcm9pZDsiLCJpbXBvcnQgZWFzaW5ncyBmcm9tICcuL3V0aWxzL2Vhc2luZ3MnO1xuaW1wb3J0IHN0eWxlVXRpbHMgZnJvbSAnLi91dGlscy9zdHlsZSc7XG5pbXBvcnQgaXNCYWRBbmRyb2lkIGZyb20gJy4vdXRpbHMvaXNCYWRBbmRyb2lkJztcblxuLy8gZGVhbCB3aXRoIHJlcXVlc3RBbmltYXRpb25GcmFtZSBjb21wYXRiaWxpdHlcbnZhciByQUYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lXHR8fFxuICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lXHR8fFxuICB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lXHRcdHx8XG4gIHdpbmRvdy5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lXHRcdHx8XG4gIHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZVx0XHR8fFxuICBmdW5jdGlvbiAoY2FsbGJhY2spIHsgd2luZG93LnNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MCk7IH07XG5cbmZ1bmN0aW9uIElzY3JvbGwgKGVsZW0sIG9wdGlvbnMpIHtcbiAgLyoqXG4gICAqIGdldCBzY3JvbGwgbm9kZSBlbGVtZW50XG4gICAqL1xuICB0aGlzLndyYXBwZXIgPSB0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pIDogZWxlbTtcbiAgdGhpcy5zY3JvbGxlciA9IHRoaXMud3JhcHBlci5jaGlsZHJlblswXTtcbiAgdGhpcy5zY3JvbGxlclN0eWxlID0gdGhpcy5zY3JvbGxlci5zdHlsZTtcblxuICAvKipcbiAgICogbWVyZ2UgZGVmYXVsdCBvcHRpb25zIGFuZCBjdXN0b21pemVkIG9wdGlvbnNcbiAgICovXG4gIHRoaXMub3B0aW9ucyA9IHtcbiAgICB1c2VUcmFuc2l0aW9uOiB0cnVlLFxuICAgIHVzZVRyYW5zZm9ybTogdHJ1ZVxuICB9O1xuXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9uc1tpXSA9IG9wdGlvbnNbaV07XG4gIH1cblxuXHR0aGlzLnggPSAwO1xuXHR0aGlzLnkgPSAwO1xufVxuXG5Jc2Nyb2xsLnByb3RvdHlwZSA9IHtcbiAgc2Nyb2xsVG86IGZ1bmN0aW9uICh4LCB5LCB0aW1lLCBlYXNpbmcpIHtcbiAgICBlYXNpbmcgPSBlYXNpbmcgfHwgZWFzaW5ncy5jaXJjdWxhcjtcbiAgICB0aGlzLmlzSW5UcmFuc2l0aW9uID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgdGltZSA+IDA7XG4gICAgdmFyIHRyYW5zaXRpb25UeXBlID0gdGhpcy5vcHRpb25zLnVzZVRyYW5zaXRpb24gJiYgZWFzaW5nLnN0eWxlO1xuXG4gICAgaWYgKCAhdGltZSB8fCB0cmFuc2l0aW9uVHlwZSApIHtcbiAgICAgIGlmKHRyYW5zaXRpb25UeXBlKSB7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbihlYXNpbmcuc3R5bGUpO1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uVGltZSh0aW1lKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3RyYW5zbGF0ZSh4LCB5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fYW5pbWF0ZSh4LCB5LCB0aW1lLCBlYXNpbmcuZm4pO1xuICAgIH1cbiAgfSxcblxuICBfdHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uOiBmdW5jdGlvbiAoZWFzaW5nU3R5bGUpIHtcbiAgICAvLyBhc3NpZ24gZWFzaW5nIGNzcyBzdHlsZSB0byBzY3JvbGwgY29udGFpbmVyIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiBwcm9wZXJ0eVxuICAgIC8vIGV4YW1wbGU6IGN1YmljLWJlemllcigwLjI1LCAwLjQ2LCAwLjQ1LCAwLjk0KVxuICAgIHRoaXMuc2Nyb2xsZXJTdHlsZVtzdHlsZVV0aWxzLnRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbl0gPSBlYXNpbmdTdHlsZTtcbiAgfSxcblxuICBfdHJhbnNpdGlvblRpbWU6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgLy8gaWYgZG8gbm90IHVzZSB0cmFuc2l0aW9uIHRvIHNjcm9sbCwgcmV0dXJuXG5cdFx0aWYgKCF0aGlzLm9wdGlvbnMudXNlVHJhbnNpdGlvbikge1xuXHRcdFx0cmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICB0aW1lID0gdGltZSB8fCAwO1xuICAgIC8vIHRyYW5zaXRpb25EdXJhdGlvbiB3aGljaCBoYXMgdmVuZG9yIHByZWZpeFxuICAgIHZhciBkdXJhdGlvblByb3AgPSBzdHlsZVV0aWxzLnRyYW5zaXRpb25EdXJhdGlvbjtcblx0XHRpZighZHVyYXRpb25Qcm9wKSB7IC8vIGlmIG5vIHZlbmRvciBmb3VuZCwgZHVyYXRpb25Qcm9wIHdpbGwgYmUgZmFsc2Vcblx0XHRcdHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgdGhpcy5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSB0aW1lICsgJ21zJzsgLy8gYXNzaWduIG1zIHRvIHRyYW5zaXRpb25EdXJhdGlvbiBwcm9wXG5cbiAgICBpZiAoIXRpbWUgJiYgaXNCYWRBbmRyb2lkKSB7XG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGVbZHVyYXRpb25Qcm9wXSA9ICcwLjAwMDFtcyc7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHJBRihmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHNlbGYuc2Nyb2xsZXJTdHlsZVtkdXJhdGlvblByb3BdID09PSAnMC4wMDAxbXMnKSB7XG4gICAgICAgICAgc2VsZi5zY3JvbGxlclN0eWxlW2R1cmF0aW9uUHJvcF0gPSAnMHMnO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX3RyYW5zbGF0ZTogZnVuY3Rpb24oeCx5KSB7XG4gICAgaWYgKCB0aGlzLm9wdGlvbnMudXNlVHJhbnNmb3JtICkge1xuXG4gICAgICB0aGlzLnNjcm9sbGVyU3R5bGVbc3R5bGVVdGlscy50cmFuc2Zvcm1dID0gXG4gICAgICAgICd0cmFuc2xhdGUoJyArIHggKyAncHgsJyArIHkgKyAncHgpJyArICd0cmFuc2xhdGVaKDApJztcblxuICAgIH0gZWxzZSB7XG5cdFx0XHR4ID0gTWF0aC5yb3VuZCh4KTtcbiAgICAgIHkgPSBNYXRoLnJvdW5kKHkpO1xuXHRcdFx0dGhpcy5zY3JvbGxlclN0eWxlLmxlZnQgPSB4ICsgJ3B4Jztcblx0XHRcdHRoaXMuc2Nyb2xsZXJTdHlsZS50b3AgPSB5ICsgJ3B4JztcbiAgICB9XG5cblx0XHR0aGlzLnggPSB4O1xuXHRcdHRoaXMueSA9IHk7XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IElzY3JvbGw7Il0sIm5hbWVzIjpbImVhc2luZ3MiLCJrIiwiTWF0aCIsInNxcnQiLCJiIiwiZiIsImUiLCJwb3ciLCJzaW4iLCJQSSIsIl9lbGVtZW50U3R5bGUiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzdHlsZSIsIl92ZW5kb3IiLCJ2ZW5kb3JzIiwidHJhbnNmb3JtIiwiaSIsImwiLCJsZW5ndGgiLCJzdWJzdHIiLCJfcHJlZml4U3R5bGUiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsImlzQmFkQW5kcm9pZCIsImFwcFZlcnNpb24iLCJ3aW5kb3ciLCJuYXZpZ2F0b3IiLCJ0ZXN0Iiwic2FmYXJpVmVyc2lvbiIsIm1hdGNoIiwicGFyc2VGbG9hdCIsInJBRiIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsIndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSIsIm1velJlcXVlc3RBbmltYXRpb25GcmFtZSIsIm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJtc1JlcXVlc3RBbmltYXRpb25GcmFtZSIsImNhbGxiYWNrIiwic2V0VGltZW91dCIsIklzY3JvbGwiLCJlbGVtIiwib3B0aW9ucyIsIndyYXBwZXIiLCJxdWVyeVNlbGVjdG9yIiwic2Nyb2xsZXIiLCJjaGlsZHJlbiIsInNjcm9sbGVyU3R5bGUiLCJ4IiwieSIsInByb3RvdHlwZSIsInRpbWUiLCJlYXNpbmciLCJjaXJjdWxhciIsImlzSW5UcmFuc2l0aW9uIiwidXNlVHJhbnNpdGlvbiIsInRyYW5zaXRpb25UeXBlIiwiX3RyYW5zaXRpb25UaW1pbmdGdW5jdGlvbiIsIl90cmFuc2l0aW9uVGltZSIsIl90cmFuc2xhdGUiLCJfYW5pbWF0ZSIsImZuIiwiZWFzaW5nU3R5bGUiLCJzdHlsZVV0aWxzIiwidHJhbnNpdGlvblRpbWluZ0Z1bmN0aW9uIiwiZHVyYXRpb25Qcm9wIiwidHJhbnNpdGlvbkR1cmF0aW9uIiwic2VsZiIsInVzZVRyYW5zZm9ybSIsInJvdW5kIiwibGVmdCIsInRvcCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBSUEsVUFBVTthQUNEO1dBQ0Ysc0NBREU7UUFFTCxVQUFVQyxDQUFWLEVBQWE7YUFDUkEsS0FBSyxJQUFJQSxDQUFULENBQVA7O0dBSlE7WUFPRjtXQUNELGlDQURDO1FBRUosVUFBVUEsQ0FBVixFQUFhO2FBQ1JDLEtBQUtDLElBQUwsQ0FBVSxJQUFLLEVBQUVGLENBQUYsR0FBTUEsQ0FBckIsQ0FBUDs7R0FWUTtRQWFOO1dBQ0cseUNBREg7UUFFQSxVQUFVQSxDQUFWLEVBQWE7VUFDWEcsSUFBSSxDQUFSO2FBQ08sQ0FBQ0gsSUFBSUEsSUFBSSxDQUFULElBQWNBLENBQWQsSUFBbUIsQ0FBQ0csSUFBSSxDQUFMLElBQVVILENBQVYsR0FBY0csQ0FBakMsSUFBc0MsQ0FBN0M7O0dBakJRO1VBb0JKO1dBQ0MsRUFERDtR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

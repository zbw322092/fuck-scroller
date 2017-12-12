import easings from './utils/easings';
import styleUtils from './utils/style';
import isBadAndroid from './utils/isBadAndroid';
import getTime from './utils/getTime';

// deal with requestAnimationFrame compatbility
var rAF = window.requestAnimationFrame	||
  window.webkitRequestAnimationFrame	||
  window.mozRequestAnimationFrame		||
  window.oRequestAnimationFrame		||
  window.msRequestAnimationFrame		||
  function (callback) { window.setTimeout(callback, 1000 / 60); };

function Iscroll (elem, options) {
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

    if ( !time || transitionType ) {
      if(transitionType) {
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
    this.scrollerStyle[styleUtils.transitionTimingFunction] = easingStyle;
  },

  _transitionTime: function (time) {
    // if do not use transition to scroll, return
		if (!this.options.useTransition) {
			return;
    }
    
    time = time || 0;
    // transitionDuration which has vendor prefix
    var durationProp = styleUtils.transitionDuration;
		if(!durationProp) { // if no vendor found, durationProp will be false
			return;
    }
    
    this.scrollerStyle[durationProp] = time + 'ms'; // assign ms to transitionDuration prop

    if (!time && isBadAndroid) {
      this.scrollerStyle[durationProp] = '0.0001ms';
      var self = this;

      rAF(function() {
        if (self.scrollerStyle[durationProp] === '0.0001ms') {
          self.scrollerStyle[durationProp] = '0s';
        }
      });
    }
  },

  _translate: function(x,y) {
    if ( this.options.useTransform ) {

      this.scrollerStyle[styleUtils.transform] = 
        'translate(' + x + 'px,' + y + 'px)' + 'translateZ(0)';

    } else {
			x = Math.round(x);
      y = Math.round(y);
			this.scrollerStyle.left = x + 'px';
			this.scrollerStyle.top = y + 'px';
    }

		this.x = x;
		this.y = y;
  },

  _animate: function(destX, destY, duration, easingFn) {
		var that = this,
    startX = this.x,
    startY = this.y,
    startTime = getTime(),
    destTime = startTime + duration;

    function step () {
      var now = getTime(),
        newX, newY,
        easing;

      if (now >= destTime) {
        that.isAnimating = false;
        that._translate(destX, destY);

        return;
      }

      now = ( now - startTime ) / duration;
      easing = easingFn(now);
      newX = ( destX - startX ) * easing + startX;
      newY = ( destY - startY ) * easing + startY;
      that._translate(newX, newY);

			if ( that.isAnimating ) {
				rAF(step);
			}
    }

    this.isAnimating = true;
    step();
  }
};

export default Iscroll;
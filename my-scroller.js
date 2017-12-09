class MyScroller {
  constructor (defaultDuration, edgeOffset) {
    this.defaultDuration = defaultDuration || 999;
    if (!edgeOffset && edgeOffset !== 0) {
      this.edgeOffset = 9; // default 9 pixel edge offset
    }

    this._docElem = document.documentElement;
    this._body = document.scrollingElement || document.body;
    this._scrollTimeoutId = undefined;
  }


  _toY (y) {
    window.scrollTo(0, y);
  }

  _getDocY () {
    return window.scrollY || this._docElem.scrollTop; // pixles already scrolled up
  }

  _getHeight () {
    return window.innerHeight || this._docElem.clientHeight;
  }

  _getTopOf (elem) {
    return elem.getBoundingClientRect().top +
      this._getDocY() - this._docElem.offsetTop;
  }

  _nativeSmoothScrollEnable (elem) {
    return ('getComputedStyle' in window) && // support since IE 9
      window.getComputedStyle(elem)['scroll-behavior'] === 'smooth';
  }

  _setScrollTimeoutId (id) {
    this._scrollTimeoutId = id;
  }

  _stopScroll () {
    clearTimeout(this._scrollTimeoutId);
    this._setScrollTimeoutId(0);
  }

  _getTopYPositionWithOffset (elem) {
    return Math.max(0, this._getTopOf(elem) - this.edgeOffset); // default scroll to page top
  }

  /**
   * scroll to Y position
   * @param {number} targetY Y postion in pixel
   * @param {number} duration scroll duration in ms
   * @param {number} callback callback function executed after scroll end
   */
  scrollToY (targetY, duration, callback) {
    this._stopScroll();
    /**
     * if duration is 0 or smaller than 0, and 'scroll-behavior' is set as
     * smooth on document.scrollingElement or document.body, we use native
     * window.scrollTo method to scroll page.
     */
    if (duration <= 0 || this._nativeSmoothScrollEnable(this._body)) {
      this._toY(targetY);
      if (callback) {
        callback();
      }
    } else {
      let startY = this._getDocY();
      let distance = Math.max(0, targetY) - startY;
      let startTime = new Date().getTime();
      duration = duration || Math.min(Math.abs(distance), this.defaultDuration);

      let loopScroll;
      (loopScroll = () => {
        setTimeout(() => {
          let p = Math.min(1, (Date.now() - startTime) / duration);
          let y = Math.max(0, Math.floor(startY + distance*(p < 0.5 ? 2*p*p : p*(4 - p*2)-1)));
          console.log('y distance: ', y);
          this._toY(y);
  
          /**
           * reference: 
           * https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#Problems_and_solutions
           */
          if (p < 1 && (this._getHeight() + y) < this._body.scrollHeight) {
            loopScroll()
          } else {
            setTimeout(this._stopScroll.bind(this), 99);
            if (callback) {
              callback();
            }
          }
        }, 9);
      })()
    }
  }


  /**
   * scroll to target element
   * @param {object} elem scroll to target element
   * @param {number} duration scroll duration in ms
   * @param {number} callback callback function executed after scroll end
   */
  scrollToElem (elem, duration, callback) {
    let YPosition = this._getTopYPositionWithOffset(elem);
    this.scrollToY(YPosition, duration, callback);
  }
}
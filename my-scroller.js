class MyScroller {
  constructor (elem, defaultDuration, edgeOffset) {
    this.elem = elem;
    this._docElem = document.documentElement;
    this._body = document.scrollingElement || document.body;
    this.defaultDuration = defaultDuration || 999;
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

  _getTopOf () {
    return this.elem.getBoundingClientRect().top +
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

}
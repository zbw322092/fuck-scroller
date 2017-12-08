class MyScroller {
  constructor (elem) {
    this.elem = elem;
    this._docElem = document.documentElement;
    this._body = document.scrollingElement || document.body;
  }


  _toY (y) {
    window.scrollTo(0, y);
  }

  _getDocY () {
    return window.scrollY || this._docElem.scrollTop;
  }

  _getHeight () {
    return window.innerHeight || this._docElem.clientHeight;
  }

  _getTopOf () {
    return this.elem.getBoundingClientRect().top +
      this._getDocY() - this._docElem.offsetTop;
  }

  _nativeSmoothScrollEnable (elem) {
    console.log(window.getComputedStyle(elem)['scroll-behavior']);
    return ('getComputedStyle' in window) && // support from IE 9
      window.getComputedStyle(elem)['scroll-behavior'] === 'smooth';
  }


  scrollToY (targetY, duration, callback) {
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
      console.log(1111);
    }
  }

}
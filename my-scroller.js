class MyScroller {
  constructor (container, defaultDuration, edgeOffset) {
    if (Object.prototype.toString.call(container) !== "[object HTMLDivElement]") {
      // if container is not provided, default container is this webpage
      container = document.scrollingElement || document.body;
      this._customizedContainer = false;
    } else {
      this._customizedContainer = true;
    }
    this.defaultDuration = defaultDuration || 999;
    if (!edgeOffset && edgeOffset !== 0) {
      this.edgeOffset = 9; // default 9 pixel edge offset
    }

    this._docElem = document.documentElement;
    this._container = container;
    this._scrollTimeoutId = undefined;
  }


  _toY (y) {
    if (this._customizedContainer) {
      this._container.scrollTop = y;
    } else {
      window.scrollTo(0, y);
    }
  }

  _scrolledUp () {
    if (this._customizedContainer) {
      return this._container.scrollTop;
    } else {
      return window.scrollY || this._docElem.scrollTop; // pixles already scrolled up
    }
  }

  _getHeight () {
    if (this._customizedContainer) {
      return Math.min(this._container.clientHeight, window.innerHeight || docElem.clientHeight);
    } else {
      return window.innerHeight || this._docElem.clientHeight;
    }
  }

  _getAbsoluteTopOf (elem) {
    if (this._customizedContainer) {
      return elem.offsetTop;
    } else {
      return elem.getBoundingClientRect().top +
        this._scrolledUp() - this._docElem.offsetTop;
    }
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

  _getAbsoluteTopOfWithOffset (elem) {
    return Math.max(0, this._getAbsoluteTopOf(elem) - this.edgeOffset); // default scroll to page top
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
    if (duration <= 0 || this._nativeSmoothScrollEnable(this._container)) {
      this._toY(targetY);
      if (callback) {
        callback();
      }
    } else {
      let startY = this._scrolledUp();
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
          if (p < 1 && (this._getHeight() + y) < this._container.scrollHeight) {
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
   * @param {function} callback callback function executed after scroll end
   */
  scrollToElem (elem, duration, callback) {
    let YPosition = this._getAbsoluteTopOfWithOffset(elem);
    this.scrollToY(YPosition, duration, callback);
  }

  /**
   * Scroll element into view if necessary
   * @param {object} elem target element
   * @param {number} duration scroll duration in ms
   * @param {function} callback callback function executed after scroll end
   */
  scrollIntoView (elem, duration, callback) {
    let elemHeight = elem.getBoundingClientRect().height;
    let elemBottomAbsY = this._getAbsoluteTopOf(elem) + elemHeight;
    let windowHeight = this._getHeight();
    let y = this._scrolledUp();
    let windowAbsoluteBottomY = y + windowHeight;

    if (this._getAbsoluteTopOfWithOffset(elem) < y || 
      (elemHeight + this.edgeOffset) > windowHeight) {
      /**
       * Element top is clipped by screen top edge or element higher than screen.
       * Place element at the TOP of window, with offset.
       */
      this.scrollToElem(elem, duration, callback);
    } else if ((elemBottomAbsY + this.edgeOffset) > windowAbsoluteBottomY) {
      /**
       * Element botton is clipped by screen bottom edge.
       * Place element at the BOTTOM of window, with offset.
       */ 
      this.scrollToY(elemBottomAbsY - windowHeight + this.edgeOffset, duration, callback);
    } else if (callback) {
      /**
       * no scroll needed, just executing callback if provided.
       */
      callback();
    }
  }

  /**
   * 
   * @param {object} elem target element
   * @param {number} duration scroll duration in ms
   * @param {number} offset offset in pixel
   * @param {function} callback callback function executed after scroll end
   */
  scrollToCenterOf(elem, duration, offset, callback) {
    let absTop = this._getAbsoluteTopOf(elem);
    let halfHeight = this._getHeight() / 2;
    offset = offset || elem.getBoundingClientRect().height / 2;

    this.scrollToY(Math.max(0, absTop - halfHeight + offset), duration, callback);
  }
}
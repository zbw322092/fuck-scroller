let container = document.querySelector('.container');
let elem = document.querySelector('.list-2');
let button = document.querySelector('#scrollHandler');

let iscroll = new Iscroll(container, {
  useTransition: false
});

button.addEventListener('click', () => {
  // iscroll.scrollTo(0, 400, 2000);

  iscroll.scrollTo(0, 400, 2000, {
    fn: function (k) {
      if ((k /= 1) < (1 / 2.75)) {
        return 7.5625 * k * k;
      } else if (k < (2 / 2.75)) {
        return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
      } else if (k < (2.5 / 2.75)) {
        return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
      } else {
        return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
      }
    }
  });
});
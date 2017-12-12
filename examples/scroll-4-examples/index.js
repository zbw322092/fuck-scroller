let container = document.querySelector('.container');
let elem = document.querySelector('.list-2');
let button = document.querySelector('#scrollHandler');

let iscroll = new Iscroll(container);

button.addEventListener('click', () => {
  iscroll.scrollTo(0, 400, 2000);
});
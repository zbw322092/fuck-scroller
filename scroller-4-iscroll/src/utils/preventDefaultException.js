var preventDefaultException = function (el, exceptions) {
  for (var i in exceptions) {
    if ( exceptions[i].test(el[i]) ) {
      return true;
    }
  }

  return false;
};

export default preventDefaultException;
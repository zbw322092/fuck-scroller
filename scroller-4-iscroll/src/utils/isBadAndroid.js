var isBadAndroid = (function () {
  var appVersion = window.navigator.appVersion;

  if (/Android/.test(appVersion) && !(/Chrome\/\d/.test(appVersion))) {
    var safariVersion = appVersion.match(/Safari\/(\d+.\d)/);
    if(safariVersion && typeof safariVersion === "object" && safariVersion.length >= 2) {
      return parseFloat(safariVersion[1]) < 535.19;
    } else {
      return true;
    }
  } else {
    return false;
  }
})();

export default isBadAndroid;
// technique from "http://stackoverflow.com/questions/11887934/check-if-daylight-saving-time-is-in-effect-and-if-it-is-for-how-many-hours"
Date.prototype.getStdTimezoneOffset = function() {
  var jan = new Date(this.getFullYear(), 0, 1);
  var jul = new Date(this.getFullYear(), 6, 1);
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.isDst = function() {
  return this.getTimezoneOffset() < this.getStdTimezoneOffset();
}

function toConsole() {
  if (window.console) {
    window.console.log.apply(window.console, arguments);
  }
}

function getSortedKeys(o) {
  var keys = [];
  for (var key in o) { keys.push(key); }
  keys.sort(function(a, b) { return ((o[a] < o[b]) ? -1 : ((o[a] > o[b]) ? +1 : 0)); });
  return keys;
}



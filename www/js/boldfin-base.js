/*
Copyright 2014 Ben Gimpert

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
    
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

function toConsole() {
  if (window.console) {
    window.console.log.apply(window.console, arguments);
  }
}

// technique from "http://stackoverflow.com/questions/11887934/check-if-daylight-saving-time-is-in-effect-and-if-it-is-for-how-many-hours"
Date.prototype.getStdTimezoneOffset = function() {
  var jan = new Date(this.getFullYear(), 0, 1);
  var jul = new Date(this.getFullYear(), 6, 1);
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.isDst = function() {
  return this.getTimezoneOffset() < this.getStdTimezoneOffset();
}

function getDatestampEpochTime(s) {
  var tz = ((new Date(s).isDst()) ? "-04:00" : "-05:00");
  return new Date(s + "T16:30:00" + tz) / 1000;
}

function getEpochTimeDatestamp(t) {
  var date = new Date(t * 1000);
  var s = date.getFullYear();
  s += "-";
  var monthNum = date.getMonth() + 1;
  if (monthNum < 10) {
    s += "0";
  }
  s += monthNum;
  s += "-";
  if (date.getDate() < 10) {
    s += "0";
  }
  s += date.getDate();
  return s;
}

function toPrettyTimestamp(t) {
  return "" + (new Date(t * 1000));
}

function getSortedKeys(o) {
  var keys = [];
  for (var key in o) { keys.push(key); }
  keys.sort(function(a, b) { return ((o[a] < o[b]) ? -1 : ((o[a] > o[b]) ? +1 : 0)); });
  return keys;
}



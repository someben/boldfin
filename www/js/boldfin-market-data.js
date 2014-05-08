/* Copyright 2014 Ben Gimpert Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
    
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

function getQuandlStockPriceTimeSeries(ticker, exch) {
  var url = "http://www.quandl.com/api/v1/datasets/GOOG/" + exch + "_" + ticker;
  if (getQuandlCredentials().authToken) {
    url += "?auth_token=" + getQuandlCredentials().authToken;
  }
  else {
    toConsole("Requesting URL anonymously", url);
  }

  toConsole("About to call out to Quandl API w/ URL:", url);
  var data = null;
  $.ajax({
    url: url,
    async: false,
    success: function(ajaxResult) {
      toConsole("Got data back from Quandl", ajaxResult);
      data = ajaxResult;
    }
  });
  return data;
}

function getStockPriceTimeSeries(ticker, exch) {
  var ts = {};
  var quandlTs = getQuandlStockPriceTimeSeries(ticker, exch);
  for (var j=0; j < quandlTs.data.length; j++) {
    var tsRow = {};
    var tsRowTime = null;
    for (var i=0; i < quandlTs.column_names.length; i++) {
      var featureName = quandlTs.column_names[i].toLowerCase();
      var featureVal = quandlTs.data[j][i];
      if (! featureVal) {
        continue;
      }
      if (featureName == "date") {
        tsRowTime = getDatestampEpochTime(featureVal);
      }
      else {
        tsRow[featureName] = featureVal;
      }
    }
    if (! tsRowTime) {
      continue;
    }
    ts[tsRowTime] = tsRow;
  }
  return ts;
}

var fundamentalTs = {};

function getFundamentalTimeSeries() {
  return fundamentalTs;
}

function registerFundamentalData(o) {
  var t = getDatestampEpochTime(o["Date"]);
  if (! fundamentalTs[t]) {
    fundamentalTs[t] = {};
  }
  for (var oFeat in o) {
    if (oFeat == "Date") {
      continue;
    }
    var oFeatCols = oFeat.split(":");
    var ticker = oFeatCols[0];
    var exch = oFeatCols[1];
    var fundamental = oFeatCols[2];
    var feat = [ticker, exch, fundamental.toLowerCase().replace(new RegExp("[^a-z]", "g"), "_")].join(":");
    fundamentalTs[t][feat] = o[oFeat];
  }
  var fundamentalTsLen = getTimeSeriesLength(fundamentalTs);
  if ((fundamentalTsLen % 50) == 0) {
    toConsole("Registered", fundamentalTsLen, "length fundamental time series", fundamentalTs[t], "at time", t);
  }
}


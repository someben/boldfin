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

function _getQuandlStockPriceTimeSeries(exch, ticker) {
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

var tmpData = null;
function tmpCallback(data) { tmpData = data; }
function getQuandlStockPriceTimeSeries(exch, ticker) { return tmpData; }

function getStockPriceTimeSeries(exch, ticker) {
  var ts = {};
  var quandlTs = getQuandlStockPriceTimeSeries(exch, ticker);
  for (var j=0; j < quandlTs.data.length; j++) {
    var tsRow = {};
    var tsRowTime = null;
    for (var i=0; i < quandlTs.column_names.length; i++) {
      var featureName = quandlTs.column_names[i].toLowerCase();
      var featureVal = quandlTs.data[j][i];
      if (featureName == "date") {
        var quandlTsRowTimeTz = ((new Date(featureVal).isDst()) ? "-04:00" : "-05:00");
        tsRowTime = new Date(featureVal + "T16:30:00" + quandlTsRowTimeTz) / 1000;
      }
      else {
        tsRow[featureName] = featureVal;
      }
    }
    ts[tsRowTime] = tsRow;
  }
  return ts;
}



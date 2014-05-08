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

function cloneTimeSeriesRow(tsRow, featureNamePrefix) {
  var newTsRow = {}
  for (var featureName in tsRow) {
    var newFeatureName = null;
    if (typeof featureNamePrefix == "undefined") {
      newFeatureName = featureName;
    }
    else {
      newFeatureName = featureNamePrefix + featureName;
    }
    newTsRow[newFeatureName] = tsRow[featureName];
  }
  return newTsRow;
}

function cloneTimeSeries(ts, featureNamePrefix) {
  var newTs = {};
  for (var t in ts) {
    newTs[t] = cloneTimeSeriesRow(ts[t], featureNamePrefix);
  }
  return newTs;
}

function getTimeSeriesTimes(ts) {
  var tsTimes = [];
  for (var t in ts) {
    tsTimes.push(t);
  }
  tsTimes.sort();
  return tsTimes;
}

function mergeTimeSeries(ts1, ts2) {
  var newTs = cloneTimeSeries(ts1);
  for (var t in ts2) {
    if (! newTs[t]) {
      newTs[t] = {};
    }
    for (var featureName in ts2[t]) {
      newTs[t][featureName] = ts2[t][featureName];
    }
  }
  return newTs;
}

function getTimeSeriesRowFeatureNames(tsRow) {
  var tsRowFeatureNames = [];
  for (var featureName in tsRow) {
    tsRowFeatureNames.push(featureName);
  }
  tsRowFeatureNames.sort();
  return tsRowFeatureNames;
}

function getTimeSeriesLength(ts) {
  return getTimeSeriesTimes(ts).length;
}

function getTimeSeriesFeatureNames(ts) {
  var featureNames = [];
  for (var t in ts) {
    for (var featureName in ts[t]) {
      if (featureNames.indexOf(featureName) == -1) {
        featureNames.push(featureName);
      }
    }
  }
  featureNames.sort();
  return featureNames;
}

function getTimeSeriesDimensionality(ts) {
  return getTimeSeriesFeatureNames(ts).length;
}

function addDiffFeatures(ts, featureName, diffWin, diffFn) {
  var newTs = cloneTimeSeries(ts);
  var tsRowTimes = getTimeSeriesTimes(ts);
  for (var i = diffWin; i < tsRowTimes.length; i++) {
    var tsRowTime1 = tsRowTimes[i - diffWin];
    var tsRowTime2 = tsRowTimes[i];
    if (ts[tsRowTime1][featureName] && ts[tsRowTime2][featureName]) {
      var diffFeatureVal = diffFn(ts[tsRowTime1][featureName], ts[tsRowTime2][featureName]);
      if (! diffFeatureVal) {
        continue;
      }
      var diffFeatureName = featureName + "(-" + diffWin + " diff)";
      newTs[tsRowTime2][diffFeatureName] = diffFeatureVal;
    }
  }
  return newTs;
};

function addVarFeatures(ts, featureName, varWin, varFn) {
  var newTs = cloneTimeSeries(ts);
  var tsRowTimes = getTimeSeriesTimes(ts);
  for (var i = varWin; i < tsRowTimes.length; i++) {
    var tsRowTime2 = tsRowTimes[i];
    var featureVals = [];
    for (var tIndex = i - varWin; tIndex <= i; tIndex++) {
      var t = tsRowTimes[tIndex];
      featureVals.push(ts[t][featureName]);
    }
    var varFeatureVal = varFn(featureVals);
    if (! varFeatureVal) {
      continue;
    }
    var varFeatureName = featureName + "(-" + varWin + " var)";
    newTs[tsRowTime2][varFeatureName] = varFeatureVal;
  }
  return newTs;
};

function getSymbolTimeSeries(syms, diffWin, diffFn, varWin, varFn) {
  var ts = null;
  for (var i=0; i < syms.length; i++) {
    var sym = syms[i];
    var symEls = sym.split(":");
    var ticker = symEls[0];
    var exch = symEls[1];

    var symTs = getStockPriceTimeSeries(exch, ticker);
    var featureNames = getTimeSeriesFeatureNames(symTs);
    for (var j=0; j < featureNames.length; j++) {
      var featureName = featureNames[j];
      if (diffWin > 0) {
        toConsole("Adding difference features", sym, featureName);
        for (var diffWin1 = 1; diffWin1 <= diffWin; diffWin1++) {
          symTs = addDiffFeatures(symTs, featureName, diffWin1, diffFn);
        }
      }
      if (varWin > 0) {
        toConsole("Adding variance features", sym, featureName);
        for (var varWin1 = 1; varWin1 <= varWin; varWin1++) {
          symTs = addVarFeatures(symTs, featureName, varWin1, varFn);
        }
      }
    }
    symTs = cloneTimeSeries(symTs, sym + ":");
    if (ts) {
      ts = mergeTimeSeries(ts, symTs);
    }
    else {
      ts = symTs;
    }
  }
  return ts;
}

function extractForecastTimeSeries(ts, featureName, forecastWin, diffFn) {
  var newTs = {};
  var tsRowTimes = getTimeSeriesTimes(ts);
  for (var i=0; i < tsRowTimes.length - forecastWin; i++) {
    var tsRowTime1 = tsRowTimes[i];
    var tsRowTime2 = tsRowTimes[i + forecastWin];
    newTs[tsRowTime1] = {};
    if (ts[tsRowTime1][featureName] && ts[tsRowTime2][featureName]) {
      var diffFeatureVal = diffFn(ts[tsRowTime1][featureName], ts[tsRowTime2][featureName]);
      if (! diffFeatureVal) {
        continue;
      }
      var forecastFeatureName = featureName + "(+" + forecastWin + " fwd)";
      newTs[tsRowTime1][forecastFeatureName] = diffFeatureVal;
    }
  }
  return newTs;
};

function selectTimeSeriesRows(ts, fn) {
  var newTs = {};
  var tsRowTimes = getTimeSeriesTimes(ts);
  for (var i=0; i < tsRowTimes.length; i++) {
    var t = tsRowTimes[i];
    if (fn(t, ts[t])) {
      newTs[t] = cloneTimeSeriesRow(ts[t]);
    }
  }
  return newTs;
}

function selectTimeSeriesFeatures(ts, fn) {
  var newTs = {};
  var tsRowTimes = getTimeSeriesTimes(ts);
  for (var i=0; i < tsRowTimes.length; i++) {
    var t = tsRowTimes[i];
    var newTsRow = {}
    for (var featureName in ts[t]) {
      if (! fn(t, featureName)) {
        continue;
      }
      newTsRow[featureName] = ts[t][featureName];
    }
    newTs[t] = newTsRow;
  }
  return newTs;
}

function mapTimeSeriesFeatureVals(ts, featureName, fn) {
  var newTs = {};
  var tsRowTimes = getTimeSeriesTimes(ts);
  for (var i=0; i < tsRowTimes.length; i++) {
    var t = tsRowTimes[i];
    newTs[t] = cloneTimeSeriesRow(ts[t]);
    var newFeatureVal = fn(t, ts[t][featureName]);
    if (! newFeatureVal) {
      continue;
    }
    newTs[t][featureName] = newFeatureVal;
  }
  return newTs;
}

function removeSparseTimeSeriesRows(ts, sparsityFilter) {
  var minNumDims = Math.round(getTimeSeriesDimensionality(ts) * sparsityFilter);
  ts = selectTimeSeriesRows(ts, function(t, tsRow) {
    return getTimeSeriesRowFeatureNames(tsRow).length >= minNumDims;
  });
  toConsole("Filtered down to time series w/ dimensionality & length", getTimeSeriesDimensionality(ts), getTimeSeriesLength(ts));
  return ts;
}

function standardizeTimeSeries(ts) {
  var newTs = cloneTimeSeries(ts);
  var featureNames = getTimeSeriesFeatureNames(ts);
  var featureDist = {};
  for (var i=0; i < featureNames.length; i++) {
    var featureName = featureNames[i];
    featureDist[featureName] = {};

    var featureVals = [];
    mapTimeSeriesFeatureVals(ts, featureName, function(t, featureVal) { featureVals.push(featureVal); });
    featureDist[featureName].mean = Dist.getMean(featureVals);
    featureDist[featureName].stdev = Dist.getStandardDeviation(featureVals);
    toConsole("For feature", featureName, "found", featureDist[featureName].mean, "mean", featureDist[featureName].stdev, "standard deviation");
    newTs = mapTimeSeriesFeatureVals(newTs, featureName, function(t, featureVal) {
      return (featureVal - featureDist[featureName].mean) / featureDist[featureName].stdev;
    });
  }
  return {
    ts: newTs,
    featureDist: featureDist
  };
}

function discretizeStandardizedFeatureVal(featureVal, numBuckets) {
  var stdevRange = 3.0;
  return Math.max(0, Math.min(numBuckets - 1,
    Math.floor(numBuckets * ((stdevRange + (featureVal / stdevRange)) / (stdevRange * 2)))));
}

function discretizeStandardizedTimeSeries(ts) {
  var numBuckets = 100;
  var featureNames = getTimeSeriesFeatureNames(ts);
  var discTs = cloneTimeSeries(ts);
  for (var i=0; i < featureNames.length; i++) {
    var featureName = featureNames[i];
    toConsole("Discretizing time series", featureName);
    discTs = mapTimeSeriesFeatureVals(discTs, featureName, function(t, featureVal) {
      if (featureVal) {
        return discretizeStandardizedFeatureVal(featureVal, numBuckets);
      }
      else {
        return featureVal;  // example does not have this feature (i.e. sparse)
      }
    });
  }
  return discTs;
}

function rankTimeSeriesFeatures(contTs, contTargetTs) {
  var tsLen = getTimeSeriesLength(contTs);
  var ts = discretizeStandardizedTimeSeries(contTs);
  var targetTs = discretizeStandardizedTimeSeries(contTargetTs);

  var featureNames = getTimeSeriesFeatureNames(ts);
  var featureCounts = {};
  for (var i=0; i < featureNames.length; i++) {
    var featureName = featureNames[i];
    featureCounts[featureName] = {};
    mapTimeSeriesFeatureVals(ts, featureName, function(t, featureVal) {
      if (! featureCounts[featureName][featureVal]) {
        featureCounts[featureName][featureVal] = 0;
      }
      featureCounts[featureName][featureVal] += 1;
    });
  }

  var targetFeatureName = getTimeSeriesFeatureNames(targetTs)[0];
  var targetFeatureCounts = {};
  mapTimeSeriesFeatureVals(targetTs, targetFeatureName, function(t, featureVal) {
    if (! targetFeatureCounts[featureVal]) {
      targetFeatureCounts[featureVal] = 0;
    }
    targetFeatureCounts[featureVal] += 1;
  });

  var featureInfs = {};
  for (var i=0; i < featureNames.length; i++) {
    var featureName = featureNames[i];
    var featureInf = 0;
    for (var featureVal in featureCounts[featureName]) {
      var featureValProb = featureCounts[featureName][featureVal] / tsLen;
      for (var targetFeatureVal in targetFeatureCounts) {
        var targetFeatureValProb = targetFeatureCounts[targetFeatureVal] / tsLen;
        var matchTs = selectTimeSeriesRows(ts, function(t, tsRow) {
          return (tsRow[featureName] == featureVal) && targetTs[t] && (targetTs[t][targetFeatureName] == targetFeatureVal);
        });
        var jointProb = getTimeSeriesLength(matchTs) / tsLen;
        if (jointProb > 0) {
          featureInf += jointProb * Math.log2(jointProb / (featureValProb * targetFeatureValProb));
        }
      }
    }
    toConsole("Mutual information for", featureName, featureInf, "versus", targetFeatureName);
    featureInfs[featureName] = featureInf;
  }

  var sortedFeatureNames = getSortedKeys(featureInfs);
  sortedFeatureNames.reverse();
  toConsole("Features sorted by mutual information", sortedFeatureNames);
  return sortedFeatureNames;
}

function selectTimeSeriesFeatureMutualInfo(ts, targetTs, numTopFeatures) {
  var topFeatureNames = rankTimeSeriesFeatures(ts, targetTs).slice(0, numTopFeatures);
  return selectTimeSeriesFeatures(ts, function(t, featureName) { return topFeatureNames.indexOf(featureName) != -1 });
}

function getTimeSeriesRowSim(featureNames, a, b) {
  // cosine distance, to better handle sparsity
  var cosNumer = 0;
  var aCosDenom = 0;
  var bCosDenom = 0;
  for (var i=0; i < featureNames.length; i++) {
    var featureName = featureNames[i];
    var aVal = 0;
    if (a[featureName]) {
      aVal = a[featureName];
    }
    var bVal = 0;
    if (b[featureName]) {
      bVal = b[featureName];
    }
    cosNumer += aVal * bVal;
    aCosDenom += aVal * aVal;
    bCosDenom += bVal * bVal;
  }
  aCosDenom = Math.sqrt(aCosDenom);
  bCosDenom = Math.sqrt(bCosDenom);
  return cosNumer / (aCosDenom * bCosDenom);
}

function getNearestTimeSeries(ts, targetTsRow, n) {
  var featureNames = getTimeSeriesFeatureNames(ts);
  var tsRowTimes = getTimeSeriesTimes(ts);
  var sims = {};
  for (var i=0; i < tsRowTimes.length; i++) {
    var tsRowTime = tsRowTimes[i];
    var tsRow = ts[tsRowTime];
    var sim = getTimeSeriesRowSim(featureNames, targetTsRow, tsRow);
    sims[tsRowTime] = sim;
  }
  var sortedTsRowTimes = getSortedKeys(sims);
  sortedTsRowTimes.reverse();
  sortedTsRowTimes = sortedTsRowTimes.slice(0, n);
  var nearestTs = selectTimeSeriesRows(ts, function(t, tsRow) { return sortedTsRowTimes.indexOf(t) != -1 });
  return nearestTs;
}

$(document).ready(function() {
  //var syms = ["NFLX:NASDAQ", "GOOG:NASDAQ"];
var syms = ["NFLX:NASDAQ"]; // TODO testing
  var targetSym = syms[0];

  //var diffWin = 3;
  //var varWin = 5;
var diffWin = 1; // TODO testing
var varWin = 0; // TODO testing
  var forecastWin = 5;  // five trading days
  var sparsityFilter = 0.50;
  var numTopFeatures = 3;
  var kNearest = 3;

  var deltaFn = function(x1, x2) {
    return (x2 - x1) / x1;
  };
  var logRetFn = function(x1, x2) {
    return Math.log(x2 / x1);
  };
  var stdevFn = function(xs) {
    return Dist.getStandardDeviation(xs);
  };

  var ts = getSymbolTimeSeries(syms, diffWin, deltaFn, varWin, stdevFn);
ts = selectTimeSeriesRows(ts, function(t, tsRow) { return t >= 1388563200 }); // TODO testing
  toConsole("Built symbol time series", ts);
  var targetFeatureName = targetSym + ":close";
  var targetTs = extractForecastTimeSeries(ts, targetFeatureName, forecastWin, deltaFn);
  toConsole("Extracted target time series", targetFeatureName, targetTs);
  
  var result = standardizeTimeSeries(ts);
  var stdTs = result.ts; var featureDist = result.featureDist;
  var result = standardizeTimeSeries(targetTs);
  var stdTargetTs = result.ts; var targetFeatureDist = result.featureDist;
  toConsole("Standardized time series", stdTs, stdTargetTs);

  stdTs = removeSparseTimeSeriesRows(stdTs, sparsityFilter);
  stdTs = selectTimeSeriesFeatureMutualInfo(stdTs, stdTargetTs, numTopFeatures);
  toConsole("Selected time series", stdTs);

  var targetFeatureName = getTimeSeriesFeatureNames(targetTs)[0];
  var tsRowTimes = getTimeSeriesTimes(stdTs);
  for (var i=0; i < tsRowTimes.length; i++) {
    var tsRowTime = tsRowTimes[i];

    var nearestTs = getNearestTimeSeries(stdTs, stdTs[tsRowTime], kNearest);
    var nearestTsRowTimes = getTimeSeriesTimes(nearestTs);
    var nearestTargetTs = selectTimeSeriesRows(targetTs, function(t, tsRow) { return nearestTsRowTimes.indexOf(t) != -1 });

    var preds = [];
    mapTimeSeriesFeatureVals(nearestTargetTs, targetFeatureName, function(t, featureVal) { preds.push(featureVal); });
    var meanPred = Dist.getMean(preds);
    toConsole("At time", toPrettyTimestamp(tsRowTime), "found", getTimeSeriesLength(nearestTargetTs), "of", kNearest, "near targets", nearestTargetTs, "prediction", meanPred);
  }
});


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

    var symTs = getStockPriceTimeSeries(ticker, exch);
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
  var newTs = selectTimeSeriesRows(ts, function(t, tsRow) {
    return getTimeSeriesRowFeatureNames(tsRow).length >= minNumDims;
  });
  toConsole("Removed spare time series rows, from", getTimeSeriesLength(ts), "to", getTimeSeriesLength(newTs));
  return newTs;
}

function standardizeTimeSeries(ts, prevFeatureDist) {
  var featureNames = getTimeSeriesFeatureNames(ts);
  var featureDist = {};
  for (var i=0; i < featureNames.length; i++) {
    var featureName = featureNames[i];
    featureDist[featureName] = {};
    if (typeof prevFeatureDist == "undefined") {
      var featureVals = [];
      mapTimeSeriesFeatureVals(ts, featureName, function(t, featureVal) { featureVals.push(featureVal); });
      featureDist[featureName].mean = Dist.getMean(featureVals);
      featureDist[featureName].stdev = Dist.getStandardDeviation(featureVals);
      toConsole("For feature", featureName, "found", featureDist[featureName].mean, "mean", featureDist[featureName].stdev, "standard deviation");
    }
    else if (prevFeatureDist[featureName]) {
      featureDist[featureName] = prevFeatureDist[featureName];
      toConsole("For feature", featureName, "using previous", featureDist[featureName].mean, "mean", featureDist[featureName].stdev, "standard deviation");
    }
  }

  var newFeatureNames = [];
  for (var featureName in featureDist) {
    newFeatureNames.push(featureName);
  }
  var newTs = selectTimeSeriesFeatures(ts, function(t, featureName) {
    return newFeatureNames.indexOf(featureName) != -1;
  });
  for (var i=0; i < newFeatureNames.length; i++) {
    var featureName = newFeatureNames[i];
    newTs = mapTimeSeriesFeatureVals(newTs, featureName, function(t, featureVal) {
      return (featureVal - featureDist[featureName].mean) / featureDist[featureName].stdev;
    });
  }

  toConsole("After standardizing", getTimeSeriesDimensionality(ts), "to", getTimeSeriesDimensionality(newTs), "dimensions")
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
      featureCounts[featureName][featureVal]++;
    });
  }

  var targetFeatureName = getTimeSeriesFeatureNames(targetTs)[0];
  var targetFeatureCounts = {};
  mapTimeSeriesFeatureVals(targetTs, targetFeatureName, function(t, featureVal) {
    if (! targetFeatureCounts[featureVal]) {
      targetFeatureCounts[featureVal] = 0;
    }
    targetFeatureCounts[featureVal]++;
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

function getTimeSeriesPrediction(ts, targetTs, testTs, testTargetTs, kNearest) {
  var targetFeatureName = getTimeSeriesFeatureNames(targetTs)[0];
  var testTargetTsRowTime = getTimeSeriesTimes(testTs)[0];

  var nearestTs = getNearestTimeSeries(ts, testTs[testTargetTsRowTime], kNearest);
  toConsole("On", toPrettyTimestamp(testTargetTsRowTime), "found", getTimeSeriesLength(nearestTs), "length nearest time series.");
  var nearestTsRowTimes = getTimeSeriesTimes(nearestTs);
  var nearestTargetTs = selectTimeSeriesRows(targetTs, function(t, tsRow) { return nearestTsRowTimes.indexOf(t) != -1 });
  toConsole("Found", getTimeSeriesLength(nearestTargetTs), "of", kNearest, "maximum nearest targets");

  var preds = [];
  mapTimeSeriesFeatureVals(nearestTargetTs, targetFeatureName, function(t, featureVal) { preds.push(featureVal); });
  var meanPred = null;
  if (preds.length > 0) {
    meanPred = Dist.getMean(preds);
  }
  var actualTarget = null;
  if (testTargetTs[testTargetTsRowTime]) {
    actualTarget = testTargetTs[testTargetTsRowTime][targetFeatureName];
  }
  toConsole("Made", meanPred, "prediction", actualTarget, "versus actual");

  return {
    predTarget: meanPred,
    actualTarget: actualTarget
  };
}

function selectFundamentalTimeSeriesSymbols(syms) {
  return selectTimeSeriesFeatures(getFundamentalTimeSeries(), function(t, featureName) {
    var featureSym = featureName.split(":").slice(0, 2).join(":");
    return syms.indexOf(featureSym) != -1;
  });
}

function trainStrategy(ts, targetTs, minTime) {
  var minNumExamples = 20;
  var sparsityFilter = 0.50;
  var numTopFeatures = 3;
  var kNearest = 3;
  var maxNumTestSteps = 5;

  if (typeof minTime != "undefined") {
    ts = selectTimeSeriesRows(ts, function(t, tsRow) { return t >= minTime; });
    toConsole("Filtered to market data since", minTime, "time, now", getTimeSeriesLength(ts), "length");
  }

  var targetFeatureName = getTimeSeriesFeatureNames(targetTs)[0];
  var predTargets = []; var actualTargets = [];
  var tsRowTimes = getTimeSeriesTimes(ts);
  var numTestSteps = 0;
  for (var i=0; i < tsRowTimes.length; i++) {
    var nowTime = tsRowTimes[i];

    var trainTs = selectTimeSeriesRows(ts, function(t, tsRow) { return t <= nowTime; });
    if (getTimeSeriesLength(trainTs) < minNumExamples) {
      continue;
    }
    numTestSteps++;
    var trainTsRowTimes = getTimeSeriesTimes(trainTs);
    var trainTargetTs = selectTimeSeriesRows(targetTs, function(t, tsRow) { return trainTsRowTimes.indexOf(t) != -1; });
    toConsole("Selected training time series", trainTs, trainTargetTs);
 
    var result = null; 
    result = standardizeTimeSeries(trainTs);
    var stdTrainTs = result.ts; var trainFeatureDist = result.featureDist;
    result = standardizeTimeSeries(trainTargetTs);
    var stdTrainTargetTs = result.ts; var trainTargetFeatureDist = result.featureDist;
    toConsole("Standardized time series", stdTrainTs, stdTrainTargetTs);

    stdTrainTs = removeSparseTimeSeriesRows(stdTrainTs, sparsityFilter);
    stdTrainTs = selectTimeSeriesFeatureMutualInfo(stdTrainTs, stdTrainTargetTs, numTopFeatures);

    var testTs = selectTimeSeriesRows(ts, function(t, tsRow) { return t > nowTime; });
    var testTsRowTimes = getTimeSeriesTimes(testTs);
    var testTargetTs = selectTimeSeriesRows(targetTs, function(t, tsRow) { return testTsRowTimes.indexOf(t) != -1; });
    toConsole("Selected testing time series", testTs, testTargetTs);

    result = standardizeTimeSeries(testTs, trainFeatureDist);
    var stdTestTs = result.ts; var testFeatureDist = result.featureDist;
    result = standardizeTimeSeries(testTargetTs, trainFeatureDist);
    var stdTestTargetTs = result.ts; var testTargetFeatureDist = result.featureDist;
    result = getTimeSeriesPrediction(stdTrainTs, trainTargetTs, stdTestTs, testTargetTs, kNearest);
    if (result.predTarget && result.actualTarget) {
      predTargets.push(result.predTarget);
      actualTargets.push(result.actualTarget);
    }

    if (predTargets.length >= 2) {
      var corr = Dist.getCorrelation(predTargets, actualTargets);
      toConsole("Found", corr, "correlation over", predTargets.length, "out-of-sample backtest steps");
    }

    if (maxNumTestSteps && (numTestSteps >= maxNumTestSteps)) {
      toConsole("Breaking early after", numTestSteps, "attempted out-of-sample backtest steps");
      break;
    }
  }
  toConsole("Finished training");
};

function trainTechnicalStrategy(syms, targetSym, diffWin, varWin, forecastWin) {
  var combSyms = syms;
  if (combSyms.indexOf(targetSym) == -1) {
    combSyms.push(targetSym);
  }

  var ts = getSymbolTimeSeries(combSyms, diffWin, DiffFunction.delta, varWin, VarFunction.stdev);
  var targetFeatureName = targetSym + ":close";
  var targetTs = extractForecastTimeSeries(ts, targetFeatureName, forecastWin, DiffFunction.delta);
  toConsole("Built symbol base & target time series", ts, targetTs);
  trainStrategy(ts, targetTs, getDatestampEpochTime("2014-01-01"));
}

function trainFundamentalStrategy(syms, targetSym, diffWin, varWin, forecastWin) {
  var combSyms = syms;
  if (combSyms.indexOf(targetSym) == -1) {
    combSyms.push(targetSym);
  }

  var fundTs = selectFundamentalTimeSeriesSymbols(combSyms);
  var targetBackTs = getSymbolTimeSeries([targetSym], diffWin, DiffFunction.delta, varWin, VarFunction.stdev);
  var targetFeatureName = targetSym + ":close";
  var targetTs = extractForecastTimeSeries(targetBackTs, targetFeatureName, forecastWin, DiffFunction.delta);
  toConsole("Built symbol fundamental & target time series", fundTs, targetTs);
  trainStrategy(fundTs, targetTs, getDatestampEpochTime("2013-01-01"));
}

$(document).ready(function() {
  var syms = ["NFLX:NASDAQ", "WDC:NASDAQ"];
  var targetSym = "NFLX:NASDAQ";
  //var diffWin = 3; var varWin = 5;
  var diffWin = 2; var varWin = 0;
  var forecastWin = 5;  // five trading days

  trainTechnicalStrategy(syms, targetSym);
  trainFundamentalStrategy(syms, targetSym);
});



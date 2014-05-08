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

Math.log2 = function(x) {
  return Math.log(x) / Math.LN2;
}

var Dist = {
  eachNum: function(xs, fn) {
    var result = null;
    for (var i=0; i < xs.length; i++) {
      var x = xs[i];
      if (isNaN(x)) {
        continue;
      }
      result = fn(x);
    }
    return result;
  },

  getLength: function(xs) {
    var num = 0;
    this.eachNum(xs, function(x) { num += 1 });
    return num;
  },

  getMean: function(xs) {
    var sum = 0;
    this.eachNum(xs, function(x) { sum += x });
    return sum / this.getLength(xs);
  },

  getSquaredDifferenceSum: function(xs) {
    var mean = this.getMean(xs);
    var sum = 0;
    this.eachNum(xs, function(x) {
      var xSqDiff = x - mean;
      sum += xSqDiff * xSqDiff;
    });
    return sum;
  },

  getVariance: function(xs) {
    return this.getSquaredDifferenceSum(xs) / (this.getLength(xs) - 1);
  },

  getPopulationVariance: function(xs) {
    return this.getSquaredDifferenceSum(xs) / this.getLength(xs);
  },

  getStandardDeviation: function(xs) {
    return Math.sqrt(this.getVariance(xs));
  },

  getPopulationStandardDeviation: function(xs) {
    return Math.sqrt(this.getPopulationVariance(xs));
  }
};

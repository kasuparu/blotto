/**
 * Created by kasuparu on 2015-01-29.
 */
"use strict";
var fs = require('fs');

var filename = 'best.json';

var Blotto = {
    soldiers: 100,
    fields: 9,
    comboCount: 20000,
    tournamentRounds: 10,
    bestN: 500,
    roundPlayBest: []
};

console.log('games in round: ' + (Blotto.comboCount*(Blotto.comboCount-1)/2));

if (fs.existsSync(filename)) {
    Blotto.roundPlayBest = JSON.parse(fs.readFileSync('best.json', 'utf8'));
    console.log('loaded! '/* + JSON.stringify(Blotto.roundPlayBest)*/);
}

/**
 * @type {number}
 */
Blotto.maxRandom = Math.floor((Blotto.soldiers+1));

/**
 * @returns {number}
 */
Blotto.random = function () {
    return ~~(Math.random() * Blotto.maxRandom);
};

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
Blotto.shuffle = function (o){ //v1.0
    for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

/**
 * @returns {number[]}
 */
Blotto.generateRandomCombo = function () {
    var attempts = 0;
    var result = [];
    var random = 0;
    var remainder = Blotto.soldiers;

    do {
        remainder = Blotto.soldiers;

        for (var fieldNum = 1; fieldNum < Blotto.fields; fieldNum++) {
            random = Blotto.random();
            result[fieldNum-1] = random;
            remainder -= random;
        }

        result[Blotto.fields-1] = remainder;

        //console.log(++attempts + ' ' +JSON.stringify(result));
    } while (remainder < 0);

    return Blotto.shuffle(result);
};

/**
 * @param {number[][]} strategies
 */
Blotto.play = function (strategies) {
    var result = [0, 0];

    for (var index = 0; index < Blotto.fields; index++) {
        if (strategies[0][index] > strategies[1][index]) {
            result[0]++;
            //console.log(strategies[0][index] + '>' + strategies[1][index] + ' => 1');
        } else if (strategies[0][index] < strategies[1][index]) {
            result[1]++;
            //console.log(strategies[0][index] + '<' + strategies[1][index] + ' => 2');
        } else if (strategies[0][index] === strategies[1][index]) {
            result[0] += 0.5;
            result[1] += 0.5;
            //console.log(strategies[0][index] + '=' + strategies[1][index] + ' => draw');
        }
    }

    return result;
};

/**
 * @param {number[][]} strategies
 * @returns {number[]}
 */
Blotto.tournamentRoundPlay = function (strategies) {
    var results = Array.apply(null, new Array(Blotto.comboCount)).map(Number.prototype.valueOf, 0);
    var first;
    var second;
    var roundResult = [0, 0];

    for (first = 0; first < Blotto.comboCount-1; first++) {
        for (second = first+1; second < Blotto.comboCount; second++) {
            roundResult = Blotto.play([strategies[first], strategies[second]]);
            //console.log(JSON.stringify([strategies[first], strategies[second]]) + ' ' + JSON.stringify(roundResult));
            results[first] += roundResult[0];
            results[second] += roundResult[1];
        }
    }

    return results;
};

/**
 * @param {number[]} array
 * @returns {number}
 */
Array.max = function(array){
    return Math.max.apply(Math, array);
};

//http://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array
Blotto.uniqBy = function (a, key) {
    var seen = {};
    return a.filter(function(item) {
        var k = key(item);
        return seen.hasOwnProperty(k) ? false : (seen[k] = true);
    })
};

/**
 * @param {number[][]} strategies
 * @param {number[]} results
 * @param {object} indexObject
 * @returns {number[]}
 */
Blotto.selectBestN = function (strategies, results, indexObject) {
    var localResults = results.slice(0);
    var best = [];
    var bestResults = [];
    var maxResult;
    var index;
    var strategiesLength = strategies.length;

    for (var nthMax = 1; nthMax <= Blotto.bestN; nthMax++) {
        maxResult = Array.max(localResults);

        for (index = 0; index < strategiesLength; index++) {
            if (localResults[index] === maxResult) {
                //console.log('best #' + nthMax + ' is ' + (index+1) + ' ' + JSON.stringify(strategies[index]) + ' = ' + maxResult);
                best.push(strategies[index]);
                bestResults.push(localResults[index]);

                localResults[index] = 0;
                break;
            }
        }
    }

    best = Blotto.uniqBy(best, JSON.stringify);
    bestResults = Blotto.uniqBy(bestResults, JSON.stringify);

    if (typeof indexObject === 'object') {
        indexObject.bestResults = bestResults;
    }

    return best;
};

Blotto.tournamentPlay = function () {
    var roundPlayBest = [];
    var combos;
    var roundPlayResults;
    var tournaments = 0;
    var roundPlayBestResults = {};

    while (true) {
        tournaments++;
        for (var round = 1; round <= Blotto.tournamentRounds; round++) {
            combos = Array.apply(null, new Array(Blotto.comboCount - roundPlayBest.length)).map(Blotto.generateRandomCombo, 0);
            combos = roundPlayBest.concat(combos);

            roundPlayResults = Blotto.tournamentRoundPlay(combos);
            //console.log("\n" + JSON.stringify(roundPlayResults) + "\n");
            roundPlayBest = Blotto.selectBestN(combos, roundPlayResults, roundPlayBestResults);
        }

        Blotto.save(fs, roundPlayBest);
        console.log('saved tournament # ' + tournaments + ' ' + JSON.stringify(roundPlayBestResults.bestResults));
    }
};

Blotto.save = function (fs, roundPlayBest) {
    Blotto.roundPlayBest = roundPlayBest.splice(0);
    var toSave = JSON.stringify(Blotto.roundPlayBest);

    fs.writeFileSync(filename, toSave);
};

// Does not work on Windows
/*process.on('exit', function () {
    var toSave = JSON.stringify(Blotto.roundPlayBest);
    fs.writeFileSync(filename, toSave);
    console.log('saved on exit: ' + toSave);
});

process.on('SIGINT', function() {
    console.log("Caught interrupt signal");
    process.exit();
});*/

//var combos = Array.apply(null, new Array(Blotto.comboCount)).map(Blotto.generateRandomCombo, 0);
//var roundPlayResults = Blotto.tournamentRoundPlay(combos);
//var roundPlayBest = Blotto.selectBestN(combos, roundPlayResults);

//console.log("\n" + JSON.stringify(roundPlayResults) + "\n");
//console.log(JSON.stringify(roundPlayBest) + "\n");

Blotto.tournamentPlay();





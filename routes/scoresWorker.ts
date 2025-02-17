const calculateScores = require('./algorithm.ts');
const workerpool = require('workerpool');

//console.log("Imported calculateScores: ", typeof calculateScores);

function calculate(inst, crs, yr, md, grp, result) {
  return calculateScores(inst, crs, yr, md, grp, result, true, true);
}

workerpool.worker({
  calculate: calculate,
});

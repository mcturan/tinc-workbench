const fs = require('fs');

const { ManufacturingEngine } = require('./dist/manufacturing/index.js');
const board = {
  objects: [
    { kind: 'via', visible: true, transform: { x: 0, y: 0 }, drillDiameter: 300000 },
    { kind: 'via', visible: true, transform: { x: 1, y: 1 }, drillDiameter: 300000 }
  ]
};

const engine = new ManufacturingEngine();
const out = engine.exportAll(board);
console.log(out.excellon);
console.log((out.excellon.match(/T\d+C[0-9.]+/g) || []).length);

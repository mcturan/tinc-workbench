const fs = require('fs');
const files = [
  'src/manufacturing/bom.ts',
  'src/manufacturing/excellon.ts',
  'src/manufacturing/gerber.ts',
  'src/manufacturing/pick-place.ts',
  'src/manufacturing/validator.ts',
  'src/project-system/explorer-adapter.ts',
  'tests/manufacturing.spec.ts'
];
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/\\`/g, '\`');
  c = c.replace(/\\\$\{/g, '\${');
  fs.writeFileSync(f, c);
}
console.log('Fixed manufacturing files');

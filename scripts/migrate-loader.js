const fs = require('fs');

const path = 'src/component-library/loader.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace category and manufacturer with tvcs block
content = content.replace(/category: '([^']+)',\s*aliases:/g, (match, cat) => {
  return `tvcs: {
      categoryPath: ['${cat}'],
      manufacturer: 'Generic',
      series: '',
      family: '${cat}',
      variant: '',
      tags: [],
      package: 'Generic',
      footprint: 'Generic',
      physicalDimensions: { widthMm: 0, lengthMm: 0, heightMm: 0 },
      electrical: { operatingVoltageMin: 0, operatingVoltageMax: 0, logicVoltage: 0 },
      interfaces: [],
      protocols: []
    },
    aliases:`;
});

// Remove manufacturer lines
content = content.replace(/keywords: \[([^\]]+)\],\s*manufacturer: '([^']+)',/g, "keywords: [$1],");

fs.writeFileSync(path, content, 'utf8');
console.log('Migrated loader.ts');

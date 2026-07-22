const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/[ \t]+$/gm, '');
  fs.writeFileSync(file, content, 'utf8');
}

fix('src/command-engine/index.ts');
fix('src/property-inspector/inspector.ts');

const fs = require('fs');
const glob = require('glob'); // use standard fs approach

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const path = dir + '/' + file;
    if (fs.statSync(path).isDirectory()) {
      walk(path, callback);
    } else if (path.endsWith('.ts')) {
      callback(path);
    }
  }
}

const colorMap = {
  "'#282a36'": "'var(--bg-surface)'",
  "'#21222c'": "'var(--bg-sidebar)'",
  "'#1e1f29'": "'var(--bg-toolbar)'",
  "'#18191e'": "'var(--bg-canvas)'",
  "'#191a21'": "'var(--border-strong)'",
  "'#44475a'": "'var(--border)'",
  "'#6272a4'": "'var(--text-secondary)'",
  "'#f8f8f2'": "'var(--text-primary)'",
  "'#bd93f9'": "'var(--accent)'",
  "'#50fa7b'": "'var(--success)'",
  "'#ff5555'": "'var(--error)'",
  "'#f1fa8c'": "'var(--warning)'"
};

walk('src', (path) => {
  let content = fs.readFileSync(path, 'utf8');
  let changed = false;
  
  for (const [hex, cssVar] of Object.entries(colorMap)) {
    if (content.includes(hex)) {
      content = content.split(hex).join(cssVar);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(path, content, 'utf8');
    console.log(`Updated ${path}`);
  }
});

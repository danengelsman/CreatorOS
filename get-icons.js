const fs = require('fs');
const glob = require('glob');

// For node versions without glob, let's just use readdir recursively
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(__dirname, dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles('src/components', []);
const icons = new Set();

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/import\s+{([^}]+)}\s+from\s+'lucide-react'/g);
  if (matches) {
    matches.forEach(match => {
      const matchInner = match.match(/import\s+{([^}]+)}\s+from\s+'lucide-react'/)[1];
      matchInner.split(',').forEach(icon => {
        const trimmed = icon.trim();
        if (trimmed) {
          icons.add(trimmed);
        }
      });
    });
  }
});

console.log(Array.from(icons).sort().join('\n'));

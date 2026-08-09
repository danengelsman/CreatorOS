const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("if (item.locked && projects.length === 0) return;", "if (item.locked && !isDeveloper && projects.length === 0) return;");
code = code.replace("item.locked && projects.length === 0 && \"opacity-40 cursor-not-allowed grayscale\"", "item.locked && !isDeveloper && projects.length === 0 && \"opacity-40 cursor-not-allowed grayscale\"");

fs.writeFileSync('src/App.tsx', code);

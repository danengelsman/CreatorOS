const fs = require('fs');
let code = fs.readFileSync('tsconfig.json', 'utf8');

if (!code.includes('"exclude":')) {
  code = code.replace('"include": ["src"]', '"include": ["src"],\n  "exclude": ["dist", "node_modules"]');
  fs.writeFileSync('tsconfig.json', code);
}

const fs = require('fs');
let code = fs.readFileSync('src/components/Roadmap.tsx', 'utf8');

code = code.replace("const isUnlocked = idx === 0;", "const isUnlocked = idx === 0 || (user?.email === 'danengelsman@gmail.com');");

fs.writeFileSync('src/components/Roadmap.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("  { id: 'hub', label: 'Creator Hub', icon: UsersThree, component: CreatorHub, locked: true },", "  { id: 'hub', label: 'Creator Hub', icon: UsersThree, component: CreatorHub },");
fs.writeFileSync('src/App.tsx', code);

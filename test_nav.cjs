const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const beforeNav = code.indexOf('<motion.nav');
const afterNav = code.indexOf('</motion.nav>') + '</motion.nav>'.length;
console.log(code.substring(beforeNav, afterNav));

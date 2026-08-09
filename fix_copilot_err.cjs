const fs = require('fs');
let code = fs.readFileSync('src/components/PerfectPromptCopilot.tsx', 'utf8');

code = code.replace("      setResult(\"Error generating prompt. Please try again.\");", "      setResult(err.message || \"Error generating prompt. Please try again.\");");

fs.writeFileSync('src/components/PerfectPromptCopilot.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/components/PerfectPromptCopilot.tsx', 'utf8');

code = code.replace("      if (!response.ok) throw new Error(await response.text());", 
`      if (!response.ok) {
        const errText = await response.text();
        try {
          throw new Error(JSON.parse(errText).error || 'API Error');
        } catch(e) {
          throw new Error(errText);
        }
      }`);

code = code.replace("      const data = await response.json();\n      const newTemplates = JSON.parse(data.text).templates;",
`      if (!response.ok) {
        const errText = await response.text();
        try {
          throw new Error(JSON.parse(errText).error || 'API Error');
        } catch(e) {
          throw new Error(errText);
        }
      }
      const data = await response.json();\n      const newTemplates = JSON.parse(data.text).templates;`);

fs.writeFileSync('src/components/PerfectPromptCopilot.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/services/gemini.ts', 'utf8');

// The file currently has:
//   if (!response.ok) throw new Error(await response.text());
//   if (!response.ok) throw new Error((await response.json()).error || 'API Error');
//   const data = await response.json();

code = code.replace(/  if \(\!response\.ok\) throw new Error\(await response\.text\(\)\);\n  if \(\!response\.ok\) throw new Error\(\(await response\.json\(\)\)\.error \|\| 'API Error'\);\n  const data = await response\.json\(\);/g, 
`  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      throw new Error(errJson.error || 'API Error');
    } catch (e) {
      throw new Error(errText);
    }
  }
  const data = await response.json();`);

fs.writeFileSync('src/services/gemini.ts', code);

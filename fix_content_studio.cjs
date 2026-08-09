const fs = require('fs');
let code = fs.readFileSync('src/components/ContentStudio.tsx', 'utf8');

code = code.replace("      console.error(error);\n    } finally {\n      setIsScoring(false);", "      console.error(error);\n      showToast(error.message || 'Scoring failed');\n    } finally {\n      setIsScoring(false);");

code = code.replace("      console.error('Polish failed:', error);\n    } finally {\n      setIsPolishing(false);", "      console.error('Polish failed:', error);\n      showToast(error.message || 'Polish failed');\n    } finally {\n      setIsPolishing(false);");

fs.writeFileSync('src/components/ContentStudio.tsx', code);

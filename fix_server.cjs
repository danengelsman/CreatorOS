const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const helper = `
function formatGeminiError(error) {
  let errorMessage = error.message || 'Unknown API Error';
  try {
    const parsed = JSON.parse(errorMessage);
    if (parsed.error && parsed.error.message) {
      errorMessage = parsed.error.message;
    }
  } catch (e) {}

  if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('prepayment credits are depleted') || error.status === 429) {
    return 'Your API credits are depleted. Please go to AI Studio to manage your billing settings.';
  }
  return errorMessage;
}
`;

code = code.replace('async function startServer() {', helper + '\nasync function startServer() {');

code = code.replace(/res\.status\(500\)\.json\(\{\s*error:\s*error\.message\s*\}\);/g, 'res.status(500).json({ error: formatGeminiError(error) });');

fs.writeFileSync('server.ts', code);
console.log('Fixed server.ts');

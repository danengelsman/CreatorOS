const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const aiDecl = `  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });`;

const lazyAi = `  let _ai = null;
  const getAI = async () => {
    if (!_ai) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set in environment variables');
      }
      const { GoogleGenAI } = await import('@google/genai');
      _ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
    }
    return _ai;
  };`;

code = code.replace(aiDecl, lazyAi);
code = code.replace(/ai\.models/g, "(await getAI()).models");
code = code.replace(/ai\.operations/g, "(await getAI()).operations");

fs.writeFileSync('server.ts', code);

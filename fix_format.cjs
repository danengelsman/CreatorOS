const fs = require('fs');

// 1. ContentEditorView.tsx
let editorView = fs.readFileSync('src/components/ContentEditorView.tsx', 'utf8');

// Add onFormat prop
editorView = editorView.replace(
  "setIsPolishing: (b: boolean) => void;\n}", 
  "setIsPolishing: (b: boolean) => void;\n  onFormat: (targetPlatformId: string, label: string, isPro?: boolean) => void;\n}"
);
editorView = editorView.replace(
  "isPolishing, setIsPolishing\n}: ContentEditorViewProps)", 
  "isPolishing, setIsPolishing,\n  onFormat\n}: ContentEditorViewProps)"
);

// Remove handleFormat definition from ContentEditorView.tsx
const handleFormatStart = editorView.indexOf("const handleFormat = async");
if (handleFormatStart !== -1) {
  let braceCount = 0;
  let endIndex = -1;
  let started = false;
  for (let i = handleFormatStart; i < editorView.length; i++) {
    if (editorView[i] === '{') { braceCount++; started = true; }
    else if (editorView[i] === '}') { braceCount--; }
    if (started && braceCount === 0) { endIndex = i; break; }
  }
  if (endIndex !== -1) {
    editorView = editorView.substring(0, handleFormatStart) + editorView.substring(endIndex + 1);
  }
}

// Replace handleFormat calls with onFormat in ContentEditorView.tsx
editorView = editorView.replace(/onClick=\{\(\) => handleFormat\(/g, "onClick={() => onFormat(");

fs.writeFileSync('src/components/ContentEditorView.tsx', editorView);

// 2. ContentStudio.tsx
let studio = fs.readFileSync('src/components/ContentStudio.tsx', 'utf8');

// Add handleFormat back to ContentStudio.tsx (right before return)
const handleFormatCode = `
  const handleFormat = async (targetPlatformId: string, label: string, isPro?: boolean) => {
    if (isPro) {
      showToast(\`Upgrade to Pro to unlock formatting for \${label}\`);
      return;
    }
    setPlatform(targetPlatformId);
    if (!body) return;
    setIsPolishing(true);
    showToast(\`Formatting for \${label}...\`);
    try {
      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3.7-flash",
          contents: \`Rewrite the following content to be formatted specifically for \${label}. Adapt the tone, length, and style appropriately. Keep it high quality.\\n\\nContent:\\n\${body}\`
        })
      });
      if (!response.ok) throw new Error('Format failed');
      const data = await response.json();
      setBody(data.text);
      showToast(\`Formatted for \${label}\`);
    } catch (error) {
      console.error('Format error:', error);
      showToast('Failed to format content');
    } finally {
      setIsPolishing(false);
    }
  };
`;

const returnIndex = studio.lastIndexOf("  return (\n    <div className=\"space-y-8 pb-20\">");
if (returnIndex !== -1) {
  studio = studio.substring(0, returnIndex) + handleFormatCode + "\n" + studio.substring(returnIndex);
}

// Pass onFormat to ContentEditorView
studio = studio.replace(
  "setIsPolishing={setIsPolishing}\n          />",
  "setIsPolishing={setIsPolishing}\n            onFormat={handleFormat}\n          />"
);

fs.writeFileSync('src/components/ContentStudio.tsx', studio);

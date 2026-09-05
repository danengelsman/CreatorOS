const fs = require('fs');

let studio = fs.readFileSync('src/components/ContentStudio.tsx', 'utf8');

// 1. Add import
studio = studio.replace(
  "import ContentEditorView, { PLATFORMS } from './ContentEditorView';",
  "import ContentEditorView, { PLATFORMS } from './ContentEditorView';\nimport AIToolPanel from './AIToolPanel';"
);

// 2. Remove states
studio = studio.replace(/const \[isAnalyzingSuggestions, setIsAnalyzingSuggestions\] = useState\(false\);\n/g, "");
studio = studio.replace(/const \[suggestionsData, setSuggestionsData\] = useState<any>\(null\);\n/g, "");
studio = studio.replace(/const \[activeSuggestionTab, setActiveSuggestionTab\] = useState<'trending' \| 'angles'>\('trending'\);\n/g, "");
studio = studio.replace(/const \[showContextSettings, setShowContextSettings\] = useState\(false\);\n/g, "");
studio = studio.replace(/const \[contentTone, setContentTone\] = useState\('Professional'\);\n/g, "");
studio = studio.replace(/const \[contentAudience, setContentAudience\] = useState\(''\);\n/g, "");
studio = studio.replace(/const \[contentGoal, setContentGoal\] = useState\('Engagement'\);\n/g, "");

// 3. Remove Handlers
function removeHandler(code, handlerStartStr) {
  const handlerStart = code.indexOf(handlerStartStr);
  if (handlerStart !== -1) {
    let braceCount = 0;
    let endIndex = -1;
    let started = false;
    for (let i = handlerStart; i < code.length; i++) {
      if (code[i] === '{') { braceCount++; started = true; }
      else if (code[i] === '}') { braceCount--; }
      if (started && braceCount === 0) { endIndex = i; break; }
    }
    if (endIndex !== -1) {
      let cutEnd = endIndex + 1;
      if (code[cutEnd] === ';') cutEnd++;
      if (code[cutEnd] === '\n') cutEnd++;
      return code.substring(0, handlerStart) + code.substring(cutEnd);
    }
  }
  return code;
}

studio = removeHandler(studio, "const handleGenerateSuggestions = async () => {");
studio = removeHandler(studio, "const handleOptimizeSearch = async () => {");

// 4. Remove AI Score Feedback from lg:col-span-8
const aiScoreStart = studio.indexOf("{/* AI Score Feedback & Skeletons */}");
const createSettingsStart = studio.indexOf("{/* Create Settings / Tools */}");
if (aiScoreStart !== -1 && createSettingsStart !== -1) {
  studio = studio.substring(0, aiScoreStart) + studio.substring(createSettingsStart);
} else {
  console.log("Could not find AI score start or create settings start.");
}

// 5. Replace lg:col-span-4 block
const rightColStart = studio.indexOf("<div className=\"lg:col-span-4 space-y-8\">");
const endDivsMatch = studio.match(/<\/div>\s*<\/div>\s*\)\}\s*\{showConfetti && <Confetti count=\{150\} \/>\}/);
if (rightColStart !== -1 && endDivsMatch) {
  const endOfRightCol = endDivsMatch.index; // Point just before the `</div></div>)}` which closes `grid` and `editor tab` block
  
  const aiToolPanelComponent = `
        <AIToolPanel 
          brand={brand}
          allProjects={allProjects}
          body={body}
          setBody={setBody}
          setTitle={setTitle}
          showToast={showToast}
          setIsPolishing={setIsPolishing}
          isPolishing={isPolishing}
          platform={platform}
          onFormat={handleFormat}
          setActiveTab={setActiveTab}
          videoHistory={videoHistory}
          onSelectVideo={setActivePreviewVideo}
          isScoring={isScoring}
          scoreData={scoreData}
        />
`;

  studio = studio.substring(0, rightColStart) + aiToolPanelComponent + studio.substring(endOfRightCol);
} else {
  console.log("Could not find lg:col-span-4 start or end matcher.");
}

fs.writeFileSync('src/components/ContentStudio.tsx', studio);
console.log('Updated ContentStudio.tsx');

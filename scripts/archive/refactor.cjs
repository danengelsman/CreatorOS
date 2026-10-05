const fs = require('fs');
let code = fs.readFileSync('src/components/ContentStudio.tsx', 'utf8');

// 1. Add import and remove PLATFORMS array
code = code.replace("import Confetti from './Confetti';", "import Confetti from './Confetti';\nimport ContentEditorView, { PLATFORMS } from './ContentEditorView';");

// Remove the PLATFORMS const
code = code.replace(/const PLATFORMS = \[\s*\{\s*id: 'youtube'[\s\S]*?\}\s*,\s*\];/m, "");

// 2. Remove states
code = code.replace(/const \[remixInstruction, setRemixInstruction\] = useState\(''\);\n/g, "");
code = code.replace(/const \[isBrainstorming, setIsBrainstorming\] = useState\(false\);\n/g, "");
code = code.replace(/const \[brainstormIdeas, setBrainstormIdeas\] = useState<any\[\] \| null>\(null\);\n/g, "");
code = code.replace(/const \[showBrainstorm, setShowBrainstorm\] = useState\(false\);\n/g, "");
code = code.replace(/const \[isRecording, setIsRecording\] = useState\(false\);\n/g, "");
code = code.replace(/const \[isTranscribing, setIsTranscribing\] = useState\(false\);\n/g, "");

// 3. Remove refs
code = code.replace(/const fileInputRef = useRef<HTMLInputElement>\(null\);\n/g, "");
code = code.replace(/const mediaRecorder = useRef<MediaRecorder \| null>\(null\);\n/g, "");
code = code.replace(/const audioChunks = useRef<BlobPart\[\]>\(\[\]\);\n/g, "");

// 4. Remove handlers
const handlersToRemove = [
  "const handleBrainstorm = async () => {",
  "const handlePolish = async () => {",
  "const handleRemix = async () => {",
  "const handleFormat = async (targetPlatformId: string, label: string, isPro?: boolean) => {",
  "const handleHashtags = async () => {",
  "const handleImageClick = () => {",
  "const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {",
  "const handleMicrophone = async () => {",
  "const handleGenerateScript = async () => {"
];

for (const handler of handlersToRemove) {
  const startIndex = code.indexOf(handler);
  if (startIndex === -1) {
    console.log("Could not find:", handler);
    continue;
  }
  
  // Find matching closing brace
  let braceCount = 0;
  let endIndex = -1;
  let started = false;
  
  for (let i = startIndex; i < code.length; i++) {
    if (code[i] === '{') {
      braceCount++;
      started = true;
    } else if (code[i] === '}') {
      braceCount--;
    }
    
    if (started && braceCount === 0) {
      endIndex = i;
      break;
    }
  }
  
  if (endIndex !== -1) {
    // Remove the block including the trailing semicolon/newline if present
    let endCut = endIndex + 1;
    if (code[endCut] === ';') endCut++;
    if (code[endCut] === '\n') endCut++;
    code = code.substring(0, startIndex) + code.substring(endCut);
  }
}

// 5. Replace JSX section
const jsxStartMarker = '<section className="bg-[var(--bg-tertiary)] ios-card overflow-hidden">';
const jsxEndMarker = '</section>';

const jsxStartIndex = code.indexOf(jsxStartMarker);
let jsxEndIndex = code.indexOf(jsxEndMarker, jsxStartIndex);

if (jsxStartIndex !== -1 && jsxEndIndex !== -1) {
  jsxEndIndex += jsxEndMarker.length;
  
  const replacementJsx = `          <ContentEditorView
            title={title}
            setTitle={setTitle}
            body={body}
            setBody={setBody}
            platform={platform}
            setPlatform={setPlatform}
            brand={brand}
            showToast={showToast}
            setStudioTab={setStudioTab}
            isSaving={isSaving}
            onPublish={handlePublish}
            isScoring={isScoring}
            onScore={handleScore}
            isPolishing={isPolishing}
            setIsPolishing={setIsPolishing}
          />`;
          
  code = code.substring(0, jsxStartIndex) + replacementJsx + code.substring(jsxEndIndex);
} else {
  console.log("Could not find JSX section");
}

fs.writeFileSync('src/components/ContentStudio.tsx', code);
console.log("Refactoring complete");

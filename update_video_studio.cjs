const fs = require('fs');

let studio = fs.readFileSync('src/components/VideoStudio.tsx', 'utf8');

// Add import for hook
studio = studio.replace(
  "import localforage from 'localforage';",
  "import { useVideoGeneration } from '../hooks/useVideoGeneration';"
);

// We want to replace the whole block of logic from `const [videoStyle` to the end of `handleGenerateVideo = async () => { ... }`
// Let's find the start and end.
const startMarker = "const [videoStyle, setVideoStyle]";
const endMarker = "const handleGenerateVideo = async () => {";

const startIndex = studio.indexOf(startMarker);
const endIndexTemp = studio.indexOf(endMarker);

if (startIndex === -1 || endIndexTemp === -1) {
  console.log("Could not find markers.");
  process.exit(1);
}

// Need to find the end of the handleGenerateVideo function
let braceCount = 0;
let started = false;
let endIndex = -1;
for (let i = endIndexTemp; i < studio.length; i++) {
  if (studio[i] === '{') { braceCount++; started = true; }
  else if (studio[i] === '}') { braceCount--; }
  
  if (started && braceCount === 0) {
    endIndex = i;
    break;
  }
}

if (endIndex === -1) {
  console.log("Could not find end of handleGenerateVideo.");
  process.exit(1);
}

let cutEnd = endIndex + 1;
if (studio[cutEnd] === ';') cutEnd++;

// Also we need to remove the imports that are now unused in VideoStudio but used in the hook:
// generateVideo, getOperationStatus, db, serverTimestamp, handleFirestoreError, OperationType, collection, addDoc, localforage
studio = studio.replace(/import \{ generateVideo, getOperationStatus \} from '\.\.\/services\/gemini';/, '');
studio = studio.replace(/import \{ db, serverTimestamp, handleFirestoreError, OperationType \} from '\.\.\/firebase';/, '');
studio = studio.replace(/import \{ collection, addDoc \} from 'firebase\/firestore';/, '');
studio = studio.replace(/import localforage from 'localforage';/, '');

const hookCall = `
  const {
    videoStyle, setVideoStyle,
    isVideoGenerating,
    videoAspect, setVideoAspect,
    videoGenerationProgress,
    videoUrl,
    videoLength, setVideoLength,
    avatarGender, setAvatarGender,
    avatarClothing, setAvatarClothing,
    backgroundStyle, setBackgroundStyle,
    textOverlay, setTextOverlay,
    ttsScript, setTtsScript,
    editedPrompt, setEditedPrompt,
    isPromptCustomized, setIsPromptCustomized,
    handleGenerateVideo,
    handleFileUpload,
    fileInputRef
  } = useVideoGeneration({ body, title, platform, brand, user, showToast, onVideoSaved });
`;

studio = studio.substring(0, startIndex) + hookCall + studio.substring(cutEnd);

fs.writeFileSync('src/components/VideoStudio.tsx', studio);
console.log('Updated VideoStudio.tsx');

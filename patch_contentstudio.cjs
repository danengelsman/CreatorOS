const fs = require('fs');
let content = fs.readFileSync('src/components/ContentStudio.tsx', 'utf8');

const targetImports = "import { PaperPlaneRight as Send, CheckCircle as CheckCircle2, ArrowsClockwise as RefreshCw, TextT as Type, Hash, Image as ImageIcon, CaretRight as ChevronRight, DownloadSimple as Download, Microphone as Mic, SpeakerHigh as Volume2, SpeakerSlash, Rewind, FastForward, VideoCamera as VideoIcon, Play, CircleNotch as Loader2, FloppyDisk as Save, Sparkle as Sparkles, MagnifyingGlass as Search, GearSix as Settings, DotsThree as MoreHorizontal, Lightbulb } from '@phosphor-icons/react';";
const newImports = "import { PaperPlaneRight as Send, CheckCircle as CheckCircle2, ArrowsClockwise as RefreshCw, TextT as Type, Hash, Image as ImageIcon, CaretRight as ChevronRight, DownloadSimple as Download, Microphone as Mic, SpeakerHigh as Volume2, SpeakerSlash, Rewind, FastForward, VideoCamera as VideoIcon, Play, CircleNotch as Loader2, FloppyDisk as Save, Sparkle as Sparkles, MagnifyingGlass as Search, GearSix as Settings, DotsThree as MoreHorizontal, Lightbulb, Article, FilmScript } from '@phosphor-icons/react';";

content = content.replace(targetImports, newImports);

const handlerInsertTarget = `  const handleMicrophone = async () => {`;
const scriptHandler = `  const handleGenerateScript = async () => {
    if (!body || !brand) return;
    setIsPolishing(true);
    showToast('Generating detailed video script...');
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          contents: \`Rewrite the following content as a detailed video script. Include time markers (e.g., [0:00 - 0:05]), settings, and AI Avatar look/sound based on the brand: \${JSON.stringify(brand.avatar || brand.visual_style)}. Ensure it is highly engaging and formatted well.

Content:
\${body}\`
        })
      });
      if (!response.ok) throw new Error('Failed to generate script');
      const data = await response.json();
      setBody(data.text);
      showToast('Video script generated');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate video script');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleMicrophone = async () => {`;

content = content.replace(handlerInsertTarget, scriptHandler);

const buttonTarget = `<button onClick={handleMicrophone} className={cn("ios-button ios-button-gray px-3", isRecording && "text-red-500")} title="Voice Dictation"><Mic size={17} strokeWidth={1.5} /></button>`;
const newButton = `${buttonTarget}
                <button onClick={handleGenerateScript} className="ios-button ios-button-gray px-3" title="Generate Video Script with Time Markers"><FilmScript size={17} strokeWidth={1.5} /></button>`;

content = content.replace(buttonTarget, newButton);

fs.writeFileSync('src/components/ContentStudio.tsx', content);

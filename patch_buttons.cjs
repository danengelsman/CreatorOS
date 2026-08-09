const fs = require('fs');
let content = fs.readFileSync('src/components/ContentStudio.tsx', 'utf8');

const targetButtons = `
                <button className="ios-button ios-button-gray px-3"><Type size={17} strokeWidth={1.5} /></button>
                <button className="ios-button ios-button-gray px-3"><ImageIcon size={17} strokeWidth={1.5} /></button>
                <button className="ios-button ios-button-gray px-3"><Hash size={17} strokeWidth={1.5} /></button>
                <button className="ios-button ios-button-gray px-3"><Mic size={17} strokeWidth={1.5} /></button>
`;

const replacementButtons = `
                <button onClick={handlePolish} className="ios-button ios-button-gray px-3" title="Polish Text"><Type size={17} strokeWidth={1.5} /></button>
                <button onClick={handleImageClick} className="ios-button ios-button-gray px-3" title="Upload Image"><ImageIcon size={17} strokeWidth={1.5} /></button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <button onClick={handleHashtags} className="ios-button ios-button-gray px-3" title="Generate Hashtags"><Hash size={17} strokeWidth={1.5} /></button>
                <button onClick={handleMicrophone} className={cn("ios-button ios-button-gray px-3", isRecording && "text-red-500")} title="Voice Dictation"><Mic size={17} strokeWidth={1.5} /></button>
`;

content = content.replace(targetButtons.trim(), replacementButtons.trim());
fs.writeFileSync('src/components/ContentStudio.tsx', content);

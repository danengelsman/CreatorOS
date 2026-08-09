const fs = require('fs');

let content = fs.readFileSync('src/components/ContentStudio.tsx', 'utf8');

const newHandlers = `
  const handleFormat = async (targetPlatformId: string, label: string) => {
    setPlatform(targetPlatformId);
    if (!body) return;
    setIsPolishing(true);
    showToast(\`Formatting for \${label}...\`);
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
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

  const handleHashtags = async () => {
    if (!body) return;
    setIsPolishing(true);
    showToast('Generating hashtags...');
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          contents: \`Generate 5 relevant hashtags for the following content. Output ONLY the hashtags separated by spaces, nothing else.\\n\\nContent:\\n\${body}\`
        })
      });
      if (!response.ok) throw new Error('Hashtags failed');
      const data = await response.json();
      setBody(prev => prev + '\\n\\n' + data.text.trim());
      showToast('Hashtags added');
    } catch (error) {
      console.error('Hashtags error:', error);
      showToast('Failed to generate hashtags');
    } finally {
      setIsPolishing(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsPolishing(true);
    showToast('Analyzing image...');
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Image = (reader.result as string).split(',')[1];
      try {
        const response = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64Image,
                  },
                },
                { text: "Describe this image in detail so I can use it as context for content creation." },
              ],
            }
          })
        });
        if (!response.ok) throw new Error('Image analysis failed');
        const data = await response.json();
        setBody(prev => prev + '\\n\\n[Image Details: ' + data.text.trim() + ']');
        showToast('Image details added');
      } catch (err) {
        console.error(err);
        showToast('Failed to analyze image');
      } finally {
        setIsPolishing(false);
      }
    };
  };

  const handleMicrophone = async () => {
    if (isRecording) {
      mediaRecorder.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);
        audioChunks.current = [];
        
        mediaRecorder.current.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.current.push(e.data);
        };
        
        mediaRecorder.current.onstop = async () => {
          setIsTranscribing(true);
          try {
            const audioBlob = new Blob(audioChunks.current, { type: mediaRecorder.current?.mimeType || 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Audio = (reader.result as string).split(',')[1];
              try {
                const transcribedText = await transcribeAudio(base64Audio, mediaRecorder.current?.mimeType || 'audio/webm');
                setBody(prev => prev + (prev ? '\\n' : '') + transcribedText);
                showToast('Audio transcribed');
              } catch (err) {
                console.error(err);
                showToast('Failed to transcribe audio');
              } finally {
                setIsTranscribing(false);
              }
            };
          } catch (err) {
            console.error(err);
            setIsTranscribing(false);
          }
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.current.start();
        setIsRecording(true);
        showToast('Recording... click again to stop');
      } catch (err) {
        console.error('Microphone access denied:', err);
        showToast('Microphone access denied');
      }
    }
  };

  const handlePublish = async () => {`;

content = content.replace('  const handlePublish = async () => {', newHandlers);
fs.writeFileSync('src/components/ContentStudio.tsx', content);

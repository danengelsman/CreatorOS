import { useState, useEffect, useRef } from 'react';
import { generateVideo, getOperationStatus } from '../services/gemini';
import { db, serverTimestamp, OperationType } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import localforage from 'localforage';

export interface UseVideoGenerationProps {
  body: string;
  title: string;
  platform: string;
  brand: any;
  user: any;
  showToast: (msg: string) => void;
  onVideoSaved?: () => void;
}

export function useVideoGeneration({
  body,
  title,
  platform,
  brand,
  user,
  showToast,
  onVideoSaved
}: UseVideoGenerationProps) {
  const [videoStyle, setVideoStyle] = useState<'faceless' | 'avatar' | 'upload'>('faceless');
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoAspect, setVideoAspect] = useState<'9:16' | '16:9'>('9:16');
  const [videoGenerationProgress, setVideoGenerationProgress] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Customization Settings
  const [videoLength, setVideoLength] = useState('Short (5s)');
  const [avatarGender, setAvatarGender] = useState(brand?.avatar?.gender || 'Female');
  const [avatarClothing, setAvatarClothing] = useState(brand?.avatar?.clothing || 'Professional business attire');
  const [backgroundStyle, setBackgroundStyle] = useState(brand?.avatar?.background || 'Modern office with soft lighting');
  const [textOverlay, setTextOverlay] = useState('');
  const [ttsScript, setTtsScript] = useState('');

  const [editedPrompt, setEditedPrompt] = useState('');
  const [isPromptCustomized, setIsPromptCustomized] = useState(false);

  const getAutoPrompt = () => {
    let promptStr = `Create a ${videoLength} ${videoStyle === 'avatar' ? 'AI Avatar led' : 'faceless'} promotional video targeting ${platform}. `;
    promptStr += `Title: ${title || 'Untitled'}. `;
    promptStr += `Visual style: ${brand?.visual_style || 'modern and clean'}. `;
    
    if (videoStyle === 'avatar') {
      promptStr += `Subject details: A ${avatarGender} avatar wearing ${avatarClothing}. `;
    }
    if (backgroundStyle) promptStr += `Background: ${backgroundStyle}. `;
    if (textOverlay) promptStr += `Overlay text or subtitles should include: "${textOverlay}". `;
    
    promptStr += `Narrative/Script: ${ttsScript || body}. `;
    promptStr += `Make it highly engaging.`;
    return promptStr;
  };

  useEffect(() => {
    if (!isPromptCustomized) {
      setEditedPrompt(getAutoPrompt());
    }
  }, [
    videoLength,
    videoStyle,
    platform,
    title,
    brand?.visual_style,
    avatarGender,
    avatarClothing,
    backgroundStyle,
    textOverlay,
    ttsScript,
    body,
    isPromptCustomized
  ]);

  useEffect(() => {
    if (body && !ttsScript) {
      setTtsScript(body);
    }
  }, [body]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       setVideoUrl(URL.createObjectURL(file));
       showToast("Video uploaded successfully");
    }
  };

  const saveVideoToHistory = async (url: string, finalPrompt: string, blob?: Blob) => {
    if (!user) return;
    try {
      let finalUrl = url;
      if (blob) {
        setVideoGenerationProgress('Saving video locally...');
        const videoId = 'local:' + Date.now().toString() + '_' + Math.random().toString(36).substring(7);
        await localforage.setItem(videoId, blob);
        finalUrl = videoId;
      }
      await addDoc(collection(db, 'videos'), {
        userId: user.uid,
        url: finalUrl,
        prompt: finalPrompt,
        title: title || 'Untitled Video',
        createdAt: serverTimestamp()
      });
      if (onVideoSaved) onVideoSaved();
    } catch (error) {
      console.error('Failed to save video to history', error);
    }
  };

  const handleGenerateVideo = async () => {
    if (videoStyle === 'upload') {
       fileInputRef.current?.click();
       return;
    }
    if (!body && !ttsScript) {
      showToast("Please write a script or narrative first.");
      return;
    }
    setIsVideoGenerating(true);
    setVideoGenerationProgress('Initializing Gemini Engine...');
    setVideoUrl(null);
    
    try {
      const promptStr = editedPrompt || getAutoPrompt();
      const operation = await generateVideo(promptStr, videoAspect, videoLength);
      setVideoGenerationProgress('Synthesizing Gemini visuals...');
      
      let done = false;
      let finalOp = operation;
      let status = operation;
      
      while (!done) {
        if (!status.done) {
          await new Promise(r => setTimeout(r, 6000));
          status = await getOperationStatus(finalOp);
        }
        
        if (status.done) {
          done = true;
          if (status.error) {
             throw new Error(status.error.message || 'Video generation failed');
          }
          if (status.data) {
            setVideoGenerationProgress('Processing video...');
            let localUrl = status.data;
            let videoBlob: Blob | undefined;
            
            if (status.data.startsWith('data:')) {
               const res = await fetch(status.data);
               videoBlob = await res.blob();
               localUrl = URL.createObjectURL(videoBlob);
            } else if (status.data.startsWith('gs://') || status.data.startsWith('http')) {
               const { fetchVideoDownloadResponse } = await import('../services/gemini');
               videoBlob = await fetchVideoDownloadResponse(status.data);
               localUrl = URL.createObjectURL(videoBlob);
            }
            setVideoUrl(localUrl);
            await saveVideoToHistory(localUrl, promptStr, videoBlob);
          } else if (status.uri) {
            setVideoGenerationProgress('Downloading video...');
            const { fetchVideoDownloadResponse } = await import('../services/gemini');
            const blob = await fetchVideoDownloadResponse(status.uri);
            const localUrl = URL.createObjectURL(blob);
            setVideoUrl(localUrl);
            await saveVideoToHistory(localUrl, promptStr, blob);
          }
          break;
        } else {
          setVideoGenerationProgress(status.progressPercentage ? `Generating video... ${Math.round(status.progressPercentage)}%` : 'Generating video... this may take a minute');
        }
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      showToast(error.message || 'Video generation failed. Please try again.');
    } finally {
      setIsVideoGenerating(false);
      setVideoGenerationProgress('');
    }
  };

  return {
    videoStyle, setVideoStyle,
    isVideoGenerating,
    videoAspect, setVideoAspect,
    videoGenerationProgress,
    videoUrl, setVideoUrl,
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
  };
}

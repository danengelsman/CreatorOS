import { useState, useEffect, useRef } from 'react';
import { generateVideo, getOperationStatus } from '../services/gemini';
import { db, serverTimestamp, OperationType } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import localforage from 'localforage';
import { getFriendlyError } from '../lib/friendlyError';

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
  const [videoProgressPercent, setVideoProgressPercent] = useState(0);
  const [videoElapsedSeconds, setVideoElapsedSeconds] = useState(0);
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
    setVideoGenerationProgress('Submitting render job to Gemini...');
    setVideoProgressPercent(2);
    setVideoElapsedSeconds(0);
    setVideoUrl(null);
    
    const startedAt = Date.now();
    // Live elapsed counter for the UI.
    const elapsedTimer = setInterval(() => {
      setVideoElapsedSeconds(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);

    // Time-based progress curve. Google exposes no percent for video renders,
    // so we map elapsed time onto a realistic render budget and never claim
    // 100 until the video actually exists.
    const renderBudgetMs = (videoLength.includes('10s') ? 10 : 5) * 60_000;
    const curvePct = () => {
      const elapsed = Date.now() - startedAt;
      // ease-out: quick early movement, slowing as it approaches the cap
      const frac = 1 - Math.exp(-elapsed / (renderBudgetMs * 0.45));
      return Math.min(95, 2 + Math.round(frac * 93));
    };

    const updateProgress = (realPct?: number | null) => {
      const pct = typeof realPct === 'number' ? realPct : curvePct();
      setVideoProgressPercent(pct);
      if (pct < 10) setVideoGenerationProgress('Submitting render job...');
      else if (pct < 35) setVideoGenerationProgress('Composing scenes...');
      else if (pct < 65) setVideoGenerationProgress('Rendering frames...');
      else if (pct < 85) setVideoGenerationProgress('Refining motion and audio...');
      else setVideoGenerationProgress('Finalizing render (almost there)...');
    };

    const promptStr = editedPrompt || getAutoPrompt();

    // Google's video model (gemini-omni-flash) has ZERO free-tier allowance —
    // requests only work on a billed project. Detect that wall and say so
    // immediately instead of retrying for 8 minutes.
    const TIER_LIMIT_RE = /rate limit.*free tier|credits are depleted|billing settings|quota exceeded/i;
    const TIER_LIMIT_MSG = "Video generation requires a paid Gemini API tier. Add billing to your API key's project at aistudio.google.com to unlock it — text features still work on the free tier.";

    const finalize = async (blob: Blob) => {
      setVideoGenerationProgress('Downloading finished video...');
      setVideoProgressPercent(97);
      const localUrl = URL.createObjectURL(blob);
      setVideoUrl(localUrl);
      await saveVideoToHistory(localUrl, promptStr, blob);
    };
    
    try {
      let operation;
      try {
        operation = await generateVideo(promptStr, videoAspect, videoLength);
      } catch (createErr: any) {
        if (TIER_LIMIT_RE.test(String(createErr?.message || createErr))) {
          throw new Error(TIER_LIMIT_MSG);
        }
        throw createErr;
      }
      
      let done = false;
      let finalOp = operation;
      let status = operation;
      let pollFailures = 0;
      /** Max consecutive failed status polls before declaring stuck. */
      const MAX_POLL_FAILURES = 3;
      /** Hard ceiling — beyond this a render is effectively lost. */
      const MAX_TOTAL_WAIT_MS = 8 * 60_000;
      const TIMEOUT_MSG = 'Video render timed out after 8 minutes. Try a shorter video or try again in a bit.';
      
      while (!done) {
        if (!status.done) {
          updateProgress();
          await new Promise(r => setTimeout(r, 5000));
          try {
            status = await getOperationStatus(finalOp);
            pollFailures = 0;
            if (typeof (status as any)?.progressPercentage === 'number') {
              updateProgress((status as any).progressPercentage);
            }
          } catch (pollErr) {
            pollFailures++;
            const msg = String((pollErr as any)?.message || pollErr);
            if (TIER_LIMIT_RE.test(msg)) throw new Error(TIER_LIMIT_MSG);
            if (Date.now() - startedAt > MAX_TOTAL_WAIT_MS) throw new Error(TIMEOUT_MSG);
            if (pollFailures >= MAX_POLL_FAILURES) {
              throw new Error('Lost contact with the render job after several retries. It may still finish and appear in your video history.');
            }
            setVideoGenerationProgress(`Connection hiccup — retrying (${pollFailures}/${MAX_POLL_FAILURES})...`);
            continue;
          }
          if (Date.now() - startedAt > MAX_TOTAL_WAIT_MS) throw new Error(TIMEOUT_MSG);
        }
        
        if (status.done) {
          done = true;
          if (status.error) {
             throw new Error(getFriendlyError(status.error));
          }
          if (status.data) {
            let videoBlob: Blob | undefined;

            if (status.data.startsWith('data:')) {
               const res = await fetch(status.data);
               videoBlob = await res.blob();
            } else if (status.data.startsWith('gs://') || status.data.startsWith('http')) {
               const { fetchVideoDownloadResponse } = await import('../services/gemini');
               videoBlob = await fetchVideoDownloadResponse(status.data);
            }
            if (videoBlob) await finalize(videoBlob);
          } else if (status.uri) {
            const { fetchVideoDownloadResponse } = await import('../services/gemini');
            const blob = await fetchVideoDownloadResponse(status.uri);
            await finalize(blob);
          } else {
            throw new Error('Render finished but no video data was returned.');
          }
          break;
        }
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      showToast(getFriendlyError(error));
    } finally {
      clearInterval(elapsedTimer);
      setIsVideoGenerating(false);
      setVideoGenerationProgress('');
      setVideoProgressPercent(0);
      setVideoElapsedSeconds(0);
    }
  };

  return {
    videoStyle, setVideoStyle,
    isVideoGenerating,
    videoAspect, setVideoAspect,
    videoGenerationProgress,
    videoProgressPercent,
    videoElapsedSeconds,
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

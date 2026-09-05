import React, { useState } from 'react';
import { CircleNotch as Loader2, VideoCamera, Faders } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import { useVideoGeneration } from '../hooks/useVideoGeneration';
import VideoScriptEditor from './VideoScriptEditor';
import VideoGenerationPlayer from './VideoGenerationPlayer';

interface VideoStudioProps {
  body: string;
  title: string;
  platform: string;
  brand: any;
  showToast: (msg: string) => void;
  user?: any;
  onVideoSaved?: () => void;
}

export default function VideoStudio({ body, title, platform, brand, showToast, user, onVideoSaved }: VideoStudioProps) {
  const [showSettings, setShowSettings] = useState(false);
  
  const videoGen = useVideoGeneration({ body, title, platform, brand, user, showToast, onVideoSaved });

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col gap-4 bg-[var(--bg-tertiary)] p-5 rounded-2xl ios-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--separator)] pb-4">
          <div className="flex items-center gap-3">
            <VideoCamera size={24} className="text-[var(--accent)]" weight="fill" />
            <h3 className="font-semibold text-[17px]">Gemini Studio</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={cn("p-2 rounded-full transition-colors", showSettings ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-secondary)] text-[var(--label-secondary)] hover:text-[var(--label-primary)]")}
              title="Advanced Settings"
            >
              <Faders size={18} weight="bold" />
            </button>
          </div>
        </div>

        <VideoScriptEditor 
          showSettings={showSettings}
          videoStyle={videoGen.videoStyle} setVideoStyle={videoGen.setVideoStyle}
          videoAspect={videoGen.videoAspect} setVideoAspect={videoGen.setVideoAspect}
          videoLength={videoGen.videoLength} setVideoLength={videoGen.setVideoLength}
          avatarGender={videoGen.avatarGender} setAvatarGender={videoGen.setAvatarGender}
          avatarClothing={videoGen.avatarClothing} setAvatarClothing={videoGen.setAvatarClothing}
          backgroundStyle={videoGen.backgroundStyle} setBackgroundStyle={videoGen.setBackgroundStyle}
          textOverlay={videoGen.textOverlay} setTextOverlay={videoGen.setTextOverlay}
          ttsScript={videoGen.ttsScript} setTtsScript={videoGen.setTtsScript}
          editedPrompt={videoGen.editedPrompt} setEditedPrompt={videoGen.setEditedPrompt}
          isPromptCustomized={videoGen.isPromptCustomized} setIsPromptCustomized={videoGen.setIsPromptCustomized}
        />

        <div className="flex justify-end pt-2">
          <input type="file" ref={videoGen.fileInputRef} onChange={videoGen.handleFileUpload} accept="video/*" className="hidden" />
          <button 
            onClick={videoGen.handleGenerateVideo}
            disabled={videoGen.isVideoGenerating}
            className="ios-button ios-button-tinted w-full md:w-auto"
          >
            {videoGen.isVideoGenerating ? (
              <Loader2 size={17} className="animate-spin mr-2 inline-block" />
            ) : (
              <VideoCamera size={17} strokeWidth={1.5} className="mr-2 inline-block" />
            )}
            <span>{videoGen.videoStyle === 'upload' ? 'Upload Video' : 'Generate Gemini'}</span>
          </button>
        </div>
      </div>

      <VideoGenerationPlayer 
        videoUrl={videoGen.videoUrl}
        isVideoGenerating={videoGen.isVideoGenerating}
        videoAspect={videoGen.videoAspect}
        videoGenerationProgress={videoGen.videoGenerationProgress}
      />
    </div>
  );
}

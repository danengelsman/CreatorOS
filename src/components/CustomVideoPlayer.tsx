import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SpeakerHigh, SpeakerSlash, FastForward, Rewind, CornersOut } from '@phosphor-icons/react';
import { cn } from '../lib/utils';

interface CustomVideoPlayerProps {
  videoUrl: string;
}

export default function CustomVideoPlayer({ videoUrl }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.log('Auto-play blocked'));
      setIsPlaying(true);
    }
  }, [videoUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime += 5;
  };

  const skipBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime -= 5;
  };

  const changeSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
      setPlaybackSpeed(nextSpeed);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full group flex items-center justify-center bg-black overflow-hidden"
    >
      {!hasError ? (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            loop
            playsInline
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleTimeUpdate}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover cursor-pointer"
          />
          
          {/* Play/Pause Large Overlay Center (optional) */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 p-4 rounded-full backdrop-blur-sm">
                <Play size={48} weight="fill" className="text-white opacity-80 pl-1" />
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-4 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            
            {/* Seek Bar */}
            <div className="flex items-center gap-2 w-full mb-3">
              <span className="text-white text-xs font-mono w-10 text-right">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                onClick={e => e.stopPropagation()}
                className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
              <span className="text-white/70 text-xs font-mono w-10">{formatTime(duration)}</span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="text-white hover:text-[var(--accent)] active:scale-95 transition-all outline-none">
                  {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
                </button>
                <button onClick={skipBack} className="text-white hover:text-[var(--accent)] active:scale-95 transition-all outline-none">
                  <Rewind size={20} weight="fill" />
                </button>
                <button onClick={skipForward} className="text-white hover:text-[var(--accent)] active:scale-95 transition-all outline-none">
                  <FastForward size={20} weight="fill" />
                </button>
                <button onClick={toggleMute} className="text-white hover:text-[var(--accent)] active:scale-95 transition-all outline-none">
                  {isMuted ? <SpeakerSlash size={22} weight="fill" /> : <SpeakerHigh size={22} weight="fill" />}
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={changeSpeed} className="text-white hover:text-[var(--accent)] active:scale-95 transition-all outline-none text-xs font-bold font-mono">
                  {playbackSpeed}x
                </button>
                <button onClick={toggleFullscreen} className="text-white hover:text-[var(--accent)] active:scale-95 transition-all outline-none">
                  <CornersOut size={20} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white/50 mb-2">
            <SpeakerSlash size={24} />
          </div>
          <p className="text-white/80 font-semibold text-sm">Video expired or unavailable</p>
          <p className="text-white/50 text-xs max-w-[200px] leading-relaxed">
            Temporary generated videos are cleared after your session ends for privacy.
          </p>
        </div>
      )}
    </div>
  );
}

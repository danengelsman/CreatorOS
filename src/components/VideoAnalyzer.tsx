import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoCamera, Sparkle, Target, ListChecks, FileVideo, UploadSimple, PauseCircle, PlayCircle, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { analyzeVideo } from '../services/gemini';
import Markdown from 'react-markdown';

export default function VideoAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisType, setAnalysisType] = useState<'summary' | 'flashcards' | 'marketing'>('summary');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('video/')) {
        setFile(droppedFile);
        setResult(null);
        setError(null);
      } else {
        setError('Please upload a valid video file.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.startsWith('video/')) {
        setFile(selectedFile);
        setResult(null);
        setError(null);
      } else {
        setError('Please upload a valid video file.');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeVideo(file, analysisType);
      setResult(analysis);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze video.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full pb-24">
      <div className="pt-4 border-b border-[var(--separator)] pb-6 mb-8 flex items-center justify-between px-2">
        <div>
          <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">
            Video Analyzer
          </h1>
          <p className="text-[15px] text-[var(--label-secondary)] mt-1">
            Instantly extract summaries, flashcards, and marketing highlights from long-form videos.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20 shadow-sm">
          <VideoCamera size={24} weight="fill" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="ios-card bg-[var(--bg-secondary)] border border-[var(--separator)] p-5">
            <h3 className="font-bold text-[16px] mb-4 text-[var(--label-primary)] flex items-center gap-2">
              <Target size={18} className="text-[var(--accent)]" /> Analysis Output
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => setAnalysisType('summary')}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${analysisType === 'summary' ? 'bg-[var(--accent)] border-[var(--accent)] shadow-md shadow-[#007AFF20]' : 'border-[var(--separator)] hover:bg-[var(--bg-tertiary)] bg-[var(--bg-primary)]'}`}
              >
                <ListChecks size={20} className={analysisType === 'summary' ? 'text-white' : 'text-[var(--label-secondary)]'} weight={analysisType === 'summary' ? 'fill' : 'regular'} />
                <div>
                  <div className={`font-semibold text-[14px] ${analysisType === 'summary' ? 'text-white' : 'text-[var(--label-primary)]'}`}>Executive Summary</div>
                  <div className={`text-[12px] mt-0.5 ${analysisType === 'summary' ? 'text-white/80' : 'text-[var(--label-secondary)]'}`}>Key takeaways and chapter breakdown</div>
                </div>
              </button>

              <button
                onClick={() => setAnalysisType('flashcards')}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${analysisType === 'flashcards' ? 'bg-[var(--accent)] border-[var(--accent)] shadow-md shadow-[#007AFF20]' : 'border-[var(--separator)] hover:bg-[var(--bg-tertiary)] bg-[var(--bg-primary)]'}`}
              >
                <Sparkle size={20} className={analysisType === 'flashcards' ? 'text-white' : 'text-[var(--label-secondary)]'} weight={analysisType === 'flashcards' ? 'fill' : 'regular'} />
                <div>
                  <div className={`font-semibold text-[14px] ${analysisType === 'flashcards' ? 'text-white' : 'text-[var(--label-primary)]'}`}>Flashcards</div>
                  <div className={`text-[12px] mt-0.5 ${analysisType === 'flashcards' ? 'text-white/80' : 'text-[var(--label-secondary)]'}`}>Q&A style study guide</div>
                </div>
              </button>

              <button
                onClick={() => setAnalysisType('marketing')}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${analysisType === 'marketing' ? 'bg-[var(--accent)] border-[var(--accent)] shadow-md shadow-[#007AFF20]' : 'border-[var(--separator)] hover:bg-[var(--bg-tertiary)] bg-[var(--bg-primary)]'}`}
              >
                <FileVideo size={20} className={analysisType === 'marketing' ? 'text-white' : 'text-[var(--label-secondary)]'} weight={analysisType === 'marketing' ? 'fill' : 'regular'} />
                <div>
                  <div className={`font-semibold text-[14px] ${analysisType === 'marketing' ? 'text-white' : 'text-[var(--label-primary)]'}`}>Marketing Highlights</div>
                  <div className={`text-[12px] mt-0.5 ${analysisType === 'marketing' ? 'text-white/80' : 'text-[var(--label-secondary)]'}`}>Short-form hook angles and viral quotes</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {!file && !result ? (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl h-[400px] flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all
                ${isDragging ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--separator)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
            >
              <div className="w-16 h-16 rounded-full bg-[var(--bg-primary)] border border-[var(--separator)] flex items-center justify-center mb-4 shadow-sm">
                <UploadSimple size={28} className="text-[var(--label-secondary)]" weight="regular" />
              </div>
              <h3 className="font-bold text-[18px] text-[var(--label-primary)] mb-2">Upload Video Content</h3>
              <p className="text-[14px] text-[var(--label-secondary)] max-w-sm mb-6">
                Drag and drop a video file here, or click to browse. Max size 1GB. MP4, MOV, or WEBM format.
              </p>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="video/*"
                onChange={handleFileSelect}
              />
            </div>
          ) : isAnalyzing ? (
            <div className="ios-card bg-[var(--bg-secondary)] border border-[var(--separator)] h-[400px] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
               <motion.div 
                 animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} 
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/10 to-transparent pointer-events-none"
               />
               <Sparkle size={48} className="text-[var(--accent)] mb-4 animate-pulse" weight="fill" />
               <h3 className="font-bold text-[20px] text-[var(--label-primary)] mb-2">Analyzing Video</h3>
               <p className="text-[14px] text-[var(--label-secondary)] max-w-sm">
                 Gemini is watching your video. It may take a minute for longer content...
               </p>
            </div>
          ) : result ? (
             <div className="ios-card bg-[var(--bg-secondary)] border border-[var(--separator)] flex flex-col min-h-[400px]">
               <div className="p-4 border-b border-[var(--separator)] flex items-center justify-between bg-[var(--bg-tertiary)]">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded bg-[var(--system-green)]/10 text-[var(--system-green)] flex items-center justify-center">
                     <CheckCircle size={18} weight="fill" />
                   </div>
                   <div>
                     <div className="font-bold text-[14px]">{file?.name}</div>
                     <div className="text-[12px] text-[var(--label-secondary)] capitalize">{analysisType} Generated</div>
                   </div>
                 </div>
                 <button 
                   onClick={() => { setFile(null); setResult(null); }}
                   className="text-[12px] font-bold text-[var(--accent)] hover:underline"
                 >
                   Analyze Another
                 </button>
               </div>
               <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                 <div className="markdown-body">
                   <Markdown>{result}</Markdown>
                 </div>
               </div>
             </div>
          ) : (
            <div className="ios-card bg-[var(--bg-secondary)] border border-[var(--separator)] p-8 flex flex-col min-h-[400px] items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-primary)] border border-[var(--separator)] flex items-center justify-center mb-6 shadow-sm">
                <FileVideo size={28} className="text-[var(--accent)]" weight="fill" />
              </div>
              <h3 className="font-bold text-[18px] text-[var(--label-primary)] mb-2">{file?.name}</h3>
              <p className="text-[14px] text-[var(--label-secondary)] mb-8">
                Ready to extract {analysisType} from this video.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setFile(null)}
                  className="ios-button ios-button-tinted h-10 px-6 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAnalyze}
                  className="ios-button ios-button-filled h-10 px-8 font-semibold flex items-center gap-2 shadow-lg shadow-[#007AFF33]"
                >
                  <Sparkle size={18} /> Extract Insights
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--system-red)]/10 border border-[var(--system-red)]/20 flex items-start gap-3">
              <WarningCircle size={20} className="text-[var(--system-red)] shrink-0 mt-0.5" weight="fill" />
              <div>
                <div className="text-[14px] font-bold text-[var(--system-red)]">Analysis Failed</div>
                <div className="text-[13px] text-[var(--system-red)]/80 mt-1">{error}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

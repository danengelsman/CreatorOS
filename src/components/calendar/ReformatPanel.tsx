import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, apiFetch } from '../../firebase';
import { getFriendlyError } from '../../lib/friendlyError';
import { CalendarBlock, ReformatSuggestion } from './calendarTypes';
import { getPlatformStyle, getPlatformIcon } from './calendarHelpers';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface ReformatPanelProps {
  user: any;
  selectedEvent: CalendarBlock | null;
  onSaved: () => void;
}

/**
 * F5.4: extracted AI reformat panel.
 * Owns isGeneratingReformat/selectedTargetPlatforms/reformatSuggestions/
 * reformatError state + handleGenerateAIReformat/handleSaveAIBlock, including
 * the Gemini call and Firestore draft writes. Renders the reformat UI
 * previously inline in EventDetailModal.
 */
export default function ReformatPanel({
  user,
  selectedEvent,
  onSaved,
}: ReformatPanelProps) {
  const [isGeneratingReformat, setIsGeneratingReformat] = useState(false);
  const [selectedTargetPlatforms, setSelectedTargetPlatforms] = useState<string[]>([]);
  const [reformatSuggestions, setReformatSuggestions] = useState<ReformatSuggestion[]>([]);
  const [reformatError, setReformatError] = useState('');

  const handleGenerateAIReformat = async () => {
    if (!selectedEvent || selectedTargetPlatforms.length === 0) return;
    setIsGeneratingReformat(true);
    setReformatSuggestions([]);
    setReformatError('');

    const originalTitle = selectedEvent.name || selectedEvent.data?.title || 'Draft Content';
    const originalBody = selectedEvent.data?.body || selectedEvent.body || '';
    const originalPlatform = selectedEvent.data?.platform || selectedEvent.platform || 'youtube';

    try {
      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          contents: `You are an expert social media copywriter and content strategist.
Your task is to reformat the following content block for multiple target platforms: ${selectedTargetPlatforms.join(', ')}.

Original Platform: ${originalPlatform}
Original Title: ${originalTitle}
Original Content:
${originalBody}

Generate fully rewritten, native, and engaging content tailored specifically for each of the requested target platforms:
- TikTok: Needs a bold, attention-grabbing opening hook, script style paragraphs, and 3-4 viral hashtags.
- Instagram: Needs spacing, visual emoticons/emojis, strong caption aesthetic, call-to-action, and hashtag block.
- X (Twitter): Needs a very punchy, thought-provoking single post or clean 2-post micro-thread, maximizing engagement within character constraints.
- YouTube: Needs an optimized description with clickable hook chapters, title ideas, and tag recommendations.

Return your response strictly in the following JSON format:
{
  "suggestions": [
    {
      "platform": "tiktok",
      "title": "TikTok Hook/Title",
      "body": "TikTok formatted text body..."
    },
    {
      "platform": "instagram",
      "title": "Instagram Caption Title",
      "body": "Instagram formatted text body..."
    }
  ]
}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                suggestions: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      platform: { type: 'STRING' },
                      title: { type: 'STRING' },
                      body: { type: 'STRING' },
                    },
                    required: ['platform', 'title', 'body'],
                  },
                },
              },
              required: ['suggestions'],
            },
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to generate suggestions');
      const result = await response.json();

      const parsed = JSON.parse(result.text);
      if (parsed?.suggestions) {
        setReformatSuggestions(parsed.suggestions);
      } else {
        throw new Error('Invalid formatting response');
      }
    } catch (err: any) {
      console.error(err);
      setReformatError(getFriendlyError(err));
    } finally {
      setIsGeneratingReformat(false);
    }
  };

  const handleSaveAIBlock = async (suggestion: ReformatSuggestion) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'projects'), {
        userId: user.uid,
        name: suggestion.title,
        type: 'content',
        status: 'Draft',
        scheduledDate: null,
        data: {
          title: suggestion.title,
          body: suggestion.body,
          platform: suggestion.platform,
          score: 80,
          score_feedback: 'AI Reformatted Draft',
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await onSaved();
      setReformatSuggestions((prev) => prev.filter((s) => s !== suggestion));
    } catch (error) {
      console.error('Error saving AI draft:', error);
    }
  };

  if (!selectedEvent) return null;

  const currentPlatform = selectedEvent.data?.platform || selectedEvent.platform || 'youtube';

  return (
    <div className="border-t border-[var(--separator)]/60 pt-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-[var(--accent)]" />
        <h4 className="text-[15px] font-bold text-[var(--label-primary)]">
          Reformat for Multiple Platforms with AI
        </h4>
      </div>
      <p className="text-[12px] text-[var(--label-secondary)] font-medium leading-relaxed">
        Instantly rewrite and format this content block into separate native drafts for your
        other social channels using Gemini.
      </p>

      {/* Platforms selection toggles */}
      <div className="flex flex-wrap gap-2.5 pt-1">
        {['youtube', 'tiktok', 'instagram', 'twitter'].map((p) => {
          const isCurrent = currentPlatform === p;
          const isSelected = selectedTargetPlatforms.includes(p);
          const config = getPlatformStyle(p);

          if (isCurrent) return null; // Can't reformat to its own platform

          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                if (isSelected) {
                  setSelectedTargetPlatforms(
                    selectedTargetPlatforms.filter((item) => item !== p),
                  );
                } else {
                  setSelectedTargetPlatforms([...selectedTargetPlatforms, p]);
                }
              }}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-[13px] font-semibold transition-all',
                isSelected
                  ? `${config.bg} ${config.border} ${config.text} scale-[1.03]`
                  : 'border-[var(--separator)]/40 hover:bg-[var(--bg-secondary)] text-[var(--label-secondary)]',
              )}
            >
              {getPlatformIcon(p, 14)}
              {config.name}
            </button>
          );
        })}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerateAIReformat}
        disabled={selectedTargetPlatforms.length === 0 || isGeneratingReformat}
        className="w-full py-3.5 rounded-xl bg-[var(--accent)] text-white text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
      >
        {isGeneratingReformat ? (
          <RefreshCw size={15} className="animate-spin" />
        ) : (
          <Sparkles size={15} />
        )}
        Generate Cross-Platform Reformatted Drafts
      </button>

      {/* AI Generating Skeletons */}
      {isGeneratingReformat && (
        <div className="space-y-3 pt-3">
          <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl animate-pulse space-y-2">
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4" />
            <div className="h-3 bg-[var(--bg-tertiary)] rounded w-3/4" />
            <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
          </div>
        </div>
      )}

      {/* Error Indicator */}
      {reformatError && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 text-[13px] font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          {reformatError}
        </div>
      )}

      {/* Suggestions Display */}
      {reformatSuggestions.length > 0 && (
        <div className="space-y-4 pt-3 border-t border-[var(--separator)]/40">
          <h5 className="text-[13px] font-bold text-[var(--label-primary)] uppercase tracking-widest px-1">
            Gemini Proposed Drafts
          </h5>
          <div className="space-y-4">
            {reformatSuggestions.map((s, idx) => {
              const config = getPlatformStyle(s.platform);
              return (
                <div
                  key={idx}
                  className={cn(
                    'p-4 rounded-2xl border bg-[var(--bg-secondary)]/30 flex flex-col gap-2.5',
                    config.border,
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                        config.bg,
                        config.text,
                      )}
                    >
                      {config.name} Draft
                    </span>
                    <button
                      onClick={() => handleSaveAIBlock(s)}
                      className="text-[12px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> Save Draft
                    </button>
                  </div>
                  <h6 className="text-[13px] font-bold text-[var(--label-primary)]">
                    {s.title}
                  </h6>
                  <p className="text-[12px] text-[var(--label-secondary)] whitespace-pre-wrap leading-relaxed font-medium">
                    {s.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkle, CheckCircle, Target, Lightning, Lightbulb, Play } from '@phosphor-icons/react';
import { apiFetch } from '../firebase';
import { cn } from '../lib/utils';

export default function AINicheCoach({ summary, brand }: { summary: any, brand: any }) {
  const [advice, setAdvice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const generateAdvice = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const followers = summary?.totalFollowers || 0;
      const engagement = summary?.engagementRate || 0;
      const monetizationProgress = summary?.revenueStreams ? JSON.stringify(summary.revenueStreams) : "Ads: 10% to unlock, Affiliates: Planning, Sponsorships: 5% to unlock, Digital Products: Planning";
      const brandNiche = brand?.name || "Content Creator";
      
      const prompt = `You are the AI Niche Coach for a content creator. Analyze their current stats:
Followers: ${followers}
Engagement Rate: ${engagement}%
Brand/Niche: ${brandNiche}
Monetization Setup: ${monetizationProgress}

Provide a weekly, actionable strategy and step-by-step guidance to help them scale their monetization efforts and reach their first dollar faster.

Return the response as JSON matching this schema:
{
  "overview": "A brief, encouraging overview of where they are and the primary focus this week",
  "focusArea": "The single most important monetization channel they should focus on (e.g. 'Affiliates' or 'Digital Products')",
  "actionSteps": [
    {
      "title": "Actionable step title",
      "description": "How to execute this step",
      "timeRequired": "Estimated time (e.g. '30 mins')"
    }
  ],
  "expectedOutcome": "What they can expect if they complete these steps"
}`;

      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                overview: { type: "STRING" },
                focusArea: { type: "STRING" },
                actionSteps: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      title: { type: "STRING" },
                      description: { type: "STRING" },
                      timeRequired: { type: "STRING" }
                    },
                    required: ["title", "description", "timeRequired"]
                  }
                },
                expectedOutcome: { type: "STRING" }
              },
              required: ["overview", "focusArea", "actionSteps", "expectedOutcome"]
            }
          }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate coaching advice.");
      }

      const data = await response.json();
      if (data.text) {
        setAdvice(JSON.parse(data.text));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating advice.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Generate advice once summary is available and advice hasn't been generated
    if (summary && !advice && !isLoading) {
      generateAdvice();
    }
  }, [summary]);

  return (
    <div className="ios-card bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-6 flex flex-col gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Sparkle size={120} weight="duotone" className="text-indigo-500" />
      </div>

      <div className="flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Lightbulb size={24} weight="duotone" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--label-primary)]">AI Niche Coach</h2>
            <p className="text-sm font-medium text-[var(--label-secondary)]">Personalized Monetization Strategy</p>
          </div>
        </div>
        <button
          onClick={generateAdvice}
          disabled={isLoading}
          className="ios-button bg-[var(--bg-primary)] border border-[var(--separator)] text-[var(--label-primary)] px-4 py-2 flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkle size={16} weight="duotone" className="text-indigo-500" />
          )}
          {isLoading ? 'Analyzing...' : 'Refresh Plan'}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-sm font-medium border border-red-500/20 z-10 relative">
          {errorMsg}
        </div>
      )}

      {isLoading && !advice && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 z-10 relative">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] font-medium text-[var(--label-secondary)]">Analyzing metrics and identifying monetization levers...</p>
        </div>
      )}

      {!isLoading && advice && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 z-10 relative"
        >
          <div className="bg-[var(--bg-primary)]/80 backdrop-blur-md border border-[var(--separator)] p-5 rounded-2xl">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-indigo-500 mb-2">This Week's Assessment</h3>
            <p className="text-[15px] leading-relaxed text-[var(--label-primary)]">{advice.overview}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target size={20} className="text-[var(--label-primary)]" />
              <h3 className="text-lg font-bold">Action Plan: {advice.focusArea}</h3>
            </div>
            <div className="space-y-3">
              {advice.actionSteps.map((step: any, idx: number) => (
                <div key={idx} className="bg-[var(--bg-primary)] border border-[var(--separator)] p-4 rounded-2xl flex gap-4 hover:border-indigo-500/50 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-[15px] text-[var(--label-primary)]">{step.title}</h4>
                      <span className="text-[11px] font-bold px-2 py-1 bg-[var(--bg-secondary)] rounded-md text-[var(--label-secondary)] whitespace-nowrap">
                        {step.timeRequired}
                      </span>
                    </div>
                    <p className="text-[14px] text-[var(--label-secondary)] leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 p-5 rounded-2xl flex items-start gap-3">
            <Lightning size={24} weight="duotone" className="text-green-500 flex-shrink-0" />
            <div>
              <h3 className="text-[13px] font-bold text-green-500 uppercase tracking-wider mb-1">Expected Outcome</h3>
              <p className="text-[15px] font-medium text-[var(--label-primary)]">{advice.expectedOutcome}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

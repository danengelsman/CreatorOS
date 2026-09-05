import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, Sparkle, Clock, TrendUp, ChartLineUp, ArrowRight, Play, CheckCircle, ArrowsClockwise as RefreshCw } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { authorizedFetch, apiFetch } from '../firebase';
import { cn } from '../lib/utils';

export default function ContentIdeaGenerator({ brand, onSelectIdea }: { brand: any, onSelectIdea: (idea: any) => void }) {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Analyzing trends and performance...");
  const [analytics, setAnalytics] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick idea feature
  const [quickIdea, setQuickIdea] = useState<any>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [isGeneratingQuickIdea, setIsGeneratingQuickIdea] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // IDLE TIMER: 30 seconds for demo purposes
  const IDLE_TIMEOUT = 30000;

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setIsIdle(false);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
      generateQuickIdea();
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    // Initial fetch of analytics and ideas
    fetchAnalyticsAndIdeas();

    // Set up idle listeners
    // window.addEventListener('mousemove', resetIdleTimer);
    // window.addEventListener('keypress', resetIdleTimer);
    // window.addEventListener('scroll', resetIdleTimer);
    // window.addEventListener('click', resetIdleTimer);
    
    // resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      // window.removeEventListener('mousemove', resetIdleTimer);
      // window.removeEventListener('keypress', resetIdleTimer);
      // window.removeEventListener('scroll', resetIdleTimer);
      // window.removeEventListener('click', resetIdleTimer);
    };
  }, []);

  const fetchAnalyticsAndIdeas = async () => {
    try {
      setIsLoading(true); setLoadingText("Analyzing trends and performance...");
      const res = await authorizedFetch('/api/analytics/summary');
      let currentAnalytics = null;
      if (res && res.success) {
        setAnalytics(res.summary);
        currentAnalytics = res.summary;
      }
      await generateWeeklyIdeas(currentAnalytics);
    } catch (err) {
      console.warn("Failed to fetch analytics:", err);
      // Generate ideas without analytics if it fails
      await generateWeeklyIdeas(null);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWeeklyIdeas = async (currentAnalytics: any) => {
    setLoadingText("Generating your weekly content ideas...");
    setIsLoading(true); setLoadingText("Analyzing trends and performance...");
    setErrorMsg('');
    try {
      let analyticsContext = "No prior analytics available.";
      if (currentAnalytics) {
        analyticsContext = `Recent Performance: 
        YouTube: ${currentAnalytics.youtube?.views || 0} views, ${currentAnalytics.youtube?.subscribers || 0} subs.
        TikTok: ${currentAnalytics.tiktok?.views || 0} views, ${currentAnalytics.tiktok?.followers || 0} followers.
        Instagram: ${currentAnalytics.instagram?.views || 0} views, ${currentAnalytics.instagram?.followers || 0} followers.
        `;
      }

      const prompt = `Generate 5 personalized, high-performing content ideas for this week.
      Factor in the user's niche, performance insights, and trending topics.
      
      Brand Niche: ${brand?.name || 'Content Creator'} - ${brand?.tagline || ''}
      Brand Archetype: ${brand?.archetype || 'Unknown'}
      
      ${analyticsContext}
      
      Suggest ideas that align with their niche and leverage current trends.`;

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
                ideas: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      title: { type: "STRING" },
                      hook: { type: "STRING" },
                      description: { type: "STRING" },
                      trend_factor: { type: "STRING", description: "Why this works right now (e.g. 'Capitalizes on current DIY trend')" },
                      estimated_prep_time: { type: "STRING" }
                    },
                    required: ["title", "hook", "description", "trend_factor", "estimated_prep_time"]
                  }
                }
              },
              required: ["ideas"]
            }
          }
        })
      });

      if (!response.ok) { const err = await response.json().catch(()=>({})); throw new Error(err.error || "Failed to generate ideas."); }
      const data = await response.json();
      
      if (data.text) {
        const parsed = JSON.parse(data.text);
        setIdeas(parsed.ideas || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating ideas.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuickIdea = async () => {
    // Only generate if we don't already have one showing
    if (quickIdea || isGeneratingQuickIdea) return;
    
    setIsGeneratingQuickIdea(true);
    try {
      const prompt = `Generate a SINGLE quick, 5-minute post idea for a creator experiencing writer's block.
      Brand Niche: ${brand?.name || 'Content Creator'} - ${brand?.tagline || ''}
      
      The idea should be incredibly low friction, requiring almost zero prep time.`;

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
                title: { type: "STRING" },
                hook: { type: "STRING" },
                description: { type: "STRING" }
              },
              required: ["title", "hook", "description"]
            }
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          const parsed = JSON.parse(data.text);
          setQuickIdea(parsed);
        }
      }
    } catch (err) {
      console.warn("Quick idea generation failed:", err);
    } finally {
      setIsGeneratingQuickIdea(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-20 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="font-serif text-[28px] font-semibold text-[var(--label-primary)] flex items-center gap-2">
            <Sparkle size={28} className="text-[var(--accent)]" weight="fill" />
            Weekly Ideas Generator
          </h2>
          <p className="text-[15px] text-[var(--label-secondary)] mt-1">
            Personalized content ideas tailored to your niche, trends, and recent analytics.
          </p>
        </div>
        
        <button 
          onClick={() => fetchAnalyticsAndIdeas()}
          disabled={isLoading}
          className="w-full md:w-auto ios-button bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--label-primary)] px-4 py-2 rounded-xl text-[14px] font-bold hover:bg-[var(--separator)] transition-colors flex items-center justify-center md:justify-start gap-2 disabled:opacity-50"
        >
          <RefreshCw size={18} className={cn(isLoading && "animate-spin")} />
          Regenerate Weekly Mix
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-sm font-medium mb-6">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] font-medium text-[var(--label-secondary)]">{loadingText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ideas.map((idea, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx}
              className="bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-2xl p-6 hover:border-[var(--accent)] hover:shadow-sm transition-all group flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-serif text-[18px] font-semibold text-[var(--label-primary)] leading-snug pr-4">
                  {idea.title}
                </h3>
                <div className="p-2 bg-[var(--bg-tertiary)] rounded-full text-[var(--label-secondary)] group-hover:text-[var(--accent)] group-hover:bg-[var(--accent)]/10 transition-colors">
                  <Lightbulb size={20} weight="fill" />
                </div>
              </div>
              
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] text-[12px] font-bold rounded-full">
                  <TrendUp size={14} weight="bold" />
                  {idea.trend_factor}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-tertiary)] text-[var(--label-secondary)] text-[12px] font-bold rounded-full">
                  <Clock size={14} weight="bold" />
                  {idea.estimated_prep_time}
                </span>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--separator)]/50">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--label-tertiary)] mb-1 block">Hook</span>
                  <p className="text-[14px] text-[var(--label-primary)] font-medium leading-relaxed">
                    "{idea.hook}"
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--label-tertiary)] mb-1 block">Concept</span>
                  <p className="text-[14px] text-[var(--label-secondary)] leading-relaxed">
                    {idea.description}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => onSelectIdea(idea)}
                className="w-full mt-auto ios-button bg-[var(--bg-primary)] border border-[var(--separator)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--label-primary)] py-3 rounded-xl text-[14px] font-bold transition-colors flex items-center justify-center gap-2"
              >
                Create This Post
                <ArrowRight size={16} weight="bold" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick 5-Minute Idea Popup for Inactivity */}
      <AnimatePresence>
        {isIdle && quickIdea && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 md:bottom-8 md:left-auto md:right-8 z-[150] md:w-full md:max-w-sm mx-auto md:mx-0"
          >
            <div className="bg-[var(--bg-primary)] border border-[var(--accent)]/50 shadow-2xl rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent)] to-purple-500" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkle size={20} className="text-[var(--accent)]" weight="fill" />
                  <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--label-primary)]">
                    Stuck? Quick 5-Min Idea
                  </span>
                  <button 
                    onClick={() => { setQuickIdea(null); setIsIdle(false); }}
                    className="ml-auto text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                  >
                    ✕
                  </button>
                </div>
                <h4 className="font-serif text-[17px] font-semibold text-[var(--label-primary)] mb-2">
                  {quickIdea.title}
                </h4>
                <p className="text-[14px] text-[var(--label-secondary)] leading-relaxed mb-4">
                  {quickIdea.description}
                </p>
                <button 
                  onClick={() => {
                    onSelectIdea(quickIdea);
                    setQuickIdea(null);
                    setIsIdle(false);
                  }}
                  className="w-full ios-button bg-[var(--accent)] text-white py-2.5 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2"
                >
                  Write this now <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

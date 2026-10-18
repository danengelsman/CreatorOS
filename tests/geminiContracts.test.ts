// F4.4/F4.6 — Zod contract tests for every Gemini JSON payload parsed in
// src/services/gemini.ts. Pure schema tests: no network, no Firebase, no
// module mocks needed (the schemas module is standalone).
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  type BrandKit,
  MODEL_OUTPUT_ERROR,
  brandKitSchema,
  contentIdeasSchema,
  contentScoreSchema,
  parseModelJson,
  type RetentionAnalysis,
  repurposingIdeasSchema,
  retentionAnalysisSchema,
  type ScenePlan,
  scenePlanSchema,
  smartSuggestionsSchema,
  stripCodeFences,
} from '../src/services/geminiSchemas';

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const validBrandKit: BrandKit = {
  name: 'Starlit Studies',
  tagline: 'Learn fast, remember forever',
  archetype: 'The Educator',
  personality: 'Warm, precise, encouraging',
  colors: { primary: '#4F46E5', secondary: '#F59E0B', accent: '#10B981', background: '#0F172A' },
  typography: { heading: 'Montserrat', body: 'Inter' },
  visual_style: 'Flat illustration with neon accents',
  thumbnail_style: 'Bold text left, face right',
  content_hooks: ['Stop scrolling if you forget names'],
  catchphrases: ['Lock it in'],
  avatar: {
    gender: 'female',
    clothing: 'casual hoodie',
    sound: 'calm alto',
    background: 'study desk',
  },
};

const validScenePlan: ScenePlan = {
  video_plan: {
    working_title: 'How to Remember Everything',
    aspect_ratio: '16:9',
    wpm_assumed: 150,
    target_length_seconds_estimate: 210,
    length_flag: 'ok',
    sections: [
      {
        section_id: 's1',
        section_type: 'hook',
        section_label: 'Hook',
        beats: [
          {
            beat_id: 'b1',
            narration: 'You forget names because of how you listen.',
            est_seconds: 6,
            visual: {
              type: 'stock_video',
              stock_query: 'person thinking',
              ai_image_prompt: 'a person pausing mid conversation',
            },
          },
        ],
      },
    ],
  },
};

const validRetentionAnalysis: RetentionAnalysis = {
  retention_analysis: {
    retention_score: 42,
    verdict: 'needs work',
    summary_critique: 'The hook buries the payoff.',
    dropoff_reasons: ['Slow first 3 seconds', 'No visual change'],
    first_5s_heatmap: [
      {
        second: 1,
        attention_level: 80,
        viewer_thought: 'What is this?',
        visual_pattern_disrupt: 'Open on a question',
      },
    ],
    optimized_hooks: [
      {
        angle_name: 'Direct challenge',
        hook_text: 'You are memorizing wrong.',
        visual_cue: 'Text on black',
        predicted_retention: 70,
        ctr_boost_estimate: '+15%',
      },
    ],
    mid_video_pacing_tips: ['Cut every 5 seconds'],
  },
};

describe('brandKitSchema', () => {
  it('accepts a complete brand kit payload', () => {
    const result = brandKitSchema.parse(validBrandKit);
    expect(result.name).toBe('Starlit Studies');
    expect(result.colors.primary).toBe('#4F46E5');
    expect(result.avatar.sound).toBe('calm alto');
  });

  it('rejects a missing required field (archetype)', () => {
    const { archetype, ...incomplete } = validBrandKit;
    expect(brandKitSchema.safeParse(incomplete).success).toBe(false);
  });

  it('rejects a wrong-typed field (content_hooks as string)', () => {
    expect(
      brandKitSchema.safeParse({ ...validBrandKit, content_hooks: 'not-an-array' }).success,
    ).toBe(false);
  });

  it('rejects a missing nested colors object', () => {
    const { colors, ...noColors } = validBrandKit;
    expect(brandKitSchema.safeParse(noColors).success).toBe(false);
  });
});

describe('contentIdeasSchema', () => {
  const valid = { ideas: [{ title: 'T', hook: 'H', description: 'D' }] };

  it('accepts a valid ideas list', () => {
    expect(contentIdeasSchema.parse(valid).ideas).toHaveLength(1);
  });

  it('rejects an idea missing its hook', () => {
    expect(
      contentIdeasSchema.safeParse({ ideas: [{ title: 'T', description: 'D' }] }).success,
    ).toBe(false);
  });

  it('rejects a payload without the ideas array', () => {
    expect(contentIdeasSchema.safeParse({}).success).toBe(false);
  });
});

describe('contentScoreSchema', () => {
  const valid = { score: 78, feedback: 'Strong hook.', suggestions: ['Tighten the intro'] };

  it('accepts a valid score payload', () => {
    expect(contentScoreSchema.parse(valid).score).toBe(78);
  });

  it('rejects a non-integer score', () => {
    expect(contentScoreSchema.safeParse({ ...valid, score: 78.5 }).success).toBe(false);
  });

  it('rejects a missing suggestions array', () => {
    const { suggestions, ...missing } = valid;
    expect(contentScoreSchema.safeParse(missing).success).toBe(false);
  });
});

describe('repurposingIdeasSchema', () => {
  const valid = {
    platforms: [
      {
        platform: 'TikTok',
        icon: '🎵',
        color: '#69C9D0',
        ideas: [
          {
            title: 'T',
            transformation: 'R',
            format_changes: '60s vertical',
            optimizations: 'hashtags',
            draft: 'Script...',
          },
        ],
      },
    ],
  };

  it('accepts a valid repurposing payload', () => {
    expect(repurposingIdeasSchema.parse(valid).platforms[0].platform).toBe('TikTok');
  });

  it('rejects an idea missing its draft', () => {
    const { draft, ...noDraft } = valid.platforms[0].ideas[0];
    expect(
      repurposingIdeasSchema.safeParse({ platforms: [{ ...valid.platforms[0], ideas: [noDraft] }] })
        .success,
    ).toBe(false);
  });

  it('rejects a missing platforms array', () => {
    expect(repurposingIdeasSchema.safeParse({}).success).toBe(false);
  });
});

describe('smartSuggestionsSchema', () => {
  const valid = {
    analysis: 'Creator posts consistently.',
    trendingTopics: [{ topic: 'T', angle: 'A', platform: 'youtube', justification: 'J' }],
    newAngles: [{ originalConcept: 'O', suggestedAngle: 'S', hook: 'H' }],
  };

  it('accepts a valid suggestions payload', () => {
    expect(smartSuggestionsSchema.parse(valid).trendingTopics).toHaveLength(1);
  });

  it('rejects a trending topic missing its justification', () => {
    const { justification, ...missing } = valid.trendingTopics[0];
    expect(smartSuggestionsSchema.safeParse({ ...valid, trendingTopics: [missing] }).success).toBe(
      false,
    );
  });

  it('rejects a missing newAngles array', () => {
    const { newAngles, ...missing } = valid;
    expect(smartSuggestionsSchema.safeParse(missing).success).toBe(false);
  });
});

describe('scenePlanSchema', () => {
  it('accepts a complete scene plan payload', () => {
    const result = scenePlanSchema.parse(validScenePlan);
    expect(result.video_plan.wpm_assumed).toBe(150);
    expect(result.video_plan.sections[0].beats[0].est_seconds).toBe(6);
  });

  it('allows optional beat fields (title_card_text, on_screen_text) to be absent', () => {
    const beat = validScenePlan.video_plan.sections[0].beats[0];
    expect(beat.visual.title_card_text).toBeUndefined();
    expect(beat.on_screen_text).toBeUndefined();
    expect(scenePlanSchema.safeParse(validScenePlan).success).toBe(true);
  });

  it('accepts optional beat fields when present', () => {
    const withOptional = structuredClone(validScenePlan);
    withOptional.video_plan.sections[0].beats[0].visual.title_card_text = 'Remember This';
    withOptional.video_plan.sections[0].beats[0].on_screen_text = 'Tip 1';
    expect(scenePlanSchema.parse(withOptional).video_plan.sections[0].beats[0].on_screen_text).toBe(
      'Tip 1',
    );
  });

  it('rejects a beat missing its visual fallbacks (ai_image_prompt)', () => {
    const broken = structuredClone(validScenePlan);
    const { ai_image_prompt, ...partialVisual } = broken.video_plan.sections[0].beats[0].visual;
    expect(partialVisual.stock_query).toBeDefined(); // only ai_image_prompt removed
    broken.video_plan.sections[0].beats[0].visual =
      partialVisual as ScenePlan['video_plan']['sections'][number]['beats'][number]['visual'];
    expect(scenePlanSchema.safeParse(broken).success).toBe(false);
  });

  it('rejects a non-integer est_seconds', () => {
    const fractional = structuredClone(validScenePlan);
    fractional.video_plan.sections[0].beats[0].est_seconds = 6.5;
    expect(scenePlanSchema.safeParse(fractional).success).toBe(false);
  });

  it('rejects a payload without video_plan', () => {
    expect(scenePlanSchema.safeParse({ plan: validScenePlan }).success).toBe(false);
  });
});

describe('retentionAnalysisSchema', () => {
  it('accepts a complete retention analysis payload', () => {
    const result = retentionAnalysisSchema.parse(validRetentionAnalysis);
    expect(result.retention_analysis.retention_score).toBe(42);
    expect(result.retention_analysis.first_5s_heatmap[0].second).toBe(1);
    expect(result.retention_analysis.optimized_hooks[0].predicted_retention).toBe(70);
  });

  it('rejects a heatmap entry missing viewer_thought', () => {
    const { viewer_thought, ...partial } =
      validRetentionAnalysis.retention_analysis.first_5s_heatmap[0];
    const broken = structuredClone(validRetentionAnalysis);
    broken.retention_analysis.first_5s_heatmap = [
      partial as RetentionAnalysis['retention_analysis']['first_5s_heatmap'][number],
    ];
    expect(retentionAnalysisSchema.safeParse(broken).success).toBe(false);
  });

  it('rejects a hook missing its ctr_boost_estimate', () => {
    const { ctr_boost_estimate, ...partial } =
      validRetentionAnalysis.retention_analysis.optimized_hooks[0];
    const broken = structuredClone(validRetentionAnalysis);
    broken.retention_analysis.optimized_hooks = [
      partial as RetentionAnalysis['retention_analysis']['optimized_hooks'][number],
    ];
    expect(retentionAnalysisSchema.safeParse(broken).success).toBe(false);
  });

  it('rejects a missing retention_analysis wrapper', () => {
    expect(
      retentionAnalysisSchema.safeParse(validRetentionAnalysis.retention_analysis).success,
    ).toBe(false);
  });
});

describe('stripCodeFences', () => {
  it('strips ```json fences and whitespace', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips bare ``` fences', () => {
    expect(stripCodeFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('leaves plain JSON untouched', () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}');
  });
});

describe('parseModelJson', () => {
  it('returns validated data for a fenced payload', () => {
    const raw = '```json\n' + JSON.stringify(validScenePlan) + '\n```';
    const parsed = parseModelJson(scenePlanSchema, raw, 'scene plan');
    expect(parsed.video_plan.working_title).toBe('How to Remember Everything');
  });

  it('throws the friendly-retry error on non-JSON prose and warns', () => {
    expect(() => parseModelJson(scenePlanSchema, 'Sorry, I cannot do that.', 'scene plan')).toThrow(
      MODEL_OUTPUT_ERROR,
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('scene plan');
  });

  it('throws the friendly-retry error on a contract violation and warns with issues', () => {
    const missingHeatmap = structuredClone(validRetentionAnalysis);
    delete (missingHeatmap.retention_analysis as Record<string, unknown>).first_5s_heatmap;
    expect(() =>
      parseModelJson(retentionAnalysisSchema, JSON.stringify(missingHeatmap), 'retention analysis'),
    ).toThrow(MODEL_OUTPUT_ERROR);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(Array.isArray(warnSpy.mock.calls[0][1])).toBe(true);
  });

  it('throws the friendly-retry error on empty input', () => {
    expect(() => parseModelJson(contentScoreSchema, '', 'content score')).toThrow(
      MODEL_OUTPUT_ERROR,
    );
    expect(warnSpy).toHaveBeenCalled();
  });
});

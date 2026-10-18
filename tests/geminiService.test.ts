// F4.4/F4.6 — Service-level tests for src/services/gemini.ts.
// apiFetch (re-exported from src/firebase) is mocked — the service functions
// are exercised end-to-end from fetch response to parsed, validated payload.
// No real Gemini, no network.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MODEL_OUTPUT_ERROR } from '../src/services/geminiSchemas';
import {
  analyzeAndOptimizeRetention,
  generateBrandKit,
  generateContentIdeas,
  generateScenePlan,
  generateSmartSuggestions,
  repurposeContent,
  scoreContent,
} from '../src/services/gemini';

const fb = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock('../src/firebase', () => fb);

let warnSpy: ReturnType<typeof vi.spyOn>;

const validBrandKit = {
  name: 'Trailhead Talks',
  tagline: 'Hike further, tell it better',
  archetype: 'The Guide',
  personality: 'Grounded and curious',
  colors: { primary: '#0EA5E9', secondary: '#F97316', accent: '#22C55E', background: '#F8FAFC' },
  typography: { heading: 'Sora', body: 'Source Sans 3' },
  visual_style: 'Documentary photography, warm tones',
  thumbnail_style: 'Face left, 3-word caption right',
  content_hooks: ['The trail teaches more than the summit'],
  catchphrases: ['Pack your curiosity'],
  avatar: {
    gender: 'non-binary',
    clothing: 'field jacket',
    sound: 'warm mid-range',
    background: 'mountain overlook',
  },
};

const validScenePlan = {
  video_plan: {
    working_title: 'Pack Light, Film Heavy',
    aspect_ratio: '9:16',
    wpm_assumed: 150,
    target_length_seconds_estimate: 240,
    length_flag: 'ok',
    sections: [
      {
        section_id: 'sec-1',
        section_type: 'hook',
        section_label: 'Hook',
        beats: [
          {
            beat_id: 'beat-1',
            narration: 'This pack setup changed how I film outdoors.',
            est_seconds: 7,
            visual: {
              type: 'stock_video',
              stock_query: 'hiker backpack mountain',
              ai_image_prompt: 'hiker with camera backpack at sunrise',
            },
          },
        ],
      },
    ],
  },
};

const validRetention = {
  retention_analysis: {
    retention_score: 64,
    verdict: 'solid hook, weak pivot',
    summary_critique: 'Strong opening question, slow transition.',
    dropoff_reasons: ['Transition drags at 4s'],
    first_5s_heatmap: [
      {
        second: 1,
        attention_level: 75,
        viewer_thought: 'Interesting question',
        visual_pattern_disrupt: 'Cold open on the question',
      },
    ],
    optimized_hooks: [
      {
        angle_name: 'Contrarian',
        hook_text: 'Everything you know about packing is wrong.',
        visual_cue: 'Dump pack on table',
        predicted_retention: 81,
        ctr_boost_estimate: '+20%',
      },
    ],
    mid_video_pacing_tips: ['B-roll cut every 4 seconds'],
  },
};

/** apiFetch resolves a Response whose JSON body is `{ text: <model output> }`. */
function mockModelText(text: string, ok = true) {
  fb.apiFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ text }), { status: ok ? 200 : 500 }),
  );
}

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  fb.apiFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateBrandKit', () => {
  it('posts to /api/gemini/generate and returns the validated brand kit', async () => {
    mockModelText(JSON.stringify(validBrandKit));

    const kit = await generateBrandKit('a hiking channel for beginner photographers');

    expect(kit.name).toBe('Trailhead Talks');
    expect(kit.colors.background).toBe('#F8FAFC');
    expect(fb.apiFetch).toHaveBeenCalledTimes(1);
    expect(fb.apiFetch.mock.calls[0][0]).toBe('/api/gemini/generate');
  });

  it('throws the friendly-retry error when the payload breaks the contract', async () => {
    const { colors, ...missingColors } = validBrandKit;
    mockModelText(JSON.stringify(missingColors));

    await expect(generateBrandKit('x')).rejects.toThrow(MODEL_OUTPUT_ERROR);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('generateContentIdeas', () => {
  it('returns the ideas array from the validated payload', async () => {
    mockModelText(JSON.stringify({ ideas: [{ title: 'T', hook: 'H', description: 'D' }] }));

    const ideas = await generateContentIdeas(validBrandKit);

    expect(ideas).toHaveLength(1);
    expect(ideas[0].title).toBe('T');
  });
});

describe('scoreContent', () => {
  it('returns the validated score payload', async () => {
    mockModelText(JSON.stringify({ score: 82, feedback: 'Good', suggestions: ['s1'] }));

    const result = await scoreContent('some content', 'a friendly voice');

    expect(result.score).toBe(82);
  });

  it('rejects a fractional score from the model', async () => {
    mockModelText(JSON.stringify({ score: 82.5, feedback: 'Good', suggestions: ['s1'] }));

    await expect(scoreContent('some content', 'voice')).rejects.toThrow(MODEL_OUTPUT_ERROR);
  });
});

describe('repurposeContent', () => {
  it('returns the validated repurposing payload', async () => {
    mockModelText(
      JSON.stringify({
        platforms: [
          {
            platform: 'TikTok',
            icon: 'x',
            color: '#000000',
            ideas: [
              {
                title: 'T',
                transformation: 'R',
                format_changes: 'F',
                optimizations: 'O',
                draft: 'D',
              },
            ],
          },
        ],
      }),
    );

    const result = await repurposeContent('some content');

    expect(result.platforms[0].platform).toBe('TikTok');
  });
});

describe('generateSmartSuggestions', () => {
  it('returns the validated suggestions payload', async () => {
    mockModelText(
      JSON.stringify({
        analysis: 'Consistent posting.',
        trendingTopics: [{ topic: 'T', angle: 'A', platform: 'youtube', justification: 'J' }],
        newAngles: [{ originalConcept: 'O', suggestedAngle: 'S', hook: 'H' }],
      }),
    );

    const result = await generateSmartSuggestions(validBrandKit, []);

    expect(result.trendingTopics[0].topic).toBe('T');
  });

  it('keeps the existing error when the model returns no text', async () => {
    mockModelText('');

    await expect(generateSmartSuggestions(validBrandKit, [])).rejects.toThrow(
      'No suggestions generated by the model. Please retry.',
    );
  });
});

describe('generateScenePlan', () => {
  it('parses a code-fenced scene plan payload', async () => {
    mockModelText('```json\n' + JSON.stringify(validScenePlan) + '\n```');

    const plan = await generateScenePlan('script text', 'Pack Light, Film Heavy');

    expect(plan.video_plan.working_title).toBe('Pack Light, Film Heavy');
    expect(plan.video_plan.sections[0].beats[0].est_seconds).toBe(7);
  });

  it('throws the friendly-retry error on contract violation', async () => {
    const broken = structuredClone(validScenePlan);
    delete (broken.video_plan as Record<string, unknown>).sections;
    mockModelText(JSON.stringify(broken));

    await expect(generateScenePlan('script text')).rejects.toThrow(MODEL_OUTPUT_ERROR);
  });
});

describe('analyzeAndOptimizeRetention', () => {
  it('parses a fenced retention analysis payload', async () => {
    mockModelText('```json\n' + JSON.stringify(validRetention) + '\n```');

    const result = await analyzeAndOptimizeRetention('hook text');

    expect(result.retention_analysis.retention_score).toBe(64);
    expect(result.retention_analysis.first_5s_heatmap[0].viewer_thought).toBe(
      'Interesting question',
    );
  });

  it('propagates the friendly error for malformed model JSON', async () => {
    mockModelText('not json at all');

    await expect(analyzeAndOptimizeRetention('hook text')).rejects.toThrow(MODEL_OUTPUT_ERROR);
  });
});

describe('upstream error handling (unchanged)', () => {
  it('surfaces the server error message on a non-OK response', async () => {
    fb.apiFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Daily AI quota exhausted' }), { status: 429 }),
    );

    await expect(scoreContent('c', 'v')).rejects.toThrow('Daily AI quota exhausted');
  });
});

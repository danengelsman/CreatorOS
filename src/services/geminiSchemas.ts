// F4.6 — Zod contracts for every Gemini JSON payload the client parses.
//
// src/services/gemini.ts used to `JSON.parse(data.text)` and trust the model's
// output shape blindly. Each responseSchema below mirrors the matching
// `responseSchema` sent to the Gemini API, so a payload that drifts from the
// contract (missing required field, wrong type, prose wrapped around the JSON)
// is caught at the boundary instead of surfacing as `undefined` deep in a
// component render.
//
// On an invalid payload the caller logs a console.warn (with the field-level
// issues, so failures are diagnosable in devtools) and throws the same
// friendly-retry style Error the rest of the services layer uses.

import { z } from 'zod';

// generateBrandKit — full brand identity kit.
export const brandKitSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  archetype: z.string(),
  personality: z.string(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
  }),
  typography: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  visual_style: z.string(),
  thumbnail_style: z.string(),
  content_hooks: z.array(z.string()),
  catchphrases: z.array(z.string()),
  avatar: z.object({
    gender: z.string(),
    clothing: z.string(),
    sound: z.string(),
    background: z.string(),
  }),
});
export type BrandKit = z.infer<typeof brandKitSchema>;

// generateContentIdeas — list of content ideas (top-level `ideas` array).
export const contentIdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string(),
      hook: z.string(),
      description: z.string(),
    }),
  ),
});
export type ContentIdeas = z.infer<typeof contentIdeasSchema>;

// scoreContent — 0-100 content score with feedback and suggestions.
export const contentScoreSchema = z.object({
  score: z.number().int(),
  feedback: z.string(),
  suggestions: z.array(z.string()),
});
export type ContentScore = z.infer<typeof contentScoreSchema>;

// repurposeContent — per-platform repurposing ideas.
export const repurposingIdeasSchema = z.object({
  platforms: z.array(
    z.object({
      platform: z.string(),
      icon: z.string(),
      color: z.string(),
      ideas: z.array(
        z.object({
          title: z.string(),
          transformation: z.string(),
          format_changes: z.string(),
          optimizations: z.string(),
          draft: z.string(),
        }),
      ),
    }),
  ),
});
export type RepurposingIdeas = z.infer<typeof repurposingIdeasSchema>;

// generateSmartSuggestions — strategy consultant analysis + topics + angles.
export const smartSuggestionsSchema = z.object({
  analysis: z.string(),
  trendingTopics: z.array(
    z.object({
      topic: z.string(),
      angle: z.string(),
      platform: z.string(),
      justification: z.string(),
    }),
  ),
  newAngles: z.array(
    z.object({
      originalConcept: z.string(),
      suggestedAngle: z.string(),
      hook: z.string(),
    }),
  ),
});
export type SmartSuggestions = z.infer<typeof smartSuggestionsSchema>;

// generateScenePlan — timed visual beats for the Scene Planner renderer.
export const scenePlanSchema = z.object({
  video_plan: z.object({
    working_title: z.string(),
    aspect_ratio: z.string(),
    wpm_assumed: z.number().int(),
    target_length_seconds_estimate: z.number().int(),
    length_flag: z.string(),
    sections: z.array(
      z.object({
        section_id: z.string(),
        section_type: z.string(),
        section_label: z.string(),
        beats: z.array(
          z.object({
            beat_id: z.string(),
            narration: z.string(),
            est_seconds: z.number().int(),
            visual: z.object({
              type: z.string(),
              stock_query: z.string(),
              ai_image_prompt: z.string(),
              title_card_text: z.string().optional(),
            }),
            on_screen_text: z.string().optional(),
          }),
        ),
      }),
    ),
  }),
});
export type ScenePlan = z.infer<typeof scenePlanSchema>;

// analyzeAndOptimizeRetention — retention diagnosis, first-5s heatmap, hooks.
export const retentionAnalysisSchema = z.object({
  retention_analysis: z.object({
    retention_score: z.number().int(),
    verdict: z.string(),
    summary_critique: z.string(),
    dropoff_reasons: z.array(z.string()),
    first_5s_heatmap: z.array(
      z.object({
        second: z.number().int(),
        attention_level: z.number().int(),
        viewer_thought: z.string(),
        visual_pattern_disrupt: z.string(),
      }),
    ),
    optimized_hooks: z.array(
      z.object({
        angle_name: z.string(),
        hook_text: z.string(),
        visual_cue: z.string(),
        predicted_retention: z.number().int(),
        ctr_boost_estimate: z.string(),
      }),
    ),
    mid_video_pacing_tips: z.array(z.string()),
  }),
});
export type RetentionAnalysis = z.infer<typeof retentionAnalysisSchema>;

/** Friendly-retry error thrown when model output violates its contract. */
export const MODEL_OUTPUT_ERROR = 'The AI returned a malformed response. Please try again.';

/** Strip markdown code fences some Gemini responses wrap the JSON in. */
export function stripCodeFences(rawText: string): string {
  return rawText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

/**
 * Parse + validate a raw model text payload against its contract.
 * Invalid JSON or a schema violation logs a console.warn with the details and
 * throws the friendly-retry MODEL_OUTPUT_ERROR (matches the services-layer
 * error-handling style — callers already render Error.message to the user).
 */
export function parseModelJson<T>(schema: z.ZodType<T>, rawText: string, label: string): T {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripCodeFences(rawText || ''));
  } catch (e) {
    console.warn(`[gemini] ${label}: model output was not valid JSON`, e);
    throw new Error(MODEL_OUTPUT_ERROR);
  }
  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    console.warn(`[gemini] ${label}: model output failed contract validation`, result.error.issues);
    throw new Error(MODEL_OUTPUT_ERROR);
  }
  return result.data;
}

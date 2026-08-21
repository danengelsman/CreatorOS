import { apiFetch } from "../firebase";
export const generateBrandKit = async (userInput: string) => {
  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: `Generate a complete brand kit for a creator based on this description: ${userInput}.
      Select a specific creator archetype (e.g., 'The Educator', 'The Entertainer', 'The Analyst', 'The Storyteller', 'The Guide', 'The Visionary').
      Provide granular options for visual styles, cohesive color palettes (with hex codes), and specific Google Fonts for typography. Ensure these elements are cohesive and generate a distinct brand identity. Also include default settings for an AI Avatar including gender, clothing style, sound/voice description, and default background.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            tagline: { type: "STRING" },
            archetype: { type: "STRING" },
            personality: { type: "STRING" },
            colors: {
              type: "OBJECT",
              properties: {
                primary: { type: "STRING" },
                secondary: { type: "STRING" },
                accent: { type: "STRING" },
                background: { type: "STRING" }
              }
            },
            typography: {
              type: "OBJECT",
              properties: {
                heading: { type: "STRING" },
                body: { type: "STRING" }
              }
            },
            visual_style: { type: "STRING" },
            thumbnail_style: { type: "STRING" },
            content_hooks: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            catchphrases: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            avatar: {
              type: "OBJECT",
              properties: {
                gender: { type: "STRING" },
                clothing: { type: "STRING" },
                sound: { type: "STRING" },
                background: { type: "STRING" }
              }
            }
          },
          required: ["name", "tagline", "archetype", "personality", "colors", "typography", "visual_style", "thumbnail_style", "content_hooks", "catchphrases", "avatar"]
        }
      }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      throw new Error(errJson.error || 'API Error');
    } catch (e) {
      throw new Error(errText);
    }
  }
  const data = await response.json();
  return JSON.parse(data.text);
};

export const generateContentIdeas = async (brandData: any) => {
  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: `Generate 5-10 content ideas for a creator based on this brand identity:
      Name: ${brandData.name}
      Tagline: ${brandData.tagline}
      Archetype: ${brandData.archetype}
      Visual Style: ${brandData.visual_style}
      
      Each idea should include a hook and a brief description.`,
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
                  title: { type: "STRING", description: "Short, catchy title for the idea" },
                  hook: { type: "STRING" },
                  description: { type: "STRING" }
                },
                required: ["title", "hook", "description"]
              }
            }
          },
          required: ["ideas"]
        }
      }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      throw new Error(errJson.error || 'API Error');
    } catch (e) {
      throw new Error(errText);
    }
  }
  const data = await response.json();
  return JSON.parse(data.text).ideas;
};

export const scoreContent = async (content: string, brandVoice: string) => {
  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: `Score this content (0-100) based on hook strength, clarity, engagement potential, and storytelling. 
      Brand Voice: ${brandVoice}
      Content: ${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "INTEGER" },
            feedback: { type: "STRING" },
            suggestions: {
              type: "ARRAY",
              items: { type: "STRING" }
            }
          },
          required: ["score", "feedback", "suggestions"]
        }
      }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      throw new Error(errJson.error || 'API Error');
    } catch (e) {
      throw new Error(errText);
    }
  }
  const data = await response.json();
  return JSON.parse(data.text);
};

export const remixContent = async (content: string, instruction: string) => {
  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: `Remix and refine the following content according to these instructions: "${instruction}".
      Maintain the original core message but adapt it as requested. Return only the revised content.
      
      Content: ${content}`
    })
  });
  if (!response.ok) {
    throw new Error('Failed to remix content');
  }
  const data = await response.json();
  return data.text;
};

export const optimizeSearchTerms = async (content: string, tone: string, audience: string, goal: string) => {
  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: `Generate optimized SEO keywords and hashtags for the following content.
      Tone: ${tone}
      Audience: ${audience}
      Goal: ${goal}
      
      Return a comma-separated list of 5-7 highly relevant keywords and 3-5 hashtags (including the # symbol). Just the terms, no other text.
      
      Content: ${content}`
    })
  });
  if (!response.ok) {
    throw new Error('Failed to optimize search terms');
  }
  const data = await response.json();
  return data.text;
};

export const quickPolish = async (content: string) => {
  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: `Briefly polish this content for better flow and impact. Keep it concise.
      Content: ${content}`
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      throw new Error(errJson.error || 'API Error');
    } catch (e) {
      throw new Error(errText);
    }
  }
  const data = await response.json();
  return data.text;
};

export const repurposeContent = async (content: string) => {
  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: `Analyze this published content and automatically suggest multiple ways to repurpose it for other platforms (e.g., TikTok, Twitter, LinkedIn).
      Provide specific, actionable ideas for transforming the content.
      Include suggested edits, format changes, platform-specific optimizations, and a draft for each idea.
      Content: ${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            platforms: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  platform: { type: "STRING", description: "Platform name (e.g. TikTok, Twitter, LinkedIn)" },
                  icon: { type: "STRING", description: "A relevant single emoji for the platform" },
                  color: { type: "STRING", description: "A hex color code associated with the platform brand" },
                  ideas: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        title: { type: "STRING", description: "Catchy title for this repurposing idea" },
                        transformation: { type: "STRING", description: "Specific actionable ideas for transforming the content (e.g., 'Extract the top 3 tips, cut the intro, reframe as a bold claim')" },
                        format_changes: { type: "STRING", description: "Suggested format changes (e.g., 'Turn into a 60s fast-paced vertical video' or 'Carousel post with 5 slides')" },
                        optimizations: { type: "STRING", description: "Platform-specific optimizations (e.g., specific hashtags, pacing, visual hooks, best times to post)" },
                        draft: { type: "STRING", description: "The actual script, post text, or thread content draft" }
                      },
                      required: ["title", "transformation", "format_changes", "optimizations", "draft"]
                    }
                  }
                },
                required: ["platform", "icon", "color", "ideas"]
              }
            }
          },
          required: ["platforms"]
        }
      }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      throw new Error(errJson.error || 'API Error');
    } catch (e) {
      throw new Error(errText);
    }
  }
  const data = await response.json();
  return JSON.parse(data.text);
};

export const generateSpeech = async (text: string, voice: string = 'Kore') => {
  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: `Say naturally: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      throw new Error(errJson.error || 'API Error');
    } catch (e) {
      throw new Error(errText);
    }
  }
  const data = await response.json();
  const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
};

export const transcribeAudio = async (base64Audio: string, mimeType: string = "audio/wav") => {
  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          { text: "Transcribe this audio exactly." },
        ],
      }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      throw new Error(errJson.error || 'API Error');
    } catch (e) {
      throw new Error(errText);
    }
  }
  const data = await response.json();
  return data.text;
};

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16' = '16:9', videoLength: string = 'Short (5s)') => {
  let durationSeconds = 5;
  if (videoLength.includes('10s')) durationSeconds = 10;
  if (videoLength.includes('5s')) durationSeconds = 5;

  const response = await apiFetch('/api/gemini/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio, durationSeconds })
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json(); // { operationName: string }
};

export const getOperationStatus = async (operation: any) => {
  const response = await apiFetch('/api/gemini/video-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName: operation.operationName || operation.name })
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
};

export const fetchVideoDownloadResponse = async (uri: string) => {
  const response = await apiFetch('/api/gemini/video-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uri })
  });
  if (!response.ok) throw new Error('Video download failed');
  return response.blob();
};

export const generateSmartSuggestions = async (brandData: any, existingContent: any[]) => {
  const contentSummary = existingContent && existingContent.length > 0 
    ? existingContent.map(c => `Title: ${c.title || c.data?.title || 'Untitled'} | Platform: ${c.platform || c.data?.platform || 'N/A'} | Score: ${c.score || c.data?.score || 0}`).join('\n')
    : "No previous content created yet.";

  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: `You are an expert Content Strategy Consultant. Analyze the creator's niche based on their Brand Identity and their existing content history. Then suggest trending topics and new unique angles.

      CREATOR BRAND IDENTITY:
      Name: ${brandData.name}
      Tagline: ${brandData.tagline}
      Archetype: ${brandData.archetype}
      Personality: ${brandData.personality}
      Visual Style: ${brandData.visual_style}

      CREATOR CONTENT HISTORY & PERFORMANCE SCORING:
      ${contentSummary}

      Tasks:
      1. Provide a brief analysis (1-2 sentences) of the creator's current content footprint and style strengths.
      2. Suggest 3 trending topic ideas that perfectly align with their brand.
      3. Suggest 3 new angles or counter-intuitive hooks for existing concepts.

      Provide the response in the specified JSON schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            analysis: { type: "STRING" },
            trendingTopics: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  topic: { type: "STRING" },
                  angle: { type: "STRING" },
                  platform: { type: "STRING" },
                  justification: { type: "STRING" }
                },
                required: ["topic", "angle", "platform", "justification"]
              }
            },
            newAngles: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  originalConcept: { type: "STRING" },
                  suggestedAngle: { type: "STRING" },
                  hook: { type: "STRING" }
                },
                required: ["originalConcept", "suggestedAngle", "hook"]
              }
            }
          },
          required: ["analysis", "trendingTopics", "newAngles"]
        }
      }
    })
  });

  const data = await response.json();
  return JSON.parse(data.text);
};

export const generateScenePlan = async (scriptText: string, title?: string, brand?: any) => {
  const brandContext = brand ? `\nCREATOR BRAND CONTEXT:\n- Name: ${brand.name}\n- Archetype: ${brand.archetype}\n- Visual Style: ${brand.visual_style || 'N/A'}\n- Primary Color: ${brand.colors?.primary || 'N/A'}\nKeep these visual aesthetics in mind, particularly for title cards and image prompts.` : '';

  const systemPrompt = `You are the Scene Planner for Vertano, an app that helps beginner YouTube creators turn a finished script into a produced video. Your job is to segment the creator’s script into timed visual beats and assign each beat a visual. You are an editor planning shots — you are NOT a writer.${brandContext}

Hard rules:
1. Preserve the creator’s words. Split the script into beats using the sentences exactly as written. You may fix an obvious typo, but never rephrase, shorten, reorder, or add sentences.
2. One beat = 1–2 sentences, roughly 5–8 seconds spoken aloud. Assume 150 words per minute, so about 13–20 words per beat. A single long sentence may be its own beat; never exceed ~25 words in one beat.
3. Group beats into sections in this order: hook, intro, 2–5 point sections, outro. Infer the boundaries from the script’s content. Every beat belongs to exactly one section.
4. Estimate honestly. Sum the beat durations into target_length_seconds_estimate. The target range is 180–300 seconds. If the script runs long or short, do NOT cut or pad it — report the real estimate and set length_flag to "under", "ok", or "over".
5. Every beat gets both fallbacks. stock_query AND ai_image_prompt must be filled in on every beat, whatever the visual type, so the renderer always has a plan B.
6. Output raw JSON only according to the specified schema.

Visual selection rules:
• stock_video is the default: scenery, activities, objects, people doing everyday things.
• title_card for statistics, list items, key phrases, or the title moment. Put the exact display text in title_card_text (max 8 words).
• ai_image only when the concept is too specific or abstract for stock footage to exist (e.g. "a robot reading a bedtime story").
• Stock queries are 2–4 concrete, generic words a stock site understands: "person typing laptop", "sunrise city skyline", "coffee pour close up". Never use brand names, celebrity names, logos, or copyrighted characters in queries or image prompts.
• Vary the visuals: no two consecutive beats may share the same stock_query, and never more than 2 title_card beats in a row.
• on_screen_text is optional emphasis, max 6 words, used sparingly (at most 1 in every 4 beats).`;

  const userContent = `Working Title: ${title || 'Untitled YouTube Video'}

Script to Plan into Visual Beats:
${scriptText}`;

  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\n${userContent}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            video_plan: {
              type: "OBJECT",
              properties: {
                working_title: { type: "STRING" },
                aspect_ratio: { type: "STRING" },
                wpm_assumed: { type: "INTEGER" },
                target_length_seconds_estimate: { type: "INTEGER" },
                length_flag: { type: "STRING" },
                sections: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      section_id: { type: "STRING" },
                      section_type: { type: "STRING" },
                      section_label: { type: "STRING" },
                      beats: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            beat_id: { type: "STRING" },
                            narration: { type: "STRING" },
                            est_seconds: { type: "INTEGER" },
                            visual: {
                              type: "OBJECT",
                              properties: {
                                type: { type: "STRING" },
                                stock_query: { type: "STRING" },
                                ai_image_prompt: { type: "STRING" },
                                title_card_text: { type: "STRING" }
                              },
                              required: ["type", "stock_query", "ai_image_prompt"]
                            },
                            on_screen_text: { type: "STRING" }
                          },
                          required: ["beat_id", "narration", "est_seconds", "visual"]
                        }
                      }
                    },
                    required: ["section_id", "section_type", "section_label", "beats"]
                  }
                }
              },
              required: ["working_title", "aspect_ratio", "wpm_assumed", "target_length_seconds_estimate", "length_flag", "sections"]
            }
          },
          required: ["video_plan"]
        }
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      throw new Error(errJson.error || 'Scene Planner API Error');
    } catch (e) {
      throw new Error(errText);
    }
  }

  const data = await response.json();
  let rawText = data.text || '';
  rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(rawText);
};

export const analyzeAndOptimizeRetention = async (scriptOrHookText: string, platform: string = 'youtube', brand?: any) => {
  const brandContext = brand ? `\nCREATOR BRAND CONTEXT:\n- Archetype: ${brand.archetype}\n- Personality: ${brand.personality}\n- Preferred Hooks: ${Array.isArray(brand.content_hooks) ? brand.content_hooks.join(', ') : 'N/A'}\nEnsure your hook rewrites and diagnosis align with this brand voice, feeling authentic to their creator archetype.` : '';

  const systemPrompt = `You are Vertano's Chief Viral Retention & Algorithmic Hook Strategist. Your objective is to help YouTube and TikTok creators prevent viewer drop-off in the crucial first 5 seconds of their video.${brandContext}

You analyze the provided hook/intro text and deliver an authoritative retention diagnosis along with 5 high-converting viral hook rewrites and second-by-second pattern-disrupt instructions.

Output strict raw JSON only matching the schema provided.`;

  const userContent = `Platform: ${platform}
Draft Hook / Intro Script to Analyze:
"${scriptOrHookText}"`;

  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\n${userContent}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            retention_analysis: {
              type: "OBJECT",
              properties: {
                retention_score: { type: "INTEGER" },
                verdict: { type: "STRING" },
                summary_critique: { type: "STRING" },
                dropoff_reasons: {
                  type: "ARRAY",
                  items: { type: "STRING" }
                },
                first_5s_heatmap: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      second: { type: "INTEGER" },
                      attention_level: { type: "INTEGER" },
                      viewer_thought: { type: "STRING" },
                      visual_pattern_disrupt: { type: "STRING" }
                    },
                    required: ["second", "attention_level", "viewer_thought", "visual_pattern_disrupt"]
                  }
                },
                optimized_hooks: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      angle_name: { type: "STRING" },
                      hook_text: { type: "STRING" },
                      visual_cue: { type: "STRING" },
                      predicted_retention: { type: "INTEGER" },
                      ctr_boost_estimate: { type: "STRING" }
                    },
                    required: ["angle_name", "hook_text", "visual_cue", "predicted_retention", "ctr_boost_estimate"]
                  }
                },
                mid_video_pacing_tips: {
                  type: "ARRAY",
                  items: { type: "STRING" }
                }
              },
              required: ["retention_score", "verdict", "summary_critique", "dropoff_reasons", "first_5s_heatmap", "optimized_hooks", "mid_video_pacing_tips"]
            }
          },
          required: ["retention_analysis"]
        }
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      throw new Error(errJson.error || 'Retention Optimizer Error');
    } catch (e) {
      throw new Error(errText);
    }
  }

  const data = await response.json();
  let rawText = data.text || '';
  rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(rawText);
};


export const generateBrandLogo = async (prompt: string, aspectRatio: string = "1:1") => {
  const response = await apiFetch('/api/gemini/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspectRatio
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      throw new Error(errJson.error || 'Failed to generate image');
    } catch (e) {
      throw new Error(errText);
    }
  }

  const data = await response.json();
  return data.imageUrl;
};

export const analyzeVideo = async (file: File, analysisType: 'summary' | 'flashcards' | 'marketing') => {
  let prompt = '';
  if (analysisType === 'summary') {
    prompt = 'Analyze this video and provide an Executive Summary, including the main topic, key takeaways, and a chapter/timestamp breakdown if applicable. Format beautifully in Markdown.';
  } else if (analysisType === 'flashcards') {
    prompt = 'Analyze this video and generate 10 study flashcards based on the key concepts presented. Format as Q&A in Markdown.';
  } else if (analysisType === 'marketing') {
    prompt = 'Analyze this video and generate short-form marketing highlights. Provide 5 hook angles, 3 viral quotes extracted from the video, and a suggested caption for TikTok/Reels. Format in Markdown.';
  }

  const formData = new FormData();
  formData.append('video', file);
  formData.append('prompt', prompt);

  const response = await apiFetch('/api/gemini/analyze-video', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to analyze video');
  }

  const data = await response.json();
  return data.text;
};

export const generateStyleGuideSummary = async (brandData: any) => {
  const prompt = `You are an expert Brand Architect. Based on the following brand kit data, write a beautifully formatted, concise PDF-style Brand Guidelines document in Markdown.

Brand Name: ${brandData.name}
Tagline: ${brandData.tagline}
Archetype: ${brandData.archetype}
Personality: ${brandData.personality}
Visual Style: ${brandData.visual_style}
Colors: Primary (${brandData.colors?.primary}), Secondary (${brandData.colors?.secondary}), Accent (${brandData.colors?.accent}), Background (${brandData.colors?.background})
Typography: Heading (${brandData.typography?.heading}), Body (${brandData.typography?.body})

Structure it professionally with these sections:
1. Brand Core (Mission & Personality)
2. Visual Identity (Colors & Typography instructions)
3. Voice & Tone (How to speak to the audience)
4. Usage Guidelines (Best practices)

Keep it highly scannable, elegant, and ready to be used as a source of truth by designers and writers.`;

  const response = await apiFetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      contents: prompt,
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate style guide summary');
  }

  const data = await response.json();
  return data.text;
};

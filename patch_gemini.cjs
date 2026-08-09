const fs = require('fs');
let content = fs.readFileSync('src/services/gemini.ts', 'utf8');

const oldSchema = `            catchphrases: {
              type: "ARRAY",
              items: { type: "STRING" }
            }`;

const newSchema = `            catchphrases: {
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
            }`;

content = content.replace(oldSchema, newSchema);

content = content.replace(
  'required: ["name", "tagline", "archetype", "personality", "colors", "typography", "visual_style", "thumbnail_style", "content_hooks", "catchphrases"]',
  'required: ["name", "tagline", "archetype", "personality", "colors", "typography", "visual_style", "thumbnail_style", "content_hooks", "catchphrases", "avatar"]'
);

const oldContents = `Generate a complete brand kit for a creator based on this description: \${userInput}.
      Select a specific creator archetype (e.g., 'The Educator', 'The Entertainer', 'The Analyst', 'The Storyteller', 'The Guide', 'The Visionary').
      Provide granular options for visual styles, cohesive color palettes (with hex codes), and specific Google Fonts for typography. Ensure these elements are cohesive and generate a distinct brand identity.\`,`;

const newContents = `Generate a complete brand kit for a creator based on this description: \${userInput}.
      Select a specific creator archetype (e.g., 'The Educator', 'The Entertainer', 'The Analyst', 'The Storyteller', 'The Guide', 'The Visionary').
      Provide granular options for visual styles, cohesive color palettes (with hex codes), and specific Google Fonts for typography. Ensure these elements are cohesive and generate a distinct brand identity. Also include default settings for an AI Avatar including gender, clothing style, sound/voice description, and default background.\`,`;

content = content.replace(oldContents, newContents);

fs.writeFileSync('src/services/gemini.ts', content);

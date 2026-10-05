import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "hello",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            test: { type: "STRING" }
          },
          required: ["test"]
        }
      }
    });
    console.log(res.text);
  } catch(e) {
    console.error("FAIL", e);
  }
}
run();

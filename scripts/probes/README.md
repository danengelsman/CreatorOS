# scripts/probes — WARNING: these hit LIVE services

These are manual diagnostic probes, not tests. They authenticate against
**production Firebase** and some (`test-firestore*.mjs`) **write to production
Firestore**. `test-gemini.js` and `test-generate-video.mjs` spend real
**Gemini API quota**.

Run them only when debugging, and never from CI:

    npx tsx <probe>.mjs

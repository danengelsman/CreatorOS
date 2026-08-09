const res = await fetch('http://localhost:3000/api/gemini/generate-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Test video', durationSeconds: 5 })
});
console.log('Generate:', await res.text());

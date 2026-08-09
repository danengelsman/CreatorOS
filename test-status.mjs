const op = "v1_ChdvZFZrYXRhOUlzMlZtdGtQNEphSXFRZxIXb2RWa2F0YTlJczJWbXRrUDRKYUlxUWc";
const res = await fetch('http://localhost:3000/api/gemini/video-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ operationName: op })
});
console.log('Status:', await res.text());

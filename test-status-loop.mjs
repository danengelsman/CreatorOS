const op = "v1_ChdvZFZrYXRhOUlzMlZtdGtQNEphSXFRZxIXb2RWa2F0YTlJczJWbXRrUDRKYUlxUWc";
const check = async () => {
  let done = false;
  while (!done) {
    const res = await fetch('http://localhost:3000/api/gemini/video-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationName: op })
    });
    const json = await res.json();
    console.log('Done:', json.done, 'Data length:', json.data?.length);
    if (json.done) {
        console.log('Sample:', json.data?.substring(0, 50));
        break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}
check();

const url = 'http://localhost:5678/webhook/researchlens-5-section-analysis-modular';
const body = {
  papers: [
    { title: 'Test Paper', abstract: 'A short abstract used to test the workflow.' }
  ],
  question: 'Summarize key findings and methods.'
};

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeout: 60000,
    });
    const text = await res.text();
    console.log('HTTP', res.status, res.statusText);
    try { console.log(JSON.stringify(JSON.parse(text), null, 2)); } catch (e) { console.log(text); }
  } catch (err) {
    console.error('Request failed:', err.message || err);
  }
})();

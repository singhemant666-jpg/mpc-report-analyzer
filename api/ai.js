export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY environment variable is missing' });
  }

  const requestedModel = req.body.model || 'openai/gpt-oss-120b';
  const modelsToTry = [requestedModel, 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
  const uniqueModels = [...new Set(modelsToTry)];

  let lastError = null;

  for (const model of uniqueModels) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      if (!data.error && data.choices && data.choices[0] && data.choices[0].message) {
        return res.status(200).json({ result: data.choices[0].message.content, modelUsed: model });
      }
      lastError = data.error ? (data.error.message || JSON.stringify(data.error)) : 'Model response error';
    } catch (err) {
      lastError = err.message || 'Network error';
    }
  }

  return res.status(500).json({ error: lastError || 'All Groq AI models failed' });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const scriptUrl = req.query.url || 'https://script.google.com/macros/s/AKfycbwtfs_RmTe1eoEiy5rZFmytIT0oS0qpIvXs3ucR2FJhEWhJVEwwjjQer-VZ_jZi17OI/exec';

  try {
    const response = await fetch(scriptUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { startDate, endDate, branchId, doctorId } = req.query;

  // MPC API Authentication
  const credentials = {
    email: process.env.MPC_EMAIL || 'analytics@mypainclinicglobal.com',
    pass: process.env.MPC_PASSWORD || 'mpc@mpc12345'
  };

  async function getFreshToken() {
    try {
      const loginRes = await fetch('https://api.mypainclinicglobal.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await loginRes.json();
      return data?.data?.token || null;
    } catch (err) {
      console.error('Error acquiring MPC token:', err);
      return null;
    }
  }

  try {
    let token = await getFreshToken();

    const buildUrl = () => {
      const url = new URL('https://api.mypainclinicglobal.com/api/reports/daily-collection');
      if (startDate) url.searchParams.set('startDate', startDate);
      if (endDate) url.searchParams.set('endDate', endDate);
      if (branchId && branchId.trim()) url.searchParams.set('branchId', branchId.trim());
      if (doctorId && doctorId.trim()) url.searchParams.set('doctorId', doctorId.trim());
      return url.toString();
    };

    const makeRequest = async (authTok) => {
      const headers = { 'Accept': 'application/json' };
      if (authTok) {
        headers['Authorization'] = authTok.startsWith('Bearer ') ? authTok : `Bearer ${authTok}`;
      }
      const response = await fetch(buildUrl(), { headers });
      const json = await response.json();
      return { status: response.status, json };
    };

    let result = await makeRequest(token);

    // Auto-refresh token if 401
    const isAuthError = result.status === 401 || (result.json && (result.json.code === 401 || result.json.status === 'failed' || result.json.message === 'Token is logged out'));
    if (isAuthError) {
      token = await getFreshToken();
      if (token) {
        result = await makeRequest(token);
      }
    }

    return res.status(result.status).json(result.json);
  } catch (err) {
    console.error('Error in Vercel /api/mpc-cloud proxy:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

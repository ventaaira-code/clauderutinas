const { createClient } = require('@supabase/supabase-js');

function sb() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

function isAdmin(req) {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  return auth && auth === process.env.ADMIN_PASSWORD;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdmin(req)) return res.status(401).json({ error: 'No autorizado' });

  const db = sb();

  if (req.method === 'GET') {
    const [quotesRes, clientsRes] = await Promise.all([
      db.from('quotes').select('*').order('created_at', { ascending: false }).limit(500),
      db.from('clients').select('*').order('created_at', { ascending: false }).limit(500),
    ]);
    return res.status(200).json({
      quotes: quotesRes.data || [],
      clients: clientsRes.data || [],
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

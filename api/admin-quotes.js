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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
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

  if (req.method === 'PUT') {
    const { id, status } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Se requiere id' });
    const valid = ['pending','cotizado','aceptado','entregado','cancelado'];
    if (status && !valid.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
    const update = { updated_at: new Date().toISOString() };
    if (status) update.status = status;
    const { data, error } = await db.from('quotes').update(update).eq('id', id).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ quote: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

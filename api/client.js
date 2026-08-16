const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sb = getSupabase();

  // GET /api/client?phone=xxx  →  fetch client by phone
  if (req.method === 'GET') {
    const { phone, rfc } = req.query;
    if (!phone && !rfc) return res.status(400).json({ error: 'Se requiere phone o rfc' });
    const col = phone ? 'phone' : 'rfc';
    const val = phone || rfc;
    const { data, error } = await sb.from('clients').select('*').eq(col, val).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ client: data });
  }

  // POST /api/client  →  upsert client
  if (req.method === 'POST') {
    const body = req.body;
    if (!body.phone && !body.rfc) return res.status(400).json({ error: 'Se requiere phone o rfc' });
    const { data, error } = await sb.from('clients')
      .upsert({ ...body, updated_at: new Date().toISOString() }, { onConflict: 'phone' })
      .select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ client: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

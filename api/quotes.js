const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sb = getSupabase();

  // GET /api/quotes?phone=xxx  →  list quotes for client
  if (req.method === 'GET') {
    const { phone } = req.query;
    let q = sb.from('quotes').select('*').order('created_at', { ascending: false }).limit(50);
    if (phone) q = q.eq('client_phone', phone);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ quotes: data || [] });
  }

  // POST /api/quotes  →  save new quote + upsert client
  if (req.method === 'POST') {
    const body = req.body;
    if (!body.number) return res.status(400).json({ error: 'Se requiere número de cotización' });
    const { data, error } = await sb.from('quotes').insert(body).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    // Auto-register client if phone provided
    if (body.client_phone) {
      const client = { phone: body.client_phone, updated_at: new Date().toISOString() };
      if (body.client_name)  client.name  = body.client_name;
      if (body.client_rfc)   client.rfc   = body.client_rfc;
      if (body.client_email) client.email = body.client_email;
      await sb.from('clients').upsert(client, { onConflict: 'phone' });
    }
    return res.status(200).json({ quote: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

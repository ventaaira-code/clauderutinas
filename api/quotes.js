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

  // GET /api/quotes?phone=xxx  →  list quotes for that client only
  if (req.method === 'GET') {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Se requiere teléfono' });
    const { data, error } = await sb.from('quotes').select('*')
      .eq('client_phone', phone).order('created_at', { ascending: false }).limit(50);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ quotes: data || [] });
  }

  // POST /api/quotes  →  auto-number + save quote + upsert client
  if (req.method === 'POST') {
    const body = req.body;
    // Generate next number server-side (avoids duplicates across devices)
    const { count } = await sb.from('quotes').select('*', { count: 'exact', head: true });
    const num = 'COT-' + String((count || 0) + 501).padStart(3, '0');
    // Only insert valid quote columns (client_rfc / client_email belong to clients table)
    const quoteRow = {
      number:       num,
      client_phone: body.client_phone || null,
      client_name:  body.client_name  || null,
      obra:         body.obra         || null,
      items:        body.items        || [],
      subtotal:     body.subtotal     || 0,
      iva:          body.iva          || 0,
      total:        body.total        || 0,
      notes:        body.notes        || null,
    };
    const { data, error } = await sb.from('quotes').insert(quoteRow).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    // Auto-register / update client record
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

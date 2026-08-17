const { createClient } = require('@supabase/supabase-js');
const generateQuotePDF = require('./generate-pdf');

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

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Se requiere id' });

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await db.from('quotes').select('*').eq('id', id).maybeSingle();
  if (error || !data) return res.status(404).json({ error: 'Cotización no encontrada' });

  const pdf = await generateQuotePDF(data);
  const filename = `${data.number || 'COT'}-COENERVGAS.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdf.length);
  return res.status(200).send(pdf);
};

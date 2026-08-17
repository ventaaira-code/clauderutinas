const { Resend } = require('resend');

function isAdmin(req) {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  return auth && auth === process.env.ADMIN_PASSWORD;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdmin(req)) return res.status(401).json({ error: 'No autorizado' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY no configurada' });

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: 'COENERVGAS <onboarding@resend.dev>',
      to:   ['ventaaira@gmail.com'],
      subject: '✅ Prueba de correo — COENERVGAS funciona',
      html: '<p>Este es un correo de prueba. Si lo recibes, Resend está configurado correctamente.</p>'
    });
    return res.status(200).json({ ok: true, id: result.data?.id, error: result.error });
  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

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
    const update = {};
    if (status) update.status = status;
    const { data, error } = await db.from('quotes').update(update).eq('id', id).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    // When marked as 'cotizado', email the client their formal quote with prices
    let emailSent = false;
    let noEmail = false;
    if (status === 'cotizado' && data && process.env.RESEND_API_KEY) {
      try {
        // Look up client email from clients table
        const { data: client } = await db.from('clients')
          .select('email').eq('phone', data.client_phone).maybeSingle();
        const clientEmail = client?.email || null;

        if (clientEmail) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const num    = data.number || '';
          const nombre = data.client_name || 'Cliente';

          // Generate PDF attachment (lazy require so module loads even if pdfkit missing)
          let attachments = [];
          try {
            const generateQuotePDF = require('./generate-pdf');
            const pdfBuffer = await generateQuotePDF(data);
            attachments = [{ filename: `${num}-COENERVGAS.pdf`, content: pdfBuffer }];
          } catch(pdfErr) {
            console.error('PDF generation error:', pdfErr.message);
          }

          await resend.emails.send({
            from: 'COENERVGAS <onboarding@resend.dev>',
            to:   [clientEmail],
            subject: `${num} — Tu cotización está lista, ${nombre}`,
            attachments,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <div style="background:#1a2d5a;padding:20px 24px;border-radius:8px 8px 0 0">
                  <h2 style="color:#fff;margin:0;font-size:18px">COENER<span style="color:#f97316">V</span>GAS</h2>
                  <p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:12px">+13 años en la industria del gas L.P. · Salamanca, GTO</p>
                </div>
                <div style="background:#fff;border:1px solid #e8edf5;padding:24px;border-radius:0 0 8px 8px">
                  <p style="font-size:14px;color:#0f172a">Hola <strong>${nombre}</strong>,</p>
                  <p style="font-size:13px;color:#475569;line-height:1.6">
                    Tu cotización <strong>${num}</strong> está lista. Encuéntrala adjunta como PDF en este correo.
                  </p>

                  <div style="margin:20px 0;background:#f0f9f4;border:1px solid #a7f3d0;border-radius:8px;padding:14px 18px;display:flex;align-items:center;gap:12px">
                    <span style="font-size:28px">📄</span>
                    <div>
                      <div style="font-size:13px;font-weight:700;color:#065f46">${num}-COENERVGAS.pdf</div>
                      <div style="font-size:12px;color:#047857;margin-top:2px">Cotización formal adjunta · incluye precios y totales</div>
                    </div>
                  </div>

                  <div style="margin-top:18px;background:#f0f9ff;border-radius:6px;padding:14px 16px;border-left:3px solid #f97316">
                    <p style="margin:0;font-size:13px;color:#1a2d5a"><strong>¿Listo para confirmar tu pedido?</strong></p>
                    <p style="margin:6px 0 0;font-size:13px">📱 <a href="https://wa.me/524621881152" style="color:#f97316;font-weight:700">462 188 1152</a> · WhatsApp disponible</p>
                  </div>

                  <p style="margin-top:20px;text-align:center">
                    <a href="https://wa.me/524621881152?text=${encodeURIComponent(`Hola, quiero confirmar la cotización ${num}`)}"
                       style="background:#25D366;color:#fff;padding:11px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;display:inline-block">
                      ✅ Confirmar pedido por WhatsApp
                    </a>
                  </p>

                  <p style="margin-top:18px;font-size:11px;color:#94a3b8;text-align:center">
                    COENERVGAS · Salamanca, GTO · RFC: GASE820515MB5
                  </p>
                </div>
              </div>`
          });
          emailSent = true;
        } else {
          noEmail = true;
        }
      } catch(emailErr) {
        console.error('quote email error:', emailErr.message);
      }
    }

    return res.status(200).json({ quote: data, emailSent, noEmail });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

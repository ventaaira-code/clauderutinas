const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const money = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n||0);

function itemsTableWithPrices(items) {
  const rows = (items||[]).map(i => {
    const precio = i.price || 0;
    const importe = precio * (i.qty || 1);
    return `<tr>
      <td style="padding:7px 10px;border-bottom:1px solid #eee">${i.name||''} ${i.size||''}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center">${i.qty||1}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee">${i.unit||''}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right;font-variant-numeric:tabular-nums">${money(precio)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right;font-variant-numeric:tabular-nums">${money(importe)}</td>
    </tr>`;
  }).join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:#1a2d5a;color:#fff">
      <th style="padding:7px 10px;text-align:left">Material</th>
      <th style="padding:7px 10px;text-align:center">Cant.</th>
      <th style="padding:7px 10px;text-align:left">Unidad</th>
      <th style="padding:7px 10px;text-align:right">P. Unit.</th>
      <th style="padding:7px 10px;text-align:right">Importe</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

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
          const obra   = data.obra || 'No especificada';
          const table  = itemsTableWithPrices(data.items);
          const sub    = data.subtotal || 0;
          const iva    = data.iva || 0;
          const total  = data.total || 0;

          await resend.emails.send({
            from: 'COENERVGAS <onboarding@resend.dev>',
            to:   [clientEmail],
            subject: `${num} — Tu cotización está lista, ${nombre}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <div style="background:#1a2d5a;padding:20px 24px;border-radius:8px 8px 0 0">
                  <h2 style="color:#fff;margin:0;font-size:18px">COENER<span style="color:#f97316">V</span>GAS</h2>
                  <p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:12px">+13 años en la industria del gas L.P. · Salamanca, GTO</p>
                </div>
                <div style="background:#fff;border:1px solid #e8edf5;padding:24px;border-radius:0 0 8px 8px">
                  <p style="font-size:14px;color:#0f172a">Hola <strong>${nombre}</strong>,</p>
                  <p style="font-size:13px;color:#475569;line-height:1.6">
                    Tu cotización <strong>${num}</strong> está lista. Aquí tienes el desglose de precios:
                  </p>

                  <div style="background:#f8fafd;border-radius:6px;padding:12px 16px;margin-bottom:18px;font-size:13px">
                    <strong>Folio:</strong> ${num} &nbsp;·&nbsp; <strong>Obra:</strong> ${obra}
                  </div>

                  ${table}

                  <div style="margin-top:14px;border-top:2px solid #1a2d5a;padding-top:10px">
                    <table style="width:100%;font-size:13px">
                      <tr><td style="padding:3px 10px;color:#475569">Subtotal</td><td style="padding:3px 10px;text-align:right;font-variant-numeric:tabular-nums">${money(sub)}</td></tr>
                      <tr><td style="padding:3px 10px;color:#475569">IVA 16%</td><td style="padding:3px 10px;text-align:right;font-variant-numeric:tabular-nums">${money(iva)}</td></tr>
                      <tr style="font-weight:700;font-size:14px">
                        <td style="padding:6px 10px;color:#1a2d5a">TOTAL</td>
                        <td style="padding:6px 10px;text-align:right;color:#f97316;font-variant-numeric:tabular-nums">${money(total)}</td>
                      </tr>
                    </table>
                  </div>

                  ${data.notes ? `<p style="margin-top:14px;font-size:13px;color:#475569;background:#f8fafd;padding:10px 14px;border-radius:6px">📝 ${data.notes}</p>` : ''}

                  <div style="margin-top:20px;background:#f0f9ff;border-radius:6px;padding:14px 16px;border-left:3px solid #f97316">
                    <p style="margin:0;font-size:13px;color:#1a2d5a"><strong>¿Tienes dudas o quieres confirmar tu pedido?</strong></p>
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

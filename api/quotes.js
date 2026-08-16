const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const money = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n||0);

function itemsTable(items) {
  const rows = (items||[]).map(i =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${i.name||''} ${i.size||''}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${i.qty||1}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #eee">${i.unit||''}</td></tr>`
  ).join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:#1a2d5a;color:#fff">
      <th style="padding:7px 10px;text-align:left">Material</th>
      <th style="padding:7px 10px;text-align:center">Cant.</th>
      <th style="padding:7px 10px;text-align:left">Unidad</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

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

    // Send emails via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const table  = itemsTable(body.items);
        const obra   = body.obra || 'No especificada';
        const nombre = body.client_name || 'Cliente';
        const tel    = body.client_phone || '—';

        // ── Email al admin ──
        await resend.emails.send({
          from: 'COENERVGAS <onboarding@resend.dev>',
          to:   ['ventaaira@gmail.com'],
          subject: `🔔 Nueva solicitud ${num} — ${nombre}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#1a2d5a;padding:20px 24px;border-radius:8px 8px 0 0">
                <h2 style="color:#fff;margin:0;font-size:18px">COENER<span style="color:#f97316">V</span>GAS</h2>
                <p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:12px">Nueva solicitud de cotización</p>
              </div>
              <div style="background:#fff;border:1px solid #e8edf5;padding:24px;border-radius:0 0 8px 8px">
                <div style="background:#f8fafd;border-radius:6px;padding:14px 16px;margin-bottom:18px">
                  <p style="margin:0 0 6px;font-size:13px"><strong>Folio:</strong> ${num}</p>
                  <p style="margin:0 0 6px;font-size:13px"><strong>Cliente:</strong> ${nombre}</p>
                  <p style="margin:0 0 6px;font-size:13px"><strong>Teléfono:</strong> ${tel}</p>
                  ${body.client_rfc   ? `<p style="margin:0 0 6px;font-size:13px"><strong>RFC:</strong> ${body.client_rfc}</p>` : ''}
                  ${body.client_email ? `<p style="margin:0 0 6px;font-size:13px"><strong>Correo:</strong> ${body.client_email}</p>` : ''}
                  <p style="margin:0;font-size:13px"><strong>Obra:</strong> ${obra}</p>
                </div>
                <h3 style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">Materiales solicitados</h3>
                ${table}
                ${body.notes ? `<p style="margin-top:14px;font-size:13px;color:#475569">📝 <em>${body.notes}</em></p>` : ''}
                <div style="margin-top:18px;text-align:center">
                  <a href="https://wa.me/${(tel||'').replace(/\D/g,'').length===10?'52':''}${(tel||'').replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${nombre}, respecto a tu cotización *${num}*`)}"
                     style="background:#25D366;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700">
                    💬 Responder por WhatsApp
                  </a>
                </div>
              </div>
            </div>`
        });

        // ── Email al cliente (si dejó correo) ──
        if (body.client_email) {
          await resend.emails.send({
            from: 'COENERVGAS <onboarding@resend.dev>',
            to:   [body.client_email],
            subject: `${num} — Recibimos tu solicitud, ${nombre}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <div style="background:#1a2d5a;padding:20px 24px;border-radius:8px 8px 0 0">
                  <h2 style="color:#fff;margin:0;font-size:18px">COENER<span style="color:#f97316">V</span>GAS</h2>
                  <p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:12px">+13 años en la industria del gas L.P.</p>
                </div>
                <div style="background:#fff;border:1px solid #e8edf5;padding:24px;border-radius:0 0 8px 8px">
                  <p style="font-size:14px;color:#0f172a">Hola <strong>${nombre}</strong>,</p>
                  <p style="font-size:13px;color:#475569;line-height:1.6">
                    Recibimos tu solicitud de cotización <strong>${num}</strong>. En breve te contactamos con precios y disponibilidad.
                  </p>
                  <h3 style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:18px 0 8px">Lo que solicitaste</h3>
                  ${table}
                  ${body.notes ? `<p style="margin-top:14px;font-size:13px;color:#475569">📝 ${body.notes}</p>` : ''}
                  <div style="margin-top:20px;background:#f0f9ff;border-radius:6px;padding:14px 16px;border-left:3px solid #f97316">
                    <p style="margin:0;font-size:13px;color:#1a2d5a"><strong>¿Dudas?</strong> Escríbenos directamente:</p>
                    <p style="margin:6px 0 0;font-size:13px">📱 <a href="https://wa.me/524621881152" style="color:#f97316">462 188 1152</a> · WhatsApp</p>
                  </div>
                  <p style="margin-top:18px;font-size:11px;color:#94a3b8;text-align:center">
                    COENERVGAS · Salamanca, GTO · RFC: GASE820515MB5
                  </p>
                </div>
              </div>`
          });
        }
      } catch(emailErr) {
        console.error('email error:', emailErr.message);
      }
    }

    return res.status(200).json({ quote: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

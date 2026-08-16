const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');

const NAVY  = '#1a2d5a';
const ORG   = '#f97316';
const GREY  = '#64748b';
const LGREY = '#edf1f7';
const BLACK = '#0f172a';

function generateRequestPDF(quote) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100;
    let y = 50;

    // ── HEADER ──
    doc.rect(50, y, W, 56).fill(NAVY);
    doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold')
       .text('COENER', 62, y + 15, { continued: true })
       .fillColor(ORG).text('V', { continued: true })
       .fillColor('#ffffff').text('GAS');
    doc.fontSize(7).fillColor('rgba(255,255,255,0.55)').font('Helvetica')
       .text('+13 años en la industria del gas L.P.  ·  Salamanca, Guanajuato', 62, y + 40);

    // Folio badge
    doc.fontSize(8).fillColor(ORG).font('Helvetica-Bold')
       .text('SOLICITUD DE COTIZACIÓN', 340, y + 12, { width: 168, align: 'right' });
    doc.fontSize(15).fillColor('#ffffff').font('Helvetica-Bold')
       .text(quote.number || '—', 340, y + 26, { width: 168, align: 'right' });
    y += 72;

    // ── CLIENT INFO ──
    doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold')
       .text('SOLICITANTE', 50, y, { characterSpacing: 1 });
    doc.fontSize(12).fillColor(BLACK).font('Helvetica-Bold')
       .text(quote.client_name || '—', 50, y + 12);

    let cY = y + 30;
    const row = (lbl, val) => {
      if (!val) return;
      doc.fontSize(7.5).fillColor(GREY).font('Helvetica').text(lbl + ':', 50, cY, { continued: true, width: 60 })
         .fillColor(BLACK).text(' ' + val);
      cY += 13;
    };
    row('Teléfono', quote.client_phone);
    row('Correo',   quote.client_email);
    row('Obra',     quote.obra);

    // Date right
    const dateStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold').text('FECHA', 420, y, { characterSpacing: 1 });
    doc.fontSize(9).fillColor(BLACK).font('Helvetica').text(dateStr, 420, y + 12, { width: 138, align: 'right' });

    y = Math.max(cY, y + 56) + 16;

    const money = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n||0);

    // ── ITEMS TABLE ──
    const COL = { num: 50, mat: 70, cal: 248, qty: 330, unit: 378, price: 432, imp: 490 };
    const COL_W = { num: 16, mat: 174, cal: 78, qty: 44, unit: 50, price: 54, imp: 68 };

    doc.rect(50, y, W, 20).fill(NAVY);
    doc.fontSize(7).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text('#',         COL.num,   y + 6, { width: COL_W.num,   align: 'center' });
    doc.text('MATERIAL',  COL.mat,   y + 6, { width: COL_W.mat });
    doc.text('CALIBRE',   COL.cal,   y + 6, { width: COL_W.cal,   align: 'center' });
    doc.text('CANT.',     COL.qty,   y + 6, { width: COL_W.qty,   align: 'center' });
    doc.text('UNIDAD',    COL.unit,  y + 6, { width: COL_W.unit,  align: 'center' });
    doc.text('P. UNIT.',  COL.price, y + 6, { width: COL_W.price, align: 'right' });
    doc.text('IMPORTE',   COL.imp,   y + 6, { width: COL_W.imp,   align: 'right' });
    y += 20;

    (quote.items || []).forEach((item, idx) => {
      const rowH = 18;
      const precio  = item.price || 0;
      const importe = precio * (item.qty || 1);
      doc.rect(50, y, W, rowH).fill(idx % 2 === 0 ? '#ffffff' : LGREY);
      doc.fontSize(7.5).fillColor(BLACK).font('Helvetica')
         .text(String(idx + 1),  COL.num,   y + 5, { width: COL_W.num,   align: 'center' })
         .text(item.name || '—', COL.mat,   y + 5, { width: COL_W.mat - 3, ellipsis: true })
         .fillColor(GREY)
         .text(item.size || '—', COL.cal,   y + 5, { width: COL_W.cal,   align: 'center' })
         .fillColor(BLACK).font('Helvetica-Bold')
         .text(String(item.qty || 1), COL.qty, y + 5, { width: COL_W.qty, align: 'center' })
         .fillColor(GREY).font('Helvetica')
         .text(item.unit || '—', COL.unit,  y + 5, { width: COL_W.unit,  align: 'center' })
         .text(money(precio),    COL.price, y + 5, { width: COL_W.price, align: 'right' })
         .fillColor(BLACK).font('Helvetica-Bold')
         .text(money(importe),   COL.imp,   y + 5, { width: COL_W.imp,   align: 'right' });
      y += rowH;
    });

    doc.moveTo(50, y).lineTo(50 + W, y).strokeColor('#dde4ee').lineWidth(1).stroke();
    y += 12;

    // ── TOTALS ──
    const totW = 200;
    const totX = 50 + W - totW;
    const totRow = (lbl, val, bold, color) => {
      doc.fontSize(9).fillColor(bold ? BLACK : GREY).font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .text(lbl, totX, y, { width: totW - 85 });
      doc.fillColor(color || (bold ? BLACK : GREY))
         .text(val, totX + totW - 83, y, { width: 83, align: 'right' });
      y += 14;
    };
    totRow('Subtotal', money(quote.subtotal));
    totRow('IVA 16%',  money(quote.iva));
    y += 2;
    doc.rect(totX, y, totW, 22).fill(NAVY);
    doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold')
       .text('TOTAL', totX + 6, y + 6, { width: totW - 85 });
    doc.fillColor(ORG).text(money(quote.total), totX + totW - 83, y + 6, { width: 83, align: 'right' });
    y += 30;

    // ── NOTES ──
    if (quote.notes) {
      doc.fontSize(7.5).fillColor(GREY).font('Helvetica-Bold').text('NOTAS:', 50, y); y += 12;
      doc.fontSize(8.5).fillColor(BLACK).font('Helvetica').text(quote.notes, 50, y, { width: W });
      y += doc.heightOfString(quote.notes, { width: W }) + 12;
    }

    // ── FOOTER ──
    const footY = doc.page.height - 80;
    doc.rect(50, footY, W, 1).fill(LGREY);
    doc.fontSize(8).fillColor(NAVY).font('Helvetica-Bold').text('COENERVGAS', 50, footY + 8);
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
       .text('Circuito Eucaliptos 262, Col. Las Arboledas · Salamanca, GTO · C.P. 36764', 50, footY + 20)
       .text('RFC: GASE820515MB5  ·  Tel: 462 188 1152  ·  WhatsApp: wa.me/524621881152', 50, footY + 32);

    doc.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Se requiere id' });

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await db.from('quotes').select('*').eq('id', id).maybeSingle();
  if (error || !data) return res.status(404).json({ error: 'No encontrado' });

  const pdf = await generateRequestPDF(data);
  const filename = `${data.number || 'Solicitud'}-COENERVGAS.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdf.length);
  return res.status(200).send(pdf);
};

const PDFDocument = require('pdfkit');

const NAVY  = '#1a2d5a';
const ORG   = '#f97316';
const GREY  = '#64748b';
const LGREY = '#edf1f7';
const BLACK = '#0f172a';

const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
const fmtDate = s => s ? new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

module.exports = function generateQuotePDF(quote) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100; // usable width (margins 50 each side)
    let y = 50;

    // ── HEADER BAR ──
    doc.rect(50, y, W, 56).fill(NAVY);

    // Company name
    doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold')
       .text('COENER', 62, y + 15, { continued: true })
       .fillColor(ORG).text('V', { continued: true })
       .fillColor('#ffffff').text('GAS');

    doc.fontSize(7).fillColor('rgba(255,255,255,0.55)').font('Helvetica')
       .text('+13 años en la industria del gas L.P.  ·  Salamanca, Guanajuato', 62, y + 40);

    // Folio badge (right side)
    doc.fontSize(8).fillColor(ORG).font('Helvetica-Bold')
       .text('COTIZACIÓN', 420, y + 12, { width: 130, align: 'right' });
    doc.fontSize(16).fillColor('#ffffff').font('Helvetica-Bold')
       .text(quote.number || '—', 420, y + 24, { width: 130, align: 'right' });

    y += 72;

    // ── CLIENT + DATE INFO ──
    const infoY = y;

    // Left block: client
    doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold')
       .text('CLIENTE', 50, infoY, { characterSpacing: 1 });
    doc.fontSize(11).fillColor(BLACK).font('Helvetica-Bold')
       .text(quote.client_name || '—', 50, infoY + 12);

    let cY = infoY + 28;
    const infoRow = (label, val) => {
      if (!val) return;
      doc.fontSize(7.5).fillColor(GREY).font('Helvetica').text(label + ':', 50, cY, { continued: true, width: 55 })
         .fillColor(BLACK).text(' ' + val, { width: 240 });
      cY += 13;
    };
    infoRow('Teléfono', quote.client_phone);
    infoRow('Obra',     quote.obra);

    // Right block: date + validity
    doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold')
       .text('FECHA', 390, infoY, { characterSpacing: 1 });
    doc.fontSize(9).fillColor(BLACK).font('Helvetica')
       .text(fmtDate(quote.created_at), 390, infoY + 12, { width: 170, align: 'right' });

    doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold')
       .text('VÁLIDA POR', 390, infoY + 30, { characterSpacing: 1 });
    doc.fontSize(9).fillColor(BLACK).font('Helvetica')
       .text('15 días naturales', 390, infoY + 42, { width: 170, align: 'right' });

    y = Math.max(cY, infoY + 60) + 16;

    // ── ITEMS TABLE ──
    const COL = { mat: 50, qty: 280, unit: 330, price: 390, total: 470 };
    const COL_W = { mat: 225, qty: 45, unit: 55, price: 75, total: 88 };

    // Table header
    doc.rect(50, y, W, 20).fill(NAVY);
    doc.fontSize(7.5).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text('MATERIAL / DESCRIPCIÓN', COL.mat + 4, y + 6, { width: COL_W.mat });
    doc.text('CANT.', COL.qty, y + 6, { width: COL_W.qty, align: 'center' });
    doc.text('UNIDAD', COL.unit, y + 6, { width: COL_W.unit, align: 'center' });
    doc.text('P. UNIT.', COL.price, y + 6, { width: COL_W.price, align: 'right' });
    doc.text('IMPORTE', COL.total, y + 6, { width: COL_W.total, align: 'right' });
    y += 20;

    // Table rows
    const items = quote.items || [];
    items.forEach((item, idx) => {
      const rowH = 18;
      const bg = idx % 2 === 0 ? '#ffffff' : LGREY;
      doc.rect(50, y, W, rowH).fill(bg);

      const precio  = item.price || 0;
      const importe = precio * (item.qty || 1);
      const label   = [item.name, item.size].filter(Boolean).join(' ');

      doc.fontSize(8).fillColor(BLACK).font('Helvetica')
         .text(label, COL.mat + 4, y + 5, { width: COL_W.mat - 4, ellipsis: true });
      doc.text(String(item.qty || 1), COL.qty, y + 5, { width: COL_W.qty, align: 'center' });
      doc.text(item.unit || '', COL.unit, y + 5, { width: COL_W.unit, align: 'center' });
      doc.fillColor(GREY)
         .text(money(precio), COL.price, y + 5, { width: COL_W.price, align: 'right' });
      doc.fillColor(BLACK).font('Helvetica-Bold')
         .text(money(importe), COL.total, y + 5, { width: COL_W.total, align: 'right' });

      y += rowH;
    });

    // Table bottom border
    doc.moveTo(50, y).lineTo(50 + W, y).strokeColor('#dde4ee').lineWidth(1).stroke();
    y += 12;

    // ── TOTALS ──
    const totW = 220;
    const totX = 50 + W - totW;

    const totRow = (label, val, bold, color) => {
      doc.fontSize(9)
         .fillColor(bold ? BLACK : GREY)
         .font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .text(label, totX, y, { width: totW - 90 });
      doc.fillColor(color || (bold ? BLACK : GREY))
         .text(val, totX + totW - 88, y, { width: 88, align: 'right' });
      y += 14;
    };

    totRow('Subtotal', money(quote.subtotal));
    totRow('IVA 16%',  money(quote.iva));
    y += 2;
    doc.rect(totX, y, totW, 22).fill(NAVY);
    doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold')
       .text('TOTAL', totX + 6, y + 6, { width: totW - 90 });
    doc.fillColor(ORG)
       .text(money(quote.total), totX + totW - 88, y + 6, { width: 88, align: 'right' });
    y += 30;

    // ── NOTES ──
    if (quote.notes) {
      doc.rect(50, y, W, 1).fill(LGREY); y += 8;
      doc.fontSize(7.5).fillColor(GREY).font('Helvetica-Bold').text('NOTAS:', 50, y);
      y += 12;
      doc.fontSize(8.5).fillColor(BLACK).font('Helvetica').text(quote.notes, 50, y, { width: W });
      y += doc.heightOfString(quote.notes, { width: W }) + 10;
    }

    // ── FOOTER ──
    const footY = doc.page.height - 80;
    doc.rect(50, footY, W, 1).fill(LGREY);

    doc.fontSize(8).fillColor(NAVY).font('Helvetica-Bold')
       .text('COENERVGAS', 50, footY + 8);
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
       .text('Circuito Eucaliptos 262, Col. Las Arboledas · Salamanca, GTO · C.P. 36764', 50, footY + 20)
       .text('RFC: GASE820515MB5  ·  Tel: 462 188 1152  ·  WhatsApp: wa.me/524621881152', 50, footY + 32);

    doc.fontSize(7.5).fillColor(ORG).font('Helvetica-Bold')
       .text('Este documento es una cotización formal y no constituye un compromiso de entrega hasta confirmar disponibilidad.', 50, footY + 48, { width: W, align: 'center' });

    doc.end();
  });
};

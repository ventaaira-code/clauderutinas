const Anthropic = require('@anthropic-ai/sdk');

const PROMPT = `Eres un extractor de listas de materiales para COENERVGAS, Salamanca Gto. (instalaciones Gas LP).

Analiza la imagen. Puede ser: plano, lista de materiales, cotización, documento escaneado o foto de una lista.

REGLA PRINCIPAL: Lee y copia TEXTUALMENTE los nombres que aparecen en el documento. NO interpretes ni cambies los nombres. Si dice "tubo", escribe "tubo". Si dice "niple", escribe "niple". Si dice "válvula", escribe "válvula". Respeta el texto original.

Extrae de cada ítem:
- nombre: el texto exacto del material tal como está escrito
- calibre: el diámetro o tamaño si aparece (ej: 3/4", 1", 1/2")
- cantidad: el número indicado (si no hay, usa 1)
- unidad: metros para tubería, pieza para conexiones/válvulas/reguladores (si está escrita en el doc úsala)

Responde ÚNICAMENTE con un JSON array válido, sin texto antes ni después:
[{"nombre":"Tubo acero negro","calibre":"3/4\\"","cantidad":15,"unidad":"metros"}]
Si no hay materiales: []`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mediaType = 'image/jpeg' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No se recibió imagen' });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: PROMPT }
        ]
      }]
    });

    const text = message.content[0].text.trim();
    let materials = [];
    try {
      const m = text.match(/\[[\s\S]*\]/);
      if (m) materials = JSON.parse(m[0]);
    } catch (e) { materials = []; }

    return res.status(200).json({ ok: true, materials });
  } catch (err) {
    console.error('analyze error:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
};

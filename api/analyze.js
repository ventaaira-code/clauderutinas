const Anthropic = require('@anthropic-ai/sdk');

const PROMPT = `Eres un experto en instalaciones de gas LP en México trabajando para COENERVGAS, Salamanca Gto.

Analiza la imagen. Puede ser: plano de instalación, lista de materiales escrita a mano, fotografía de documento, PDF escaneado.

Catálogo de materiales disponibles:
TUBERÍA (unidad: metros): Tubo acero negro Sch.40 (1/2", 3/4", 1", 1-1/4", 1-1/2", 2", 2-1/2", 3", 4"), Tubo acero carbón Sch.80 (1/2", 3/4", 1", 1-1/4", 2"), Tubo cobre tipo L (3/8", 1/2", 3/4", 1"), Tubo cobre tipo K (1/2", 3/4", 1"), Tubo cobre tipo C/M (1/2", 3/4"), Tubo galvanizado (1/2", 3/4", 1", 1-1/4")
CONEXIONES ACERO NEGRO (piezas): Codo 90° acero negro, Codo 45° acero negro, Tee recta acero negro, Unión acero negro, Niple hexagonal acero negro, Bushing reductor acero negro, Tapón cuadrado acero negro — calibres: 1/2", 3/4", 1", 1-1/4"
CONEXIONES COBRE (piezas): Codo 90° cobre soldable, Tee cobre soldable, Adaptador macho cobre × rosca, Adaptador hembra cobre × rosca — calibres: 1/2", 3/4", 1"
VÁLVULAS (piezas): Válvula de bola paso completo (1/2", 3/4", 1", 1-1/4", 1-1/2", 2"), Válvula cierre rápido para aparato (1/2", 3/4"), Válvula de aguja (1/4", 1/2"), Válvula check (1/2", 3/4")
REGULADORES (piezas): Regulador 1ª etapa Gas LP Estándar, Regulador 1ª etapa alta capacidad Industrial, Regulador 2ª etapa Gas LP Estándar, Regulador 2ª etapa alta capacidad Industrial, Regulador monobloque doméstico 3/8" NPT, Regulador monobloque para aparatos 1/2" NPT, Regulador industrial LP alta presión 3/4" NPT
MANGUERAS (piezas): Conector flexible corrugado inox 1/2"×30cm, Conector flexible corrugado inox 1/2"×50cm, Conector flexible corrugado inox 1/2"×80cm, Conector flexible corrugado inox 3/4"×50cm, Manguera hule Gas LP certificada 3/8"×1m, Manguera hule Gas LP certificada 1/2"×1m

Extrae TODOS los materiales de gas LP visibles. Usa los nombres más cercanos al catálogo.
Responde ÚNICAMENTE con un JSON array válido, sin texto antes ni después:
[{"nombre":"Tubo acero negro Sch.40","calibre":"3/4\\"","cantidad":15,"unidad":"metros"}]
Si no hay materiales de gas LP: []`;

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

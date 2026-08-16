const { createClient } = require('@supabase/supabase-js');

function sb() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

function isAdmin(req) {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  return auth && auth === process.env.ADMIN_PASSWORD;
}

const SEED = [
  {id:'t01',cat:'tuberia',spec:'acero-negro',name:'Tubo acero negro Sch.40',size:'1/2"',unit:'metro',price:45,description:'ASTM A-53 Gr.B, Schedule 40',active:true},
  {id:'t02',cat:'tuberia',spec:'acero-negro',name:'Tubo acero negro Sch.40',size:'3/4"',unit:'metro',price:68,description:'ASTM A-53 Gr.B, Schedule 40',active:true},
  {id:'t03',cat:'tuberia',spec:'acero-negro',name:'Tubo acero negro Sch.40',size:'1"',unit:'metro',price:98,description:'ASTM A-53 Gr.B, Schedule 40',active:true},
  {id:'t04',cat:'tuberia',spec:'acero-negro',name:'Tubo acero negro Sch.40',size:'1-1/4"',unit:'metro',price:138,description:'ASTM A-53 Gr.B, Schedule 40',active:true},
  {id:'t05',cat:'tuberia',spec:'acero-negro',name:'Tubo acero negro Sch.40',size:'1-1/2"',unit:'metro',price:168,description:'ASTM A-53 Gr.B, Schedule 40',active:true},
  {id:'t06',cat:'tuberia',spec:'acero-negro',name:'Tubo acero negro Sch.40',size:'2"',unit:'metro',price:228,description:'ASTM A-53 Gr.B, Schedule 40',active:true},
  {id:'t07',cat:'tuberia',spec:'acero-negro',name:'Tubo acero negro Sch.40',size:'2-1/2"',unit:'metro',price:325,description:'ASTM A-53 Gr.B, Schedule 40',active:true},
  {id:'t08',cat:'tuberia',spec:'acero-negro',name:'Tubo acero negro Sch.40',size:'3"',unit:'metro',price:435,description:'ASTM A-53 Gr.B, Schedule 40',active:true},
  {id:'t09',cat:'tuberia',spec:'acero-negro',name:'Tubo acero negro Sch.40',size:'4"',unit:'metro',price:685,description:'ASTM A-53 Gr.B, Schedule 40',active:true},
  {id:'t10',cat:'tuberia',spec:'acero-carbon',name:'Tubo acero carbón Sch.80',size:'1/2"',unit:'metro',price:74,description:'ASTM A-53 Gr.B, pared extra gruesa',active:true},
  {id:'t11',cat:'tuberia',spec:'acero-carbon',name:'Tubo acero carbón Sch.80',size:'3/4"',unit:'metro',price:108,description:'ASTM A-53 Gr.B, Sch.80',active:true},
  {id:'t12',cat:'tuberia',spec:'acero-carbon',name:'Tubo acero carbón Sch.80',size:'1"',unit:'metro',price:158,description:'ASTM A-53 Gr.B, Sch.80',active:true},
  {id:'t13',cat:'tuberia',spec:'acero-carbon',name:'Tubo acero carbón Sch.80',size:'1-1/4"',unit:'metro',price:218,description:'ASTM A-53 Gr.B, Sch.80',active:true},
  {id:'t14',cat:'tuberia',spec:'acero-carbon',name:'Tubo acero carbón Sch.80',size:'2"',unit:'metro',price:370,description:'ASTM A-53 Gr.B, Sch.80',active:true},
  {id:'t15',cat:'tuberia',spec:'cobre-l',name:'Tubo cobre tipo L',size:'3/8"',unit:'metro',price:98,description:'ASTM B-88 Tipo L, pared media',active:true},
  {id:'t16',cat:'tuberia',spec:'cobre-l',name:'Tubo cobre tipo L',size:'1/2"',unit:'metro',price:138,description:'ASTM B-88 Tipo L',active:true},
  {id:'t17',cat:'tuberia',spec:'cobre-l',name:'Tubo cobre tipo L',size:'3/4"',unit:'metro',price:215,description:'ASTM B-88 Tipo L',active:true},
  {id:'t18',cat:'tuberia',spec:'cobre-l',name:'Tubo cobre tipo L',size:'1"',unit:'metro',price:348,description:'ASTM B-88 Tipo L',active:true},
  {id:'t19',cat:'tuberia',spec:'cobre-k',name:'Tubo cobre tipo K',size:'1/2"',unit:'metro',price:188,description:'ASTM B-88 Tipo K, pared gruesa',active:true},
  {id:'t20',cat:'tuberia',spec:'cobre-k',name:'Tubo cobre tipo K',size:'3/4"',unit:'metro',price:290,description:'ASTM B-88 Tipo K',active:true},
  {id:'t21',cat:'tuberia',spec:'cobre-k',name:'Tubo cobre tipo K',size:'1"',unit:'metro',price:450,description:'ASTM B-88 Tipo K',active:true},
  {id:'t22',cat:'tuberia',spec:'cobre-c',name:'Tubo cobre tipo C/M',size:'1/2"',unit:'metro',price:82,description:'ASTM B-88 Tipo M, uso interior',active:true},
  {id:'t23',cat:'tuberia',spec:'cobre-c',name:'Tubo cobre tipo C/M',size:'3/4"',unit:'metro',price:128,description:'ASTM B-88 Tipo M',active:true},
  {id:'t24',cat:'tuberia',spec:'galvanizado',name:'Tubo galvanizado',size:'1/2"',unit:'metro',price:56,description:'Cédula 40, galvanizado en caliente',active:true},
  {id:'t25',cat:'tuberia',spec:'galvanizado',name:'Tubo galvanizado',size:'3/4"',unit:'metro',price:82,description:'Cédula 40, galvanizado',active:true},
  {id:'t26',cat:'tuberia',spec:'galvanizado',name:'Tubo galvanizado',size:'1"',unit:'metro',price:122,description:'Cédula 40, galvanizado',active:true},
  {id:'t27',cat:'tuberia',spec:'galvanizado',name:'Tubo galvanizado',size:'1-1/4"',unit:'metro',price:168,description:'Cédula 40, galvanizado',active:true},
  {id:'c01',cat:'conexiones',spec:'acero-neg-con',name:'Codo 90° acero negro',size:'1/2"',unit:'pieza',price:12,description:'Rosca NPT, fundición',active:true},
  {id:'c02',cat:'conexiones',spec:'acero-neg-con',name:'Codo 90° acero negro',size:'3/4"',unit:'pieza',price:18,description:'Rosca NPT',active:true},
  {id:'c03',cat:'conexiones',spec:'acero-neg-con',name:'Codo 90° acero negro',size:'1"',unit:'pieza',price:28,description:'Rosca NPT',active:true},
  {id:'c04',cat:'conexiones',spec:'acero-neg-con',name:'Codo 90° acero negro',size:'1-1/4"',unit:'pieza',price:44,description:'Rosca NPT',active:true},
  {id:'c05',cat:'conexiones',spec:'acero-neg-con',name:'Codo 90° acero negro',size:'2"',unit:'pieza',price:96,description:'Rosca NPT',active:true},
  {id:'c06',cat:'conexiones',spec:'acero-neg-con',name:'Codo 45° acero negro',size:'1/2"',unit:'pieza',price:14,description:'Rosca NPT',active:true},
  {id:'c07',cat:'conexiones',spec:'acero-neg-con',name:'Codo 45° acero negro',size:'3/4"',unit:'pieza',price:21,description:'Rosca NPT',active:true},
  {id:'c08',cat:'conexiones',spec:'acero-neg-con',name:'Codo 45° acero negro',size:'1"',unit:'pieza',price:33,description:'Rosca NPT',active:true},
  {id:'c09',cat:'conexiones',spec:'acero-neg-con',name:'Tee recta acero negro',size:'1/2"',unit:'pieza',price:15,description:'Rosca NPT',active:true},
  {id:'c10',cat:'conexiones',spec:'acero-neg-con',name:'Tee recta acero negro',size:'3/4"',unit:'pieza',price:23,description:'Rosca NPT',active:true},
  {id:'c11',cat:'conexiones',spec:'acero-neg-con',name:'Tee recta acero negro',size:'1"',unit:'pieza',price:36,description:'Rosca NPT',active:true},
  {id:'c12',cat:'conexiones',spec:'acero-neg-con',name:'Tee recta acero negro',size:'1-1/4"',unit:'pieza',price:56,description:'Rosca NPT',active:true},
  {id:'c13',cat:'conexiones',spec:'acero-neg-con',name:'Unión acero negro',size:'1/2"',unit:'pieza',price:18,description:'Rosca NPT',active:true},
  {id:'c14',cat:'conexiones',spec:'acero-neg-con',name:'Unión acero negro',size:'3/4"',unit:'pieza',price:27,description:'Rosca NPT',active:true},
  {id:'c15',cat:'conexiones',spec:'acero-neg-con',name:'Unión acero negro',size:'1"',unit:'pieza',price:42,description:'Rosca NPT',active:true},
  {id:'c16',cat:'conexiones',spec:'acero-neg-con',name:'Niple hexagonal acero negro',size:'1/2" × 2"',unit:'pieza',price:10,description:'Rosca NPT',active:true},
  {id:'c17',cat:'conexiones',spec:'acero-neg-con',name:'Niple hexagonal acero negro',size:'3/4" × 2"',unit:'pieza',price:16,description:'Rosca NPT',active:true},
  {id:'c18',cat:'conexiones',spec:'acero-neg-con',name:'Niple hexagonal acero negro',size:'1" × 2"',unit:'pieza',price:24,description:'Rosca NPT',active:true},
  {id:'c19',cat:'conexiones',spec:'acero-neg-con',name:'Bushing reductor acero negro',size:'3/4"→1/2"',unit:'pieza',price:12,description:'Reducción roscada NPT',active:true},
  {id:'c20',cat:'conexiones',spec:'acero-neg-con',name:'Bushing reductor acero negro',size:'1"→3/4"',unit:'pieza',price:18,description:'Reducción roscada NPT',active:true},
  {id:'c21',cat:'conexiones',spec:'acero-neg-con',name:'Tapón cuadrado acero negro',size:'1/2"',unit:'pieza',price:8,description:'Tapón roscado macho NPT',active:true},
  {id:'c22',cat:'conexiones',spec:'acero-neg-con',name:'Tapón cuadrado acero negro',size:'3/4"',unit:'pieza',price:12,description:'Tapón roscado macho NPT',active:true},
  {id:'c23',cat:'conexiones',spec:'acero-neg-con',name:'Tapón cuadrado acero negro',size:'1"',unit:'pieza',price:19,description:'Tapón roscado macho NPT',active:true},
  {id:'cc1',cat:'conexiones',spec:'cobre-con',name:'Codo 90° cobre soldable',size:'1/2"',unit:'pieza',price:23,description:'ASTM B-16, soldable',active:true},
  {id:'cc2',cat:'conexiones',spec:'cobre-con',name:'Codo 90° cobre soldable',size:'3/4"',unit:'pieza',price:37,description:'ASTM B-16',active:true},
  {id:'cc3',cat:'conexiones',spec:'cobre-con',name:'Codo 90° cobre soldable',size:'1"',unit:'pieza',price:60,description:'ASTM B-16',active:true},
  {id:'cc4',cat:'conexiones',spec:'cobre-con',name:'Tee cobre soldable',size:'1/2"',unit:'pieza',price:29,description:'ASTM B-16',active:true},
  {id:'cc5',cat:'conexiones',spec:'cobre-con',name:'Tee cobre soldable',size:'3/4"',unit:'pieza',price:47,description:'ASTM B-16',active:true},
  {id:'cc6',cat:'conexiones',spec:'cobre-con',name:'Adaptador macho cobre × rosca',size:'1/2"',unit:'pieza',price:31,description:'Soldable × NPT macho',active:true},
  {id:'cc7',cat:'conexiones',spec:'cobre-con',name:'Adaptador hembra cobre × rosca',size:'1/2"',unit:'pieza',price:29,description:'Soldable × NPT hembra',active:true},
  {id:'v01',cat:'valvulas',spec:'bola',name:'Válvula de bola paso completo',size:'1/2"',unit:'pieza',price:95,description:'Bronce, palanca, rosca NPT, PN 25',active:true},
  {id:'v02',cat:'valvulas',spec:'bola',name:'Válvula de bola paso completo',size:'3/4"',unit:'pieza',price:138,description:'Bronce, palanca, rosca NPT',active:true},
  {id:'v03',cat:'valvulas',spec:'bola',name:'Válvula de bola paso completo',size:'1"',unit:'pieza',price:198,description:'Bronce, palanca, rosca NPT',active:true},
  {id:'v04',cat:'valvulas',spec:'bola',name:'Válvula de bola paso completo',size:'1-1/4"',unit:'pieza',price:288,description:'Bronce, rosca NPT',active:true},
  {id:'v05',cat:'valvulas',spec:'bola',name:'Válvula de bola paso completo',size:'1-1/2"',unit:'pieza',price:385,description:'Bronce, rosca NPT',active:true},
  {id:'v06',cat:'valvulas',spec:'bola',name:'Válvula de bola paso completo',size:'2"',unit:'pieza',price:525,description:'Bronce, rosca NPT',active:true},
  {id:'v07',cat:'valvulas',spec:'cierre',name:'Válvula cierre rápido para aparato',size:'1/2"',unit:'pieza',price:148,description:'Latón, 1/4 vuelta, NPT',active:true},
  {id:'v08',cat:'valvulas',spec:'cierre',name:'Válvula cierre rápido para aparato',size:'3/4"',unit:'pieza',price:198,description:'Latón, 1/4 vuelta, NPT',active:true},
  {id:'v09',cat:'valvulas',spec:'aguja',name:'Válvula de aguja (needle)',size:'1/4"',unit:'pieza',price:225,description:'Regulación fina, acero inox',active:true},
  {id:'v10',cat:'valvulas',spec:'aguja',name:'Válvula de aguja (needle)',size:'1/2"',unit:'pieza',price:315,description:'Regulación fina, acero inox',active:true},
  {id:'v11',cat:'valvulas',spec:'check',name:'Válvula check (retención)',size:'1/2"',unit:'pieza',price:138,description:'Swing check, bronce, NPT',active:true},
  {id:'v12',cat:'valvulas',spec:'check',name:'Válvula check (retención)',size:'3/4"',unit:'pieza',price:188,description:'Swing check, bronce',active:true},
  {id:'r01',cat:'reguladores',spec:'1a',name:'Regulador 1ª etapa Gas LP',size:'Estándar',unit:'pieza',price:850,description:'Alta presión → media, 1 kg/cm²',active:true},
  {id:'r02',cat:'reguladores',spec:'1a',name:'Regulador 1ª etapa alta capacidad',size:'Industrial',unit:'pieza',price:1450,description:'Para batería de cilindros',active:true},
  {id:'r03',cat:'reguladores',spec:'2a',name:'Regulador 2ª etapa Gas LP',size:'Estándar',unit:'pieza',price:480,description:'Media → baja presión, 28 mbar',active:true},
  {id:'r04',cat:'reguladores',spec:'2a',name:'Regulador 2ª etapa alta capacidad',size:'Industrial',unit:'pieza',price:890,description:'Alta capacidad comercial/industrial',active:true},
  {id:'r05',cat:'reguladores',spec:'mono',name:'Regulador monobloque doméstico',size:'3/8" NPT',unit:'pieza',price:185,description:'Uso doméstico, entrada 3/8"',active:true},
  {id:'r06',cat:'reguladores',spec:'mono',name:'Regulador monobloque para aparatos',size:'1/2" NPT',unit:'pieza',price:248,description:'Calentadores, estufas industriales',active:true},
  {id:'r07',cat:'reguladores',spec:'ind',name:'Regulador industrial LP alta presión',size:'3/4" NPT',unit:'pieza',price:2800,description:'Alta demanda, acero inox',active:true},
  {id:'m01',cat:'mangueras',spec:'corrugado',name:'Conector flexible corrugado inox',size:'1/2" × 30cm',unit:'pieza',price:188,description:'Acero inox, conexión de aparatos',active:true},
  {id:'m02',cat:'mangueras',spec:'corrugado',name:'Conector flexible corrugado inox',size:'1/2" × 50cm',unit:'pieza',price:238,description:'Acero inox',active:true},
  {id:'m03',cat:'mangueras',spec:'corrugado',name:'Conector flexible corrugado inox',size:'1/2" × 80cm',unit:'pieza',price:298,description:'Acero inox',active:true},
  {id:'m04',cat:'mangueras',spec:'corrugado',name:'Conector flexible corrugado inox',size:'3/4" × 50cm',unit:'pieza',price:325,description:'Acero inox',active:true},
  {id:'m05',cat:'mangueras',spec:'hule',name:'Manguera hule Gas LP certificada',size:'3/8" × 1m',unit:'pieza',price:88,description:'Alta presión, con abrazaderas',active:true},
  {id:'m06',cat:'mangueras',spec:'hule',name:'Manguera hule Gas LP certificada',size:'1/2" × 1m',unit:'pieza',price:112,description:'Alta presión, con abrazaderas',active:true},
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = sb();

  if (req.method === 'GET') {
    let { data, error } = await db.from('catalog').select('*').eq('active', true).order('cat').order('id');
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) {
      const { error: e2 } = await db.from('catalog').insert(SEED);
      if (e2) return res.status(500).json({ error: e2.message });
      const { data: seeded } = await db.from('catalog').select('*').eq('active', true).order('cat').order('id');
      return res.status(200).json({ catalog: seeded || SEED });
    }
    return res.status(200).json({ catalog: data });
  }

  if (!isAdmin(req)) return res.status(401).json({ error: 'No autorizado' });

  if (req.method === 'PUT') {
    const { id, price, name, size, unit, description, active } = req.body;
    if (!id) return res.status(400).json({ error: 'Se requiere id' });
    const update = { updated_at: new Date().toISOString() };
    if (price !== undefined) update.price = price;
    if (name !== undefined) update.name = name;
    if (size !== undefined) update.size = size;
    if (unit !== undefined) update.unit = unit;
    if (description !== undefined) update.description = description;
    if (active !== undefined) update.active = active;
    const { data, error } = await db.from('catalog').update(update).eq('id', id).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ item: data });
  }

  if (req.method === 'POST') {
    const { data, error } = await db.from('catalog').insert(req.body).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ item: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

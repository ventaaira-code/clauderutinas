module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    name: 'COENERVGAS',
    short_name: 'COENERVGAS',
    description: 'Cotizador de materiales Gas LP · Salamanca, GTO',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: '#1a2d5a',
    background_color: '#1a2d5a',
    lang: 'es-MX',
    icons: [
      { src: '/api/icon?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/api/icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  });
};

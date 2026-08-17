#!/usr/bin/env node
'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── PNG ENCODER ──────────────────────────────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return (d) => { let c = 0xffffffff; for (const b of d) c = t[(c ^ b) & 0xff] ^ (c >>> 8); return c ^ 0xffffffff; };
})();

function chunk(type, data) {
  const tb = Buffer.from(type), len = Buffer.alloc(4), crcb = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crcb.writeUInt32BE(CRC(Buffer.concat([tb, data])) >>> 0);
  return Buffer.concat([len, tb, data, crcb]);
}

function encodePNG(width, height, pixels) { // pixels: Uint8Array RGBA
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0; // 8-bit RGBA

  // Filter rows (type 0 = None)
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (width * 4 + 1) + 1 + x * 4;
      raw[dst]   = pixels[src];
      raw[dst+1] = pixels[src+1];
      raw[dst+2] = pixels[src+2];
      raw[dst+3] = pixels[src+3];
    }
  }
  const idat = chunk('IDAT', zlib.deflateSync(raw, {level:9}));
  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, chunk('IEND', Buffer.alloc(0))]);
}

// ── DRAW HELPERS ─────────────────────────────────────────────────────────────
function makePixels(W, H) {
  const p = new Uint8Array(W * H * 4);
  const set = (x, y, r, g, b, a = 255) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    const fa = a / 255;
    p[i]   = Math.round(r * fa + p[i]   * (1 - fa));
    p[i+1] = Math.round(g * fa + p[i+1] * (1 - fa));
    p[i+2] = Math.round(b * fa + p[i+2] * (1 - fa));
    p[i+3] = 255;
  };

  // Fill background
  const fill = (r, g, b) => { for (let i = 0; i < W * H; i++) { p[i*4]=r; p[i*4+1]=g; p[i*4+2]=b; p[i*4+3]=255; } };

  // Thick arc (ring sector)
  const arc = (cx, cy, rIn, rOut, a0, a1, [r,g,b]) => {
    const steps = Math.ceil((a1 - a0) * rOut * 2);
    for (let s = 0; s <= steps; s++) {
      const a = a0 + (a1 - a0) * s / steps;
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let rr = rIn; rr <= rOut; rr += 0.4) set(cx + rr*ca, cy + rr*sa, r, g, b);
    }
  };

  // Line with round caps
  const line = (x1, y1, x2, y2, half, [r,g,b]) => {
    const dx = x2-x1, dy = y2-y1, len = Math.hypot(dx,dy)||1;
    const steps = Math.ceil(len * 3);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const mx = x1+dx*t, my = y1+dy*t;
      for (let dy2 = -half; dy2 <= half; dy2 += 0.5)
        for (let dx2 = -half; dx2 <= half; dx2 += 0.5)
          if (dx2*dx2+dy2*dy2 <= half*half) set(mx+dx2, my+dy2, r, g, b);
    }
  };

  // Filled polygon (scanline)
  const poly = (pts, [r,g,b]) => {
    let minY = Infinity, maxY = -Infinity;
    for (const [,y] of pts) { minY=Math.min(minY,y); maxY=Math.max(maxY,y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1,y1] = pts[i], [x2,y2] = pts[(i+1)%pts.length];
        if ((y1<=y&&y<y2)||(y2<=y&&y<y1)) xs.push(x1+(y-y1)/(y2-y1)*(x2-x1));
      }
      xs.sort((a,b)=>a-b);
      for (let j = 0; j < xs.length-1; j+=2)
        for (let x = Math.floor(xs[j]); x <= Math.ceil(xs[j+1]); x++) set(x, y, r, g, b);
    }
  };

  return { p, fill, set, arc, line, poly };
}

// ── ICON RENDERER ─────────────────────────────────────────────────────────────
function renderIcon(W) {
  const H = W;
  const { p, fill, arc, line, poly } = makePixels(W, H);

  const NAVY   = [26, 45, 90];
  const WHITE  = [255,255,255];
  const ORANGE = [249,115,22];

  fill(...NAVY);

  const cx = W * 0.49, cy = H * 0.49;
  const R    = W * 0.355;          // arc radius
  const tk   = W * 0.115;          // arc stroke thickness
  const rOut = R + tk/2, rIn = R - tk/2;
  const gapH = 47 * Math.PI/180;   // half-angle of right-side gap

  // C arc  (gap on the right, arc goes from top gap to bottom gap going left)
  const a0 = gapH, a1 = 2*Math.PI - gapH;
  arc(cx, cy, rIn, rOut, a0, a1, WHITE);

  // Tick marks at the two gap ends
  const tickLen = W * 0.09, tickH = tk * 0.35;
  // Top gap end → tick goes up-right
  const tx0 = cx + R * Math.cos(gapH),  ty0 = cy + R * Math.sin(gapH);
  const tx1 = tx0 + tickLen * Math.cos(gapH - 0.5), ty1 = ty0 + tickLen * Math.sin(gapH - 0.5);
  line(tx0, ty0, tx1, ty1, tickH, WHITE);
  // Bottom gap end → tick goes down-right
  const bx0 = cx + R * Math.cos(-gapH), by0 = cy + R * Math.sin(-gapH);
  const bx1 = bx0 + tickLen * Math.cos(-gapH + 0.5), by1 = by0 + tickLen * Math.sin(-gapH + 0.5);
  line(bx0, by0, bx1, by1, tickH, WHITE);

  // Flame (inside the C, slightly left of center)
  // Inspired by original SVG flame shape: teardrop going upward
  const fw = W * 0.095, fh = W * 0.28;
  const ffx = cx - W * 0.035, ffy = cy - fh * 0.08;
  const flamePoints = (s) => [
    // bottom point
    [ffx,         ffy + fh*0.38*s],
    // bottom-left
    [ffx - fw*0.55, ffy + fh*0.22*s],
    // left, going up
    [ffx - fw*0.85, ffy - fh*0.18*s],
    // top-left curve
    [ffx - fw*0.4,  ffy - fh*0.47*s],
    // top peak
    [ffx + fw*0.1,  ffy - fh*0.62*s],
    // inner notch (right side)
    [ffx + fw*0.35, ffy - fh*0.15*s],
    // inner kink
    [ffx + fw*0.6,  ffy - fh*0.35*s],
    // upper-right
    [ffx + fw*0.7,  ffy + fh*0.08*s],
    // right
    [ffx + fw*0.8,  ffy + fh*0.3*s],
    // bottom-right
    [ffx + fw*0.35, ffy + fh*0.38*s],
  ];
  poly(flamePoints(1), ORANGE);

  return encodePNG(W, H, p);
}

// ── GENERATE & SAVE ───────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

[512, 192, 180, 167, 152].forEach(size => {
  const buf = renderIcon(size);
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, buf);
  console.log(`✓ icons/icon-${size}.png (${buf.length} bytes)`);
});

console.log('Done.');

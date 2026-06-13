const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const BG = '#1a1a2e';
  const AMBER = '#F59E0B';
  const DARK = '#1a1a2e';
  const r = size * 0.2;

  // Rounded background
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.arcTo(size, 0, size, r, r);
  ctx.lineTo(size, size - r);
  ctx.arcTo(size, size, size - r, size, r);
  ctx.lineTo(r, size);
  ctx.arcTo(0, size, 0, size - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fill();

  // Amber circle
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // SR text
  ctx.fillStyle = DARK;
  ctx.font = `bold ${Math.round(size * 0.25)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SR', size / 2, size / 2 + size * 0.01);

  return canvas.toBuffer('image/png');
}

SIZES.forEach((size) => {
  const buf = drawIcon(size);
  const out = path.join(ICONS_DIR, `icon-${size}.png`);
  fs.writeFileSync(out, buf);
  console.log(`✓ icon-${size}.png`);
});

console.log('All icons generated.');

/**
 * OG Card Generator
 *
 * Composites a 1200x630 social-sharing card from a portrait + SVG text overlay.
 * Output: /public/og-card.png
 *
 * Run: npm run generate-og
 */

import sharp from 'sharp';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SOURCE = path.join(PUBLIC_DIR, 'archive', 'img-070.jpg');
const OUT = path.join(PUBLIC_DIR, 'og-card.png');

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3D342B" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="#3D342B" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#3D342B" stop-opacity="0.1"/>
    </linearGradient>
    <linearGradient id="bottomFade" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#3D342B" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#3D342B" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  <rect width="${W}" height="${H}" fill="url(#bottomFade)"/>

  <!-- Eyebrow chip -->
  <g transform="translate(70, 90)">
    <rect x="0" y="0" rx="22" ry="22" width="280" height="44" fill="#FDF6E3" fill-opacity="0.12" stroke="#FDF6E3" stroke-opacity="0.25"/>
    <circle cx="22" cy="22" r="4" fill="#E5C575"/>
    <text x="40" y="29" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" font-weight="900" fill="#FDF6E3" letter-spacing="3.5">ARSIP VISUAL</text>
  </g>

  <!-- Title -->
  <text x="70" y="290" font-family="'Playfair Display', 'Times New Roman', serif" font-size="120" font-weight="900" fill="#FDF6E3" letter-spacing="-4">Armeniaca<tspan fill="#8B4040">.</tspan></text>

  <!-- Subtitle -->
  <text x="74" y="350" font-family="'Helvetica Neue', Arial, sans-serif" font-size="26" font-weight="700" fill="#FDF6E3" fill-opacity="0.85" letter-spacing="0.5">Arsip Visual Helisma Putri — Eli JKT48</text>

  <!-- Lead description -->
  <text x="74" y="395" font-family="'Helvetica Neue', Arial, sans-serif" font-size="20" font-weight="400" fill="#FDF6E3" fill-opacity="0.65">Dari Generasi 7 hingga era Team Dream JKT48 Fight 2026.</text>

  <!-- Bottom row -->
  <g transform="translate(70, ${H - 70})">
    <line x1="0" y1="0" x2="60" y2="0" stroke="#C9A961" stroke-width="2"/>
    <text x="80" y="6" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" font-weight="900" fill="#FDF6E3" fill-opacity="0.8" letter-spacing="4">VINZRYYYSAGA.COM · #BLOOMINSPRING</text>
  </g>
</svg>`;

async function main() {
  console.log('Composing 1200x630 OG card from', SOURCE);

  // Use the portrait as a 60% right-side band (subject visible),
  // letting the gradient SVG cover the left 60% for the title block.
  const portraitWidth = Math.round(W * 0.55);
  const portraitBuffer = await sharp(SOURCE)
    .resize({ width: portraitWidth, height: H, fit: 'cover', position: 'top' })
    .toBuffer();

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: 61, g: 52, b: 43 },
    },
  })
    .composite([
      { input: portraitBuffer, top: 0, left: W - portraitWidth },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  console.log('✔ Wrote', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

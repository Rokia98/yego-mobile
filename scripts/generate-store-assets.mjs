// Génère les visuels de la fiche Play Store (icône + bannière), à partir du
// même tracé d'épingle que scripts/generate-assets.mjs (source de vérité :
// public/assets/yego_icon.svg). Ces fichiers ne font pas partie de l'app
// elle-même (store-assets/, hors app.json) — uniquement pour l'upload manuel
// sur Play Console.
//   node scripts/generate-store-assets.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const sortie = join(racine, 'store-assets');

const ORANGE = '#E67E22';
const SOMBRE = '#2C3E50';
const BLANC = '#FFFFFF';

function epingle({ routeStroke = SOMBRE } = {}) {
  return `
    <path d="M55 0 C 25 0, 0 24, 0 55 C 0 95, 55 118, 55 118 C 55 118, 110 95, 110 55 C 110 24, 85 0, 55 0 Z" fill="${ORANGE}"/>
    <circle cx="55" cy="52" r="30" fill="${BLANC}"/>
    <path d="M30 60 C 42 40, 68 40, 80 60" stroke="${routeStroke}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="60" r="5" fill="${routeStroke}"/>
    <circle cx="80" cy="60" r="5" fill="${routeStroke}"/>`;
}

function epingleAt(x, y, largeurPin, opts) {
  const echelle = largeurPin / 110;
  const hauteurPin = 118 * echelle;
  return `<g transform="translate(${x - largeurPin / 2} ${y - hauteurPin / 2}) scale(${echelle})">${epingle(opts)}</g>`;
}

// Icône Play Store : 512×512, pleine, fond sombre (même style que l'icône app).
const icone512 = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${SOMBRE}"/>
  ${epingleAt(256, 256, 270)}
</svg>`;

// Bannière 1024×500 : épingle à gauche, nom + accroche à droite, fond sombre.
const banniere = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${SOMBRE}"/>
  ${epingleAt(200, 250, 220)}
  <text x="380" y="245" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="800" fill="${BLANC}">Y<tspan fill="${ORANGE}">è</tspan>go</text>
  <text x="382" y="300" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="400" fill="#C7CFD6">Toute la Côte d'Ivoire</text>
</svg>`;

await mkdir(sortie, { recursive: true });

await sharp(Buffer.from(icone512)).png().toFile(join(sortie, 'play-icon-512.png'));
console.log('✓ play-icon-512.png (512×512)');

await sharp(Buffer.from(banniere)).png().toFile(join(sortie, 'feature-graphic-1024x500.png'));
console.log('✓ feature-graphic-1024x500.png (1024×500)');

console.log('\nFichiers écrits dans', sortie);

// Génère les PNG d'icône / splash à partir du logo vectoriel Yègo.
// Source de vérité : public/assets/yego_icon.svg (épingle route).
// Lancer :  node scripts/generate-assets.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const sortie = join(racine, 'assets');

const ORANGE = '#E67E22';
const SOMBRE = '#2C3E50';
const BLANC = '#FFFFFF';

// L'épingle dans sa boîte locale 110 × 118.
function epingle({ routeStroke = SOMBRE } = {}) {
  return `
    <path d="M55 0 C 25 0, 0 24, 0 55 C 0 95, 55 118, 55 118 C 55 118, 110 95, 110 55 C 110 24, 85 0, 55 0 Z" fill="${ORANGE}"/>
    <circle cx="55" cy="52" r="30" fill="${BLANC}"/>
    <path d="M30 60 C 42 40, 68 40, 80 60" stroke="${routeStroke}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="60" r="5" fill="${routeStroke}"/>
    <circle cx="80" cy="60" r="5" fill="${routeStroke}"/>`;
}

// Place l'épingle centrée dans un carré `taille`, à `largeurPin` de large.
function epingleCentree(taille, largeurPin, opts) {
  const echelle = largeurPin / 110;
  const hauteurPin = 118 * echelle;
  const tx = (taille - largeurPin) / 2;
  const ty = (taille - hauteurPin) / 2;
  return `<g transform="translate(${tx} ${ty}) scale(${echelle})">${epingle(opts)}</g>`;
}

function svgCarre(taille, fond, contenu) {
  const rect = fond ? `<rect width="${taille}" height="${taille}" fill="${fond}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}">${rect}${contenu}</svg>`;
}

const cibles = [
  // Icône iOS + repli : pleine, fond sombre, coins non arrondis (l'OS masque).
  { nom: 'icon.png', taille: 1024, svg: (t) => svgCarre(t, SOMBRE, epingleCentree(t, 540)) },
  // Android adaptatif (premier plan) : épingle seule, transparent, dans la zone sûre.
  { nom: 'adaptive-icon.png', taille: 1024, svg: (t) => svgCarre(t, null, epingleCentree(t, 430)) },
  // Splash : épingle seule, transparente, centrée par le plugin sur fond sombre.
  { nom: 'splash-icon.png', taille: 1024, svg: (t) => svgCarre(t, null, epingleCentree(t, 384)) },
  // Favicon web.
  { nom: 'favicon.png', taille: 64, svg: (t) => svgCarre(t, SOMBRE, epingleCentree(t, 40)) },
];

await mkdir(sortie, { recursive: true });
for (const c of cibles) {
  const chemin = join(sortie, c.nom);
  await sharp(Buffer.from(c.svg(c.taille))).png().toFile(chemin);
  console.log('✓', c.nom, `(${c.taille}×${c.taille})`);
}
console.log('\nAssets écrits dans', sortie);

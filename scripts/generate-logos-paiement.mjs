// Rasterise les marques des opérateurs mobile money en PNG carrés homogènes
// pour l'écran de paiement.
// Sources (public/paiements/) :
//  - orange-money.svg : icône « double flèche » du logo Orange Money officiel
//    (chemins extraits de commons.wikimedia.org/wiki/File:Logo_Orange_Money.svg)
//  - MTN_Logo.svg     : logo officiel MTN (Wikimedia Commons)
//  - moov.png         : logo « Moov Money / Flooz » officiel (Wikimedia Commons, 512px)
//  - wave.jpg         : logo Wave officiel (pingouin sur fond bleu)
// Sortie : assets/paiements/*.png
// Lancer : node scripts/generate-logos-paiement.mjs  (ou npm run assets:logos)
import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(RACINE, 'public/paiements');
const OUT = resolve(RACINE, 'assets/paiements');
const TAILLE = 120; // rendu ~40px @3x

const SOURCES = [
  { entree: 'orange-money.svg', sortie: 'orange.png', marge: 4 },
  { entree: 'MTN_Logo.svg', sortie: 'mtn.png', marge: 0 },
  { entree: 'moov.png', sortie: 'moov-money.png', marge: 10 },
  { entree: 'wave.jpg', sortie: 'wave.png', marge: 0 },
];

await mkdir(OUT, { recursive: true });
for (const { entree, sortie, marge } of SOURCES) {
  const buffer = await readFile(resolve(SRC, entree));
  const dispo = TAILLE - marge * 2;
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  await sharp(buffer, { density: 384 })
    .resize(dispo, dispo, { fit: 'contain', background: transparent })
    .extend({ top: marge, bottom: marge, left: marge, right: marge, background: transparent })
    .png()
    .toFile(resolve(OUT, sortie));
  console.log('✓', sortie);
}
console.log('\nLogos écrits dans', OUT);

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// L'API stocke `Utilisateur.photoUrl` en `data:image/jpeg;base64,...` (pas de
// stockage fichier côté serveur) — limite 40 Ko une fois décodé. On redimensionne
// et compresse l'image choisie jusqu'à tenir dans ce budget, par paliers.
const LIMITE_OCTETS_DECODES = 40 * 1024;

const PALIERS: { taille: number; qualite: number }[] = [
  { taille: 256, qualite: 0.6 },
  { taille: 200, qualite: 0.5 },
  { taille: 160, qualite: 0.45 },
  { taille: 128, qualite: 0.4 },
  { taille: 96, qualite: 0.35 },
];

function tailleDecodee(base64: string): number {
  const paddage = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - paddage;
}

// `uri` : image déjà recadrée en carré par le sélecteur (ImagePicker `aspect:[1,1]`).
// Renvoie une data URI JPEG prête pour `PATCH /utilisateurs/:id { photoUrl }`.
export async function photoProfilPourApi(uri: string): Promise<string> {
  for (const { taille, qualite } of PALIERS) {
    const resultat = await manipulateAsync(uri, [{ resize: { width: taille, height: taille } }], {
      compress: qualite,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (resultat.base64 && tailleDecodee(resultat.base64) <= LIMITE_OCTETS_DECODES) {
      return `data:image/jpeg;base64,${resultat.base64}`;
    }
  }
  throw new Error('photo-trop-grande');
}

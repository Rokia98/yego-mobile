// Téléphone : l'utilisateur saisit / voit un numéro local ivoirien (10 chiffres,
// ex. « 07 01 02 03 04 »). L'indicatif +225 est ajouté au moment de l'appel API.
// L'API (≥ 0.22.0) normalise de toute façon vers E.164 `+225XXXXXXXXXX` — envoyer
// `+225` + chiffres est idempotent avec cette normalisation ET valide avant 0.22.0.

const INDICATIF = '+225';

// Ne garde que les chiffres, plafonné à 10 (numéro local CI). Tolère un collage
// au format international : on retire l'indicatif 225 en tête si présent.
export function chiffresTelephone(saisie: string): string {
  let d = saisie.replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('225')) d = d.slice(3);
  return d.slice(0, 10);
}

// Numéros CI actuels = 10 chiffres. On tolère 8–10 le temps que les comptes de
// test / seed (format 9 chiffres hérité) migrent.
export function estTelephoneValide(saisie: string): boolean {
  const n = chiffresTelephone(saisie).length;
  return n >= 8 && n <= 10;
}

// « 0701020304 » → « 07 01 02 03 04 » (groupes de 2).
export function formatTelephone(saisie: string): string {
  return chiffresTelephone(saisie)
    .replace(/(\d{2})(?=\d)/g, '$1 ')
    .trim();
}

// Forme envoyée à l'API : E.164 Côte d'Ivoire.
export function telephonePourApi(saisie: string): string {
  return `${INDICATIF}${chiffresTelephone(saisie)}`;
}

// Pour un champ neuf (ex. « numéro qui paie » Jèko) où l'API exige strictement
// +225 + 01/05/07 + 8 chiffres (pas la tolérance 8-10 de estTelephoneValide,
// qui n'existe que pour les comptes historiques à 9 chiffres).
export function estTelephonePayeurValide(saisie: string): boolean {
  return /^(01|05|07)\d{8}$/.test(chiffresTelephone(saisie));
}

// Valeur renvoyée par l'API (E.164 `+225…`) → affichage local « 07 01 02 03 04 ».
export function formatTelephoneAffichage(valeur: string | null | undefined): string {
  if (!valeur) return '—';
  const local = valeur.replace(/^\+?225/, '');
  return formatTelephone(local) || valeur;
}

export { INDICATIF as INDICATIF_TELEPHONE };

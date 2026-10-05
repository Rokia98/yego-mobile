// Décodage NON vérifié du payload d'un JWT, pour une seule chose : savoir
// immédiatement après connexion/restauration si le compte a un mot de passe
// temporaire (claim `pwTmp`), sans attendre un premier appel qui échouerait
// en 403. La sécurité réelle reste entièrement côté serveur, qui revérifie
// ce même claim à chaque requête protégée — une erreur de décodage ici ne
// fait que retarder l'affichage de l'écran forcé jusqu'au prochain 403.
const CARACTERES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decoderBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  let buffer = 0;
  let bits = 0;
  let sortie = '';
  for (const ch of b64) {
    const val = CARACTERES.indexOf(ch);
    if (val === -1) continue; // padding '=' ou caractère inattendu, ignoré
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      sortie += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return sortie;
}

export function pwTmpDepuisJeton(accessToken: string): boolean {
  try {
    const partie = accessToken.split('.')[1];
    if (!partie) return false;
    const payload = JSON.parse(decoderBase64Url(partie)) as { pwTmp?: boolean };
    return payload.pwTmp === true;
  } catch {
    return false;
  }
}

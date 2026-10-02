import { api } from './client';
import type { Utilisateur } from './types';

export function monProfil(id: number): Promise<Utilisateur> {
  return api.get<Utilisateur>(`/utilisateurs/${id}`).then((r) => r.data);
}

// `photoUrl` : URL http(s) ou data URI base64 (image ≤ 40 Ko décodée — voir
// src/photoProfil.ts qui prépare la valeur avant l'appel).
// Champ OMIS = inchangé ; `photoUrl: null` explicite = retire la photo (le serveur
// distingue les deux — ne pas envoyer `null` par erreur pour un champ qu'on ne
// touche pas).
export function modifierProfil(
  id: number,
  champs: { nom?: string; email?: string; motDePasse?: string; photoUrl?: string | null },
): Promise<Utilisateur> {
  return api.patch<Utilisateur>(`/utilisateurs/${id}`, champs).then((r) => r.data);
}

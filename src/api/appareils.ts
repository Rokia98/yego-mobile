import { api } from './client';

// Enregistrement de l'appareil pour les notifications push (Firebase Cloud
// Messaging). Le back-end associe le jeton au voyageur connecté ; un jeton
// rejeté par FCM est purgé côté serveur. `plateforme` : 'android' | 'ios'.
export type PlateformeAppareil = 'android' | 'ios' | 'web';

export function enregistrerAppareil(
  token: string,
  plateforme: PlateformeAppareil,
): Promise<void> {
  return api.post('/notifications/appareils', { token, plateforme }).then(() => undefined);
}

export function retirerAppareil(token: string): Promise<void> {
  // axios : le corps d'un DELETE passe par l'option `data`.
  return api.delete('/notifications/appareils', { data: { token } }).then(() => undefined);
}

import { Linking } from 'react-native';
import { emitRetourPaiement } from './api/events';

// Retour depuis la page de paiement Jèko : `yego://paiement?statut=succes|echec
// &reservationId=123&reference=YEGO-P..`. On ne fait QUE déclencher une
// vérification immédiate (voir PaiementScreen) — jamais confiance en `statut`
// pour afficher un succès : seule l'API (POST .../verifier) fait foi.
//
// Ne fonctionne pas dans Expo Go (schéma personnalisé non routé) — dégrade
// sans erreur : le polling déjà en place dans PaiementScreen prend le relais.
function traiterUrl(url: string | null): void {
  if (!url) return;
  // `url` peut venir de n'importe où (une autre appli, un lien SMS/QR code) —
  // jamais fiable. `decodeURIComponent` lève sur un `%` mal formé : tout le
  // bloc est protégé pour qu'une URL corrompue ne fasse jamais planter l'appli.
  try {
    // Analyse manuelle plutôt que `URL` (support incertain selon le moteur JS
    // embarqué) : "yego://paiement?reservationId=123&..." → chemin + requête.
    const [avantQuery, query = ''] = url.split('?');
    const chemin = avantQuery.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^\/+|\/+$/g, '');
    if (chemin !== 'paiement') return;

    const params = new Map<string, string>();
    for (const paire of query.split('&')) {
      if (!paire) continue;
      const [cle, valeur = ''] = paire.split('=');
      params.set(decodeURIComponent(cle), decodeURIComponent(valeur));
    }

    const reservationId = Number(params.get('reservationId'));
    if (Number.isFinite(reservationId)) emitRetourPaiement(reservationId);
  } catch {
    // URL mal formée : on l'ignore, le polling dans PaiementScreen reste le
    // mécanisme fiable de toute façon.
  }
}

export function installerEcouteurRetourPaiement(): () => void {
  Linking.getInitialURL().then(traiterUrl);
  const abonnement = Linking.addEventListener('url', ({ url }) => traiterUrl(url));
  return () => abonnement.remove();
}

// Un mini bus d'événements pour deux cas simples qui n'ont pas besoin de Redux :
// - la session tombée (refresh révoqué) → renvoyer vers l'écran de connexion ;
// - le retour depuis la page de paiement de l'opérateur (deep link) → si
//   l'écran Paiement de cette réservation est monté, relancer une vérification
//   tout de suite au lieu d'attendre le prochain tick du polling.

type Ecouteur = () => void;

const ecouteurs = new Set<Ecouteur>();

export function onLogout(fn: Ecouteur): () => void {
  ecouteurs.add(fn);
  return () => ecouteurs.delete(fn);
}

export function emitLogout(): void {
  ecouteurs.forEach((fn) => fn());
}

type EcouteurRetourPaiement = (reservationId: number) => void;

const ecouteursRetourPaiement = new Set<EcouteurRetourPaiement>();

export function onRetourPaiement(fn: EcouteurRetourPaiement): () => void {
  ecouteursRetourPaiement.add(fn);
  return () => ecouteursRetourPaiement.delete(fn);
}

export function emitRetourPaiement(reservationId: number): void {
  ecouteursRetourPaiement.forEach((fn) => fn(reservationId));
}

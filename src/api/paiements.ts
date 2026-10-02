import { api } from './client';
import type { MoyenPaiement, Paiement } from './types';

// L'app choisit un moyen de paiement, jamais un montant. Le montant est
// recalculé côté serveur (prix du trajet × places).
// `telephonePayeur` (E.164) : numéro Mobile Money qui encaisse réellement ;
// optionnel, par défaut le téléphone du compte côté serveur (Jèko, 0.28.0).
export function initierPaiement(
  reservationId: number,
  moyenPaiement: MoyenPaiement,
  telephonePayeur?: string,
): Promise<Paiement> {
  return api
    .post<Paiement>('/paiements', { reservationId, moyenPaiement, telephonePayeur })
    .then((r) => r.data);
}

export function statutPaiement(reservationId: number): Promise<Paiement> {
  return api
    .get<Paiement>(`/paiements/reservation/${reservationId}`)
    .then((r) => r.data);
}

// Interroge Jèko pour de vrai (pas seulement notre base) — une redirection
// « succès » de l'opérateur n'est pas une preuve de paiement, il faut vérifier.
// N'existe que lorsque l'encaissement réel est actif ; en simulation, `statutPaiement`
// (lu depuis notre base, mise à jour par /simuler ou le webhook) suffit.
export function verifierPaiement(reservationId: number): Promise<Paiement> {
  return api
    .post<Paiement>(`/paiements/reservation/${reservationId}/verifier`)
    .then((r) => r.data);
}

// DEV UNIQUEMENT — force le résultat d'un paiement en attente sans opérateur réel.
// L'endpoint n'existe côté serveur que si PAYMENT_SIMULATION=true (jamais en prod,
// jamais non plus quand Jèko est actif).
export function simulerPaiement(
  reservationId: number,
  resultat: 'succes' | 'echec',
): Promise<Paiement> {
  return api
    .post<Paiement>(`/paiements/reservation/${reservationId}/simuler`, { resultat })
    .then((r) => r.data);
}

// Attend que le statut passe à 'paye' en lisant notre base (webhook / simulation).
// Passer un `signal` pour arrêter le polling quand l'écran se ferme.
export async function attendrePaiement(
  reservationId: number,
  {
    intervalMs = 3000,
    timeoutMs = 120000,
    signal,
  }: { intervalMs?: number; timeoutMs?: number; signal?: { annule: boolean } } = {},
): Promise<Paiement> {
  const fin = Date.now() + timeoutMs;
  while (Date.now() < fin) {
    if (signal?.annule) throw new Error('paiement-annule');
    const data = await statutPaiement(reservationId);
    if (data.statut === 'paye') return data;
    if (data.statut === 'echoue') throw new Error('paiement-echoue');
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('paiement-timeout');
}

// Même logique, mais en interrogeant réellement Jèko à chaque tour (flux
// redirection/USSD). Cadence recommandée par l'API : ~5 s, 2-3 min max.
export async function verifierPaiementRepete(
  reservationId: number,
  {
    intervalMs = 5000,
    timeoutMs = 170000,
    signal,
  }: { intervalMs?: number; timeoutMs?: number; signal?: { annule: boolean } } = {},
): Promise<Paiement> {
  const fin = Date.now() + timeoutMs;
  while (Date.now() < fin) {
    if (signal?.annule) throw new Error('paiement-annule');
    const data = await verifierPaiement(reservationId);
    if (data.statut === 'paye') return data;
    if (data.statut === 'echoue') throw new Error('paiement-echoue');
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('paiement-timeout');
}

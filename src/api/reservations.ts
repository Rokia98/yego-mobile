import { api } from './client';
import type { Reservation, Remboursement } from './types';

// Le voyageur réserve pour lui-même. La réservation naît `confirmee` mais NON
// payée — enchaîner tout de suite sur le paiement (fenêtre de 30 min).
// `sieges` (facultatif) : un numéro par place, choisi avant le paiement ; le
// serveur renvoie 409 si un siège est déjà pris.
export function reserver(
  departId: number,
  nombrePlaces: number,
  sieges?: string[],
): Promise<Reservation> {
  return api
    .post<Reservation>('/reservations', { departId, nombrePlaces, sieges })
    .then((r) => r.data);
}

export function mesReservations(skip = 0, take = 20): Promise<Reservation[]> {
  return api
    .get<Reservation[]>('/reservations', { params: { skip, take } })
    .then((r) => r.data);
}

export function reservation(id: number): Promise<Reservation> {
  return api.get<Reservation>(`/reservations/${id}`).then((r) => r.data);
}

export function annuler(
  id: number,
): Promise<Reservation & { remboursement: Remboursement | null }> {
  return api
    .patch<Reservation & { remboursement: Remboursement | null }>(
      `/reservations/${id}/annuler`,
    )
    .then((r) => r.data);
}

import { api } from './client';
import type { Remboursement } from './types';

// Statut du remboursement d'une réservation annulée (pas de remboursement
// en cours → 404, remonté comme `null`).
export function remboursementDeReservation(reservationId: number): Promise<Remboursement | null> {
  return api
    .get<Remboursement>(`/remboursements/reservation/${reservationId}`)
    .then((r) => r.data)
    .catch((e) => {
      if (e?.response?.status === 404) return null;
      throw e;
    });
}

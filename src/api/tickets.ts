import { api } from './client';
import type { BilletScanne, Ticket } from './types';

// Conditions serveur : réservation `confirmee`, paiement `paye`, et moins de
// tickets que de places. Omettre `siege` laisse le placement libre.
export function genererTicket(reservationId: number, siege?: string): Promise<Ticket> {
  return api
    .post<Ticket>(`/tickets/reservation/${reservationId}`, { siege })
    .then((r) => r.data);
}

export function ticketsDeLaReservation(reservationId: number): Promise<Ticket[]> {
  return api
    .get<Ticket[]>(`/tickets/reservation/${reservationId}`)
    .then((r) => r.data);
}

// Tous mes tickets (cloisonné côté serveur).
export function mesTickets(skip = 0, take = 50): Promise<Ticket[]> {
  return api.get<Ticket[]>('/tickets', { params: { skip, take } }).then((r) => r.data);
}

// Agent : valider un billet à l'embarquement.
export function validerTicket(codeQr: string): Promise<{ valide: boolean; message?: string }> {
  return api.post(`/tickets/valider/${encodeURIComponent(codeQr)}`).then((r) => r.data);
}

// Agent : historique des scans à l'embarquement (ses propres scans ;
// company_admin → toute la compagnie). Trié par date de scan décroissante.
export function billetsScannes(skip = 0, take = 40): Promise<BilletScanne[]> {
  return api
    .get<BilletScanne[]>('/tickets/validations', { params: { skip, take } })
    .then((r) => r.data);
}

// Génère les tickets manquants (un par place) puis renvoie la liste complète.
// Borne le nombre de tentatives : si le serveur refuse d'en créer davantage
// (paiement non confirmé, départ parti…), on rend ce qui existe.
export async function garantirTickets(
  reservationId: number,
  nombrePlaces: number,
): Promise<Ticket[]> {
  let tickets = await ticketsDeLaReservation(reservationId);
  let tentatives = nombrePlaces + 2;
  while (tickets.length < nombrePlaces && tentatives-- > 0) {
    const avant = tickets.length;
    await genererTicket(reservationId);
    tickets = await ticketsDeLaReservation(reservationId);
    if (tickets.length === avant) break;
  }
  return tickets;
}

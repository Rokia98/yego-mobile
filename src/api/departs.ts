import { api } from './client';
import type { DepartResultat, PointSuivi, SiegesDepart, SuiviDepart } from './types';

// Route publique — pas de jeton requis. Ne renvoie que les départs réellement
// vendables. date au format YYYY-MM-DD ; avec dateFin, `date` devient le début
// d'une plage.
export function rechercherDeparts(p: {
  depart: string;
  arrivee: string;
  date: string;
  dateFin?: string;
}): Promise<DepartResultat[]> {
  return api
    .get<DepartResultat[]>('/departs/recherche', { params: p })
    .then((r) => r.data);
}

// Plan de salle : capacité du véhicule + numéros de sièges déjà attribués.
// Route publique (consultable avant de réserver).
export function siegesDepart(departId: number): Promise<SiegesDepart> {
  return api.get<SiegesDepart>(`/departs/${departId}/sieges`).then((r) => r.data);
}

// Suivi GPS temps réel du véhicule. Réservé au voyageur ayant une réservation
// sur ce départ. Poller ~10-15 s tant que `statut === 'en_route'`.
export function suiviDepart(departId: number): Promise<SuiviDepart> {
  return api.get<SuiviDepart>(`/departs/${departId}/suivi`).then((r) => r.data);
}

// Trace des positions (polyline). `depuis` = ISO date, `limite` = nb de points.
export function suiviHistorique(
  departId: number,
  opts: { depuis?: string; limite?: number } = {},
): Promise<PointSuivi[]> {
  return api
    .get<{ points: PointSuivi[] }>(`/departs/${departId}/suivi/historique`, { params: opts })
    .then((r) => r.data.points);
}

// Agent : départs de sa compagnie à proposer avant de scanner (écran de
// sélection du départ). `du`/`au` au format YYYY-MM-DD — passer la veille à
// `du` couvre les cars de nuit embarqués après minuit (même règle que le
// contrôle de date côté serveur sur /tickets/valider). Route publique (pas de
// garde sur GET /departs), mais `compagnieId` scope déjà le résultat.
export function departsCompagnie(
  compagnieId: number,
  du: string,
  au: string,
): Promise<DepartResultat[]> {
  return api
    .get<DepartResultat[]>('/departs', { params: { compagnieId, du, au, ordre: 'asc', take: 50 } })
    .then((r) => r.data);
}

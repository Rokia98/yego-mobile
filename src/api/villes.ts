import { api } from './client';
import type { Ville } from './types';

let cache: Ville[] | null = null;

export async function chargerVilles(): Promise<Ville[]> {
  if (cache) return cache;
  const { data } = await api.get<Ville[]>('/villes');
  cache = data;
  return data;
}

// Renvoie une fonction id → nom (les listes de réservations ne renvoient que les IDs).
export async function tableVilles(): Promise<(id: number | undefined) => string> {
  const villes = await chargerVilles();
  const map = new Map(villes.map((v) => [v.id, v.nom]));
  return (id) => (id != null ? map.get(id) ?? '—' : '—');
}

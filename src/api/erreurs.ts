import { AxiosError } from 'axios';

// Toutes les erreurs de l'API suivent un format unique. Le `message` est parfois
// un tableau (erreurs de validation champ par champ).
export function extraireMessage(e: unknown): string {
  const reponse = (e as AxiosError<{ message?: string | string[] }>).response;
  const m = reponse?.data?.message;
  if (Array.isArray(m)) return m[0];
  if (m) return m;
  if (reponse?.status === 429) return 'Trop de tentatives. Réessayez dans une minute.';
  return 'Une erreur est survenue. Réessayez.';
}

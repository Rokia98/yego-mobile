import { api, setAccessToken } from './client';
import { secure } from './secure';
import { retirerAppareil } from './appareils';
import { preferences } from '../storage';
import type { Session } from './types';

async function etablirSession(data: Session) {
  setAccessToken(data.accessToken);
  await secure.setRefresh(data.refreshToken);
}

export async function connexion(telephone: string, motDePasse: string): Promise<Session> {
  const { data } = await api.post<Session>('/auth/login', { telephone, motDePasse });
  await etablirSession(data);
  return data;
}

export async function inscription(
  nom: string,
  telephone: string,
  motDePasse: string,
  email?: string,
): Promise<Session> {
  const { data } = await api.post<Session>('/auth/register', {
    nom,
    telephone,
    motDePasse,
    email,
  });
  await etablirSession(data);
  return data;
}

// Au lancement de l'app : il n'y a pas d'access token stocké — seulement le
// refresh. S'il existe, on le convertit en session neuve.
export async function restaurerSession(): Promise<Session | null> {
  const refreshToken = await secure.getRefresh();
  if (!refreshToken) return null;
  try {
    const { data } = await api.post<Session>('/auth/refresh', { refreshToken });
    await etablirSession(data);
    return data;
  } catch {
    await secure.clear();
    return null;
  }
}

export async function deconnexion(): Promise<void> {
  // Retirer l'appareil des notifications push tant qu'on est encore authentifié.
  const jetonPush = await preferences.jetonPush();
  if (jetonPush) {
    await retirerAppareil(jetonPush).catch(() => {});
    await preferences.effacerJetonPush();
  }

  const refreshToken = await secure.getRefresh();
  if (refreshToken) {
    await api.post('/auth/logout', { refreshToken }).catch(() => {});
  }
  setAccessToken(null);
  await secure.clear();

  // Données locales propres à CE compte : sur un appareil partagé (prêté,
  // guichet), la personne suivante à se connecter ne doit hériter ni de la
  // photo de profil ni des recherches de quelqu'un d'autre.
  await preferences.effacerPhotoLocale();
  await preferences.effacerRecherchesRecentes();
}

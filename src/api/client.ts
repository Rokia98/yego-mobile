import axios from 'axios';
import { API_BASE_URL } from '../config';
import { secure } from './secure';
import { emitLogout, emitMotDePasseRequis } from './events';

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// --- Rafraîchissement automatique de l'access token -------------------------
// L'access token expire en 15 min. Au premier 401, on le renouvelle en silence,
// une seule fois, et on rejoue la requête. Un seul refresh concurrent.

let refreshEnCours: Promise<string> | null = null;

async function rafraichir(): Promise<string> {
  const refreshToken = await secure.getRefresh();
  if (!refreshToken) throw new Error('no-refresh');
  // axios "nu" : ne pas repasser par les intercepteurs.
  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
  setAccessToken(data.accessToken);
  await secure.setRefresh(data.refreshToken); // le refresh CHANGE à chaque fois
  return data.accessToken;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const estAuth = original?.url?.includes('/auth/');

    // Mot de passe temporaire (0.29.0) : toute route protégée peut renvoyer ce
    // 403, sauf PATCH /auth/mot-de-passe, POST /auth/logout-all et
    // GET /utilisateurs/:id — l'app bascule sur l'écran de changement forcé.
    if (error.response?.status === 403 && error.response?.data?.code === 'MOT_DE_PASSE_A_CHANGER') {
      emitMotDePasseRequis();
    }

    if (error.response?.status !== 401 || original?._retry || estAuth || !original) {
      throw error;
    }
    original._retry = true;

    try {
      refreshEnCours =
        refreshEnCours ??
        rafraichir().finally(() => {
          refreshEnCours = null;
        });
      const token = await refreshEnCours;
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      setAccessToken(null);
      await secure.clear();
      emitLogout(); // le navigateur renvoie vers l'écran de connexion
      throw error;
    }
  },
);

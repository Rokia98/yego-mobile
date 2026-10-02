import { api } from './client';
import type { Notification } from './types';

// Fil de notifications consultable dans l'app (pastille du menu, écran dédié).
// Le canal push (Firebase) est géré à part : src/notifications/push.ts +
// src/api/appareils.ts (enregistrement du jeton de l'appareil).
export const notifications = {
  liste: (nonLu = false) =>
    api
      .get<Notification[]>('/notifications', { params: { nonLu } })
      .then((r) => r.data),
  compteur: () =>
    api
      .get<{ nonLues: number }>('/notifications/compteur')
      .then((r) => r.data.nonLues),
  marquerLu: (id: number) => api.patch(`/notifications/${id}/lu`),
  toutLu: () => api.patch('/notifications/lu'),
};

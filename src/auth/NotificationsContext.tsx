import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { notifications as notifApi } from '../api/notifications';
import { enregistrerAppareil } from '../api/appareils';
import {
  ajouterEcouteurReception,
  ajouterEcouteurReponse,
  obtenirJetonPush,
  reponseAuDemarrage,
} from '../notifications/push';
import { routerDepuisNotification } from '../navigation/ref';
import { preferences } from '../storage';
import { useAuth } from './AuthContext';

type NotificationsContextValue = {
  nonLues: number;
  rafraichir: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [nonLues, setNonLues] = useState(0);

  const rafraichir = useCallback(async () => {
    if (!session) {
      setNonLues(0);
      return;
    }
    try {
      setNonLues(await notifApi.compteur());
    } catch {
      // silencieux
    }
  }, [session]);

  useEffect(() => {
    rafraichir();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') rafraichir();
    });
    return () => sub.remove();
  }, [rafraichir]);

  // --- Notifications push (Firebase) ---------------------------------------
  // À la connexion : enregistrer le jeton de l'appareil auprès de l'API.
  useEffect(() => {
    if (!session) return;
    let annule = false;
    (async () => {
      const jeton = await obtenirJetonPush();
      if (annule || !jeton) return;
      try {
        await enregistrerAppareil(jeton.token, jeton.plateforme);
        await preferences.definirJetonPush(jeton.token);
      } catch {
        // best-effort : le fil in-app reste consultable sans push
      }
    })();
    return () => {
      annule = true;
    };
  }, [session]);

  // Réception au premier plan → mettre à jour la pastille.
  // Tap sur une notification → router vers l'écran concerné.
  useEffect(() => {
    if (!session) return;
    const recu = ajouterEcouteurReception(() => rafraichir());
    const reponse = ajouterEcouteurReponse((donnees) => {
      rafraichir();
      routerDepuisNotification(donnees);
    });
    reponseAuDemarrage().then((donnees) => {
      if (donnees) routerDepuisNotification(donnees);
    });
    return () => {
      recu.remove();
      reponse.remove();
    };
  }, [session, rafraichir]);

  const value = useMemo(() => ({ nonLues, rafraichir }), [nonLues, rafraichir]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications doit être utilisé dans <NotificationsProvider>');
  return ctx;
}

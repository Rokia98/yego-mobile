import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { onLogout, onMotDePasseRequis } from '../api/events';
import { preferences } from '../storage';
import { pwTmpDepuisJeton } from '../jwt';
import type { Session } from '../api/types';

type AuthContextValue = {
  session: Session | null;
  chargement: boolean;
  onboardingVu: boolean;
  // Compte à mot de passe temporaire (créé par un tiers) : tant que c'est
  // `true`, AppNavigator force l'écran de changement de mot de passe, quel
  // que soit le rôle — l'API refuse (403) toute autre route protégée.
  motDePasseRequis: boolean;
  connexion: (telephone: string, motDePasse: string) => Promise<void>;
  inscription: (nom: string, telephone: string, motDePasse: string, email?: string) => Promise<void>;
  changerMotDePasse: (ancienMotDePasse: string, nouveauMotDePasse: string) => Promise<void>;
  deconnexion: () => Promise<void>;
  terminerOnboarding: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [chargement, setChargement] = useState(true);
  const [onboardingVu, setOnboardingVu] = useState(true);
  const [motDePasseRequis, setMotDePasseRequis] = useState(false);

  // Centralise la mise à jour de session + du flag dérivé du JWT (claim
  // `pwTmp`), pour ne jamais les désynchroniser (connexion/inscription/
  // restauration passent tous par ici).
  const appliquerSession = useCallback((s: Session | null) => {
    setSession(s);
    setMotDePasseRequis(s ? pwTmpDepuisJeton(s.accessToken) : false);
  }, []);

  useEffect(() => {
    Promise.all([authApi.restaurerSession(), preferences.onboardingVu()])
      .then(([s, vu]) => {
        appliquerSession(s);
        setOnboardingVu(vu);
      })
      .catch(() => appliquerSession(null))
      .finally(() => setChargement(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => onLogout(() => appliquerSession(null)), [appliquerSession]);

  // Filet de sécurité si le flag du JWT n'avait pas (encore) capté `pwTmp`
  // (ex. mot de passe temporaire imposé par un admin en cours de session) :
  // le premier 403 { code: 'MOT_DE_PASSE_A_CHANGER' } rencontré bascule l'écran.
  useEffect(() => onMotDePasseRequis(() => setMotDePasseRequis(true)), []);

  const connexion = useCallback(
    async (telephone: string, motDePasse: string) => {
      appliquerSession(await authApi.connexion(telephone, motDePasse));
    },
    [appliquerSession],
  );

  const inscription = useCallback(
    async (nom: string, telephone: string, motDePasse: string, email?: string) => {
      appliquerSession(await authApi.inscription(nom, telephone, motDePasse, email));
    },
    [appliquerSession],
  );

  const changerMotDePasse = useCallback(async (ancienMotDePasse: string, nouveauMotDePasse: string) => {
    const jetons = await authApi.changerMotDePasse(ancienMotDePasse, nouveauMotDePasse);
    setSession((s) => (s ? { ...s, ...jetons } : s));
    setMotDePasseRequis(false);
  }, []);

  const deconnexion = useCallback(async () => {
    await authApi.deconnexion();
    appliquerSession(null);
  }, [appliquerSession]);

  const terminerOnboarding = useCallback(() => {
    setOnboardingVu(true);
    preferences.marquerOnboardingVu();
  }, []);

  const value = useMemo(
    () => ({
      session,
      chargement,
      onboardingVu,
      motDePasseRequis,
      connexion,
      inscription,
      changerMotDePasse,
      deconnexion,
      terminerOnboarding,
    }),
    [
      session,
      chargement,
      onboardingVu,
      motDePasseRequis,
      connexion,
      inscription,
      changerMotDePasse,
      deconnexion,
      terminerOnboarding,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}

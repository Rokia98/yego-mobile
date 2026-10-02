import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { onLogout } from '../api/events';
import { preferences } from '../storage';
import type { Session } from '../api/types';

type AuthContextValue = {
  session: Session | null;
  chargement: boolean;
  onboardingVu: boolean;
  connexion: (telephone: string, motDePasse: string) => Promise<void>;
  inscription: (nom: string, telephone: string, motDePasse: string, email?: string) => Promise<void>;
  deconnexion: () => Promise<void>;
  terminerOnboarding: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [chargement, setChargement] = useState(true);
  const [onboardingVu, setOnboardingVu] = useState(true);

  useEffect(() => {
    Promise.all([authApi.restaurerSession(), preferences.onboardingVu()])
      .then(([s, vu]) => {
        setSession(s);
        setOnboardingVu(vu);
      })
      .catch(() => setSession(null))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => onLogout(() => setSession(null)), []);

  const connexion = useCallback(async (telephone: string, motDePasse: string) => {
    setSession(await authApi.connexion(telephone, motDePasse));
  }, []);

  const inscription = useCallback(
    async (nom: string, telephone: string, motDePasse: string, email?: string) => {
      setSession(await authApi.inscription(nom, telephone, motDePasse, email));
    },
    [],
  );

  const deconnexion = useCallback(async () => {
    await authApi.deconnexion();
    setSession(null);
  }, []);

  const terminerOnboarding = useCallback(() => {
    setOnboardingVu(true);
    preferences.marquerOnboardingVu();
  }, []);

  const value = useMemo(
    () => ({
      session,
      chargement,
      onboardingVu,
      connexion,
      inscription,
      deconnexion,
      terminerOnboarding,
    }),
    [session, chargement, onboardingVu, connexion, inscription, deconnexion, terminerOnboarding],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}

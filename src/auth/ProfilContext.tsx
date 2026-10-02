import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { monProfil } from '../api/utilisateurs';
import { useAuth } from './AuthContext';
import type { Utilisateur } from '../api/types';

type ProfilContextValue = {
  profil: Utilisateur | null;
  chargement: boolean;
  rafraichir: () => Promise<void>;
};

const ProfilContext = createContext<ProfilContextValue | null>(null);

export function ProfilProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [profil, setProfil] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(false);

  const rafraichir = useCallback(async () => {
    if (!session) return;
    setChargement(true);
    try {
      setProfil(await monProfil(session.utilisateurId));
    } catch {
      // silencieux : la barre haute retombe sur le numéro de téléphone
    } finally {
      setChargement(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) rafraichir();
    else setProfil(null);
  }, [session, rafraichir]);

  const value = useMemo(
    () => ({ profil, chargement, rafraichir }),
    [profil, chargement, rafraichir],
  );

  return <ProfilContext.Provider value={value}>{children}</ProfilContext.Provider>;
}

export function useProfil(): ProfilContextValue {
  const ctx = useContext(ProfilContext);
  if (!ctx) throw new Error('useProfil doit être utilisé dans <ProfilProvider>');
  return ctx;
}

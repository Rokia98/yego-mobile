import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { preferences } from '../storage';
import { fr, en, type Dictionnaire } from './dictionnaires';
import type { Locale } from '../format';

export type Langue = 'fr' | 'en';

const DICTIONNAIRES: Record<Langue, Dictionnaire> = { fr, en };
const LOCALES: Record<Langue, Locale> = { fr: 'fr-FR', en: 'en-US' };

type LangueContextValue = {
  langue: Langue;
  t: Dictionnaire;
  definirLangue: (l: Langue) => void;
  /** locale pour Intl / toLocaleDateString / src/format.ts */
  locale: Locale;
};

const LangueContext = createContext<LangueContextValue | null>(null);

// Marché pilote francophone (Côte d'Ivoire) : français par défaut tant que
// l'utilisateur n'a pas choisi anglais.
export function LangueProvider({ children }: { children: React.ReactNode }) {
  const [langue, setLangue] = useState<Langue>('fr');

  useEffect(() => {
    preferences.langue().then((sauvegardee) => {
      if (sauvegardee) setLangue(sauvegardee);
    });
  }, []);

  const definirLangue = (l: Langue) => {
    setLangue(l);
    preferences.definirLangue(l);
  };

  const value = useMemo<LangueContextValue>(
    () => ({
      langue,
      t: DICTIONNAIRES[langue],
      definirLangue,
      locale: LOCALES[langue],
    }),
    [langue],
  );

  return <LangueContext.Provider value={value}>{children}</LangueContext.Provider>;
}

export function useLangue(): LangueContextValue {
  const ctx = useContext(LangueContext);
  if (!ctx) throw new Error('useLangue doit être utilisé dans <LangueProvider>');
  return ctx;
}

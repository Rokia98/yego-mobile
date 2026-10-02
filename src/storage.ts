import * as SecureStore from 'expo-secure-store';
import type { RechercheRecente } from './api/types';

// Petites préférences locales (non sensibles) — on réutilise le stockage
// sécurisé, déjà en place, pour éviter une dépendance de plus.
const CLE_ONBOARDING = 'yego.onboarding_vu';
const CLE_RECENTS = 'yego.recherches_recentes';
const CLE_JETON_PUSH = 'yego.jeton_push';
const CLE_LANGUE = 'yego.langue';
const CLE_PHOTO_LOCALE = 'yego.photo_locale';
const MAX_RECENTS = 4;

export const preferences = {
  async onboardingVu(): Promise<boolean> {
    try {
      return (await SecureStore.getItemAsync(CLE_ONBOARDING)) === '1';
    } catch {
      return false;
    }
  },
  async marquerOnboardingVu(): Promise<void> {
    try {
      await SecureStore.setItemAsync(CLE_ONBOARDING, '1');
    } catch {
      // sans persistance, l'onboarding se réaffichera au prochain lancement — acceptable
    }
  },

  async recherchesRecentes(): Promise<RechercheRecente[]> {
    try {
      const brut = await SecureStore.getItemAsync(CLE_RECENTS);
      return brut ? (JSON.parse(brut) as RechercheRecente[]) : [];
    } catch {
      return [];
    }
  },
  async ajouterRechercheRecente(r: RechercheRecente): Promise<RechercheRecente[]> {
    const actuelles = await preferences.recherchesRecentes();
    const dedoublonnees = actuelles.filter(
      (x) => !(x.depart === r.depart && x.arrivee === r.arrivee),
    );
    const liste = [r, ...dedoublonnees].slice(0, MAX_RECENTS);
    try {
      await SecureStore.setItemAsync(CLE_RECENTS, JSON.stringify(liste));
    } catch {
      // non bloquant
    }
    return liste;
  },
  async effacerRecherchesRecentes(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(CLE_RECENTS);
    } catch {
      // non bloquant
    }
  },

  // Dernier jeton push enregistré côté serveur — conservé pour pouvoir le
  // retirer à la déconnexion (l'appel a besoin du jeton, pas de la session).
  async jetonPush(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(CLE_JETON_PUSH);
    } catch {
      return null;
    }
  },
  async definirJetonPush(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(CLE_JETON_PUSH, token);
    } catch {
      // non bloquant
    }
  },
  async effacerJetonPush(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(CLE_JETON_PUSH);
    } catch {
      // non bloquant
    }
  },

  // Langue de l'interface (FR/EN), persistée sur l'appareil.
  async langue(): Promise<'fr' | 'en' | null> {
    try {
      const v = await SecureStore.getItemAsync(CLE_LANGUE);
      return v === 'en' ? 'en' : v === 'fr' ? 'fr' : null;
    } catch {
      return null;
    }
  },
  async definirLangue(langue: 'fr' | 'en'): Promise<void> {
    try {
      await SecureStore.setItemAsync(CLE_LANGUE, langue);
    } catch {
      // non bloquant
    }
  },

  // Photo de profil : aperçu optimiste le temps de l'envoi vers l'API (qui
  // stocke `photoUrl` de façon définitive — voir src/api/utilisateurs.ts).
  // Propre à cet appareil : effacé à la déconnexion pour ne pas fuiter vers
  // le prochain compte utilisé sur un appareil partagé.
  async photoLocale(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(CLE_PHOTO_LOCALE);
    } catch {
      return null;
    }
  },
  async definirPhotoLocale(uri: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(CLE_PHOTO_LOCALE, uri);
    } catch {
      // non bloquant
    }
  },
  async effacerPhotoLocale(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(CLE_PHOTO_LOCALE);
    } catch {
      // non bloquant
    }
  },
};

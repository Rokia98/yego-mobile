import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { pushIndisponibleEnExpoGo } from './push';

// Notification « persistante » de suivi du trajet, visible quand l'utilisateur
// quitte l'application (à la manière de Yango). Android : notification `ongoing`
// dans un canal discret. iOS : notification simple (les Live Activities
// nécessitent un module natif dédié — piste d'évolution).

const ID = 'yego-suivi-en-cours';
const CANAL = 'suivi-trajet';

let canalPret = false;

async function prepararCanal(nomCanal: string) {
  if (Platform.OS !== 'android' || canalPret) return;
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: nomCanal,
    importance: Notifications.AndroidImportance.LOW, // silencieux, non intrusif
    showBadge: false,
    enableVibrate: false,
  });
  canalPret = true;
}

export type InfoSuivi = {
  /** titre déjà traduit et formaté, ex. "Trajet en cours · Korhogo → Abidjan" (voir t.suivi.notifTitre) */
  titre: string;
  departId: number;
  ligne: string; // « Arrivée ~19:48 · 120 km » ou « Signal perdu », déjà traduit
  /** nom du canal Android (catégorie stable, ex. "Trajet en cours" / "Trip in progress") */
  nomCanal: string;
};

// Crée / met à jour la notification de suivi (même identifiant → remplacement).
export async function majNotificationSuivi(info: InfoSuivi): Promise<void> {
  if (pushIndisponibleEnExpoGo) return;
  try {
    await prepararCanal(info.nomCanal);
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: {
        title: info.titre,
        body: info.ligne,
        data: { type: 'depart.suivi', departId: info.departId },
        sticky: true, // Android : setOngoing(true)
        autoDismiss: false,
        ...(Platform.OS === 'android' ? { color: '#E67E22' } : {}),
      },
      trigger: Platform.OS === 'android' ? { channelId: CANAL } : null,
    });
  } catch {
    // best-effort
  }
}

export async function arreterNotificationSuivi(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(ID);
    await Notifications.cancelScheduledNotificationAsync(ID);
  } catch {
    // best-effort
  }
}

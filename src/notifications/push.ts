import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { PlateformeAppareil } from '../api/appareils';

// --- Comportement à la réception (app au premier plan) ----------------------
// Le fil in-app reste la source de vérité ; on affiche quand même une bannière
// et on laisse le badge se mettre à jour.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// Expo Go (SDK 53+) ne peut plus recevoir de push distant : il faut un build
// de développement ou de production. On détecte ce cas pour dégrader en silence.
export const pushIndisponibleEnExpoGo =
  Constants.executionEnvironment === 'storeClient';

const CANAL_ANDROID = 'default';

async function preparerCanalAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Général',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#F26A21',
  });
}

export type JetonPush = { token: string; plateforme: PlateformeAppareil };

// Demande la permission puis renvoie le jeton natif de l'appareil (FCM sur
// Android, APNs sur iOS). `null` si l'appareil ne peut pas en fournir
// (simulateur, Expo Go, permission refusée, erreur SDK).
export async function obtenirJetonPush(): Promise<JetonPush | null> {
  if (pushIndisponibleEnExpoGo || !Device.isDevice) return null;

  try {
    await preparerCanalAndroid();

    const actuelle = await Notifications.getPermissionsAsync();
    let statut = actuelle.status;
    if (statut !== 'granted' && actuelle.canAskAgain) {
      statut = (await Notifications.requestPermissionsAsync()).status;
    }
    if (statut !== 'granted') return null;

    const { data } = await Notifications.getDevicePushTokenAsync();
    if (!data || typeof data !== 'string' || data.length < 20) return null;

    return { token: data, plateforme: Platform.OS === 'ios' ? 'ios' : 'android' };
  } catch {
    return null;
  }
}

export const ajouterEcouteurReception = (cb: () => void) =>
  Notifications.addNotificationReceivedListener(cb);

export const ajouterEcouteurReponse = (
  cb: (donnees: Record<string, unknown>) => void,
) =>
  Notifications.addNotificationResponseReceivedListener((reponse) => {
    const donnees = reponse.notification.request.content.data;
    cb((donnees ?? {}) as Record<string, unknown>);
  });

// Notification ayant lancé l'app depuis un état tué (retourne les données à router).
export async function reponseAuDemarrage(): Promise<Record<string, unknown> | null> {
  const derniere = await Notifications.getLastNotificationResponseAsync();
  const donnees = derniere?.notification.request.content.data;
  return donnees ? (donnees as Record<string, unknown>) : null;
}

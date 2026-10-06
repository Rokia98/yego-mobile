import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Port sur lequel tourne l'API Yègo en local (voir yego-api/.env → PORT).
const PORT_API_DEV = 3000;

// En dev, on vise la même machine que celle qui sert le bundle Metro :
// Expo connaît son IP LAN (hostUri = "192.168.x.x:8081"), on réutilise cet hôte
// avec le port de l'API. Fonctionne sur appareil physique, émulateur et simulateur
// sans rien configurer à la main.
function hoteDev(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    (Constants.linkingUri ? Constants.linkingUri.split('://')[1] : undefined);

  const ip = hostUri?.split(':')[0];
  if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
    return `http://${ip}:${PORT_API_DEV}`;
  }
  // Repli : émulateur Android → 10.0.2.2, simulateur iOS → localhost.
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${PORT_API_DEV}`
    : `http://localhost:${PORT_API_DEV}`;
}

// API déployée (Render) — remplace l'ancien tunnel ngrok. Sert de secours en
// dev (voir EXPO_PUBLIC_API_URL dans .env.example) et de valeur de prod tant
// qu'aucun domaine propre n'est en place.
const API_URL_PROD = 'https://yego-api.onrender.com/api/v1';

// Priorité : variable d'environnement explicite > détection auto en dev > prod.
const depuisEnv = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL = depuisEnv ?? (__DEV__ ? `${hoteDev()}/api/v1` : API_URL_PROD);

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[Yègo] API_BASE_URL =', API_BASE_URL);
}

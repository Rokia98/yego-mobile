import * as SecureStore from 'expo-secure-store';

// Le refresh token vit dans le trousseau ; l'access token peut rester en mémoire.
const CLE_REFRESH = 'yego.refresh';

export const secure = {
  getRefresh: () => SecureStore.getItemAsync(CLE_REFRESH),
  setRefresh: (t: string) => SecureStore.setItemAsync(CLE_REFRESH, t),
  clear: () => SecureStore.deleteItemAsync(CLE_REFRESH),
};

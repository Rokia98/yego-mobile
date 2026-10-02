import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { useAuth } from '../auth/AuthContext';
import { useLangue } from '../i18n';
import { COLORS } from '../theme';

// Écran affiché à la place du flux voyageur pour un compte qui n'a rien à
// faire dans cette app (gestionnaire de compagnie, administrateur plateforme —
// ces rôles opèrent depuis le back-office web). Sans ça, ces comptes retombaient
// silencieusement sur les onglets voyageur (recherche/réservation/paiement),
// ce qui n'a pas de sens pour eux et n'était pas voulu.
export default function AccesRestreintScreen() {
  const { deconnexion } = useAuth();
  const { t } = useLangue();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contenu}>
        <Logo size={36} />
        <View style={styles.icone}>
          <Ionicons name="business-outline" size={30} color={COLORS.orange} />
        </View>
        <Text style={styles.titre}>{t.accesRestreint.titre}</Text>
        <Text style={styles.texte}>{t.accesRestreint.texte}</Text>
        <Button
          titre={t.accesRestreint.seDeconnecter}
          icone="log-out-outline"
          variante="secondaire"
          pleineLargeur={false}
          onPress={() => deconnexion()}
          style={styles.bouton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contenu: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  icone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  titre: { fontSize: 19, fontWeight: '800', color: COLORS.dark, textAlign: 'center' },
  texte: { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  bouton: { marginTop: 6 },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import PressableScale from './PressableScale';
import { useAuth } from '../auth/AuthContext';
import { useProfil } from '../auth/ProfilContext';
import { useNotifications } from '../auth/NotificationsContext';
import { COLORS, RADIUS } from '../theme';

// Bandeau foncé commun aux écrans d'onglet : titre + cloche + avatar.
export default function HeroHeader({
  titre,
  sousTitre,
  actions = true,
  children,
}: {
  titre: string;
  sousTitre?: string | null;
  /** afficher la cloche + l'avatar (par défaut oui) */
  actions?: boolean;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<{ navigate: (n: string) => void }>();
  const { session } = useAuth();
  const { profil } = useProfil();
  const { nonLues } = useNotifications();
  const nom = profil?.nom ?? session?.telephone;

  return (
    <View style={[styles.bande, { paddingTop: insets.top + 8 }]}>
      <View style={styles.haut}>
        <View style={styles.titreBloc}>
          <Text style={styles.titre} numberOfLines={1}>
            {titre}
          </Text>
          {sousTitre ? (
            <Text style={styles.sousTitre} numberOfLines={1}>
              {sousTitre}
            </Text>
          ) : null}
        </View>

        {actions && (
          <View style={styles.actions}>
            <PressableScale
              onPress={() => navigation.navigate('Notifications')}
              haptique
              style={styles.cloche}
            >
              <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
              {nonLues > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTexte}>{nonLues > 9 ? '9+' : nonLues}</Text>
                </View>
              )}
            </PressableScale>
            <PressableScale onPress={() => navigation.navigate('Profil')} haptique>
              <Avatar nom={nom} taille={36} ton="sombre" />
            </PressableScale>
          </View>
        )}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bande: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  haut: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titreBloc: { flex: 1 },
  titre: { fontSize: 24, fontWeight: '800', color: COLORS.white },
  sousTitre: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cloche: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.orange,
    borderWidth: 2,
    borderColor: COLORS.dark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeTexte: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
});

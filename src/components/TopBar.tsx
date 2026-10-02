import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Logo from './Logo';
import Avatar from './Avatar';
import PressableScale from './PressableScale';
import { useAuth } from '../auth/AuthContext';
import { useProfil } from '../auth/ProfilContext';
import { useNotifications } from '../auth/NotificationsContext';
import { COLORS } from '../theme';

// Barre haute commune : logo à gauche, cloche + avatar à droite.
export default function TopBar() {
  const navigation = useNavigation<{ navigate: (n: string) => void }>();
  const { session } = useAuth();
  const { profil } = useProfil();
  const { nonLues } = useNotifications();
  const nom = profil?.nom ?? session?.telephone;

  return (
    <View style={styles.barre}>
      <Logo size={26} />
      <View style={styles.droite}>
        <PressableScale onPress={() => navigation.navigate('Notifications')} haptique style={styles.cloche}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.dark} />
          {nonLues > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeTexte}>{nonLues > 9 ? '9+' : nonLues}</Text>
            </View>
          )}
        </PressableScale>
        <PressableScale onPress={() => navigation.navigate('Profil')} haptique style={styles.avatar}>
          <Avatar nom={nom} taille={36} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
  },
  droite: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cloche: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.orange,
    borderWidth: 2,
    borderColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeTexte: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
  avatar: { borderRadius: 18 },
});

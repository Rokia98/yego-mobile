import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '../theme';

// Panneau qui glisse depuis le bas. Tap sur le fond = fermeture.
export default function BottomSheet({
  visible,
  titre,
  onClose,
  children,
}: {
  visible: boolean;
  titre?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.fond}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.fondTouche} onPress={onClose} />
        <Pressable style={styles.feuille} onPress={() => {}}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.poignee} />
            {titre ? <Text style={styles.titre}>{titre}</Text> : null}
            {children}
          </SafeAreaView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: 'rgba(20,32,27,0.35)', justifyContent: 'flex-end' },
  fondTouche: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  feuille: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  poignee: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  titre: { fontSize: 16, fontWeight: '800', color: COLORS.dark, textAlign: 'center', marginBottom: 12 },
});

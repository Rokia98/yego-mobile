import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../theme';
import Button from '../../components/Button';
import TopBar from '../../components/TopBar';
import { validerTicket } from '../../api/tickets';
import { extraireMessage } from '../../api/erreurs';
import { useLangue } from '../../i18n';
import { vibrer } from '../../haptics';

type Resultat = { valide: boolean; message: string };

export default function ValiderScreen() {
  const { t } = useLangue();
  const [permission, demanderPermission] = useCameraPermissions();
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const dernierCode = useRef<string | null>(null);

  async function onScan(codeQr: string) {
    if (enCours || resultat || codeQr === dernierCode.current) return;
    dernierCode.current = codeQr;
    setEnCours(true);
    try {
      const r = await validerTicket(codeQr);
      if (r.valide) vibrer.succes();
      else vibrer.erreur();
      setResultat({
        valide: r.valide,
        message: r.message ?? (r.valide ? t.agent.billetValide : t.agent.billetRefuse),
      });
    } catch (e) {
      vibrer.erreur();
      setResultat({ valide: false, message: extraireMessage(e) });
    } finally {
      setEnCours(false);
    }
  }

  function scannerSuivant() {
    dernierCode.current = null;
    setResultat(null);
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.page} edges={['top']}>
        <TopBar />
        <View style={styles.centre}>
          <ActivityIndicator color={COLORS.orange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.page} edges={['top']}>
        <TopBar />
        <View style={styles.centre}>
          <Ionicons name="camera-outline" size={48} color={COLORS.grayClair} />
          <Text style={styles.permTitre}>{t.agent.accesCameraTitre}</Text>
          <Text style={styles.permTexte}>{t.agent.accesCameraTexte}</Text>
          <Button titre={t.agent.autoriserCamera} onPress={demanderPermission} pleineLargeur={false} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <TopBar />
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={resultat ? undefined : ({ data }) => onScan(data)}
        />
        <SafeAreaView style={styles.overlay} edges={['bottom']}>
          <Text style={styles.consigne}>{t.agent.placezQr}</Text>

        <View style={styles.cadreZone}>
          <View
            style={[
              styles.cadre,
              resultat?.valide === true && styles.cadreOk,
              resultat?.valide === false && styles.cadreKo,
            ]}
          />
          {enCours && <ActivityIndicator color={COLORS.white} style={styles.spinner} size="large" />}
        </View>

        <View style={styles.bas}>
          {resultat ? (
            <View style={[styles.resultat, resultat.valide ? styles.resultatOk : styles.resultatKo]}>
              <Ionicons
                name={resultat.valide ? 'checkmark-circle' : 'close-circle'}
                size={30}
                color={COLORS.white}
              />
              <Text style={styles.resultatTexte}>{resultat.message}</Text>
              <Button titre={t.agent.scannerSuivant} onPress={scannerSuivant} />
            </View>
          ) : (
            <Text style={styles.astuce}>{t.agent.scanAutomatique}</Text>
          )}
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  centre: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  permTitre: { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginTop: 6 },
  permTexte: { fontSize: 14, color: COLORS.gray, textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  consigne: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
  },
  cadreZone: { alignItems: 'center', justifyContent: 'center' },
  cadre: {
    width: 240,
    height: 240,
    borderRadius: RADIUS.xl,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  cadreOk: { borderColor: COLORS.green },
  cadreKo: { borderColor: COLORS.danger },
  spinner: { position: 'absolute' },
  bas: { minHeight: 90, justifyContent: 'flex-end' },
  astuce: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: 13 },
  resultat: { borderRadius: RADIUS.lg, padding: 18, alignItems: 'center', gap: 10 },
  resultatOk: { backgroundColor: COLORS.green },
  resultatKo: { backgroundColor: COLORS.danger },
  resultatTexte: { color: COLORS.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});

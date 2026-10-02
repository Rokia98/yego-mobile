import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ProfilProvider } from './src/auth/ProfilContext';
import { NotificationsProvider } from './src/auth/NotificationsContext';
import { LangueProvider } from './src/i18n';
import AppNavigator from './src/navigation/AppNavigator';
import BrandSplash from './src/components/BrandSplash';
import { installerEcouteurRetourPaiement } from './src/paiementRetour';
import { DUREE } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const DUREE_SPLASH_MIN = 1500;

function Racine() {
  const { chargement } = useAuth();
  const [tempsEcoule, setTempsEcoule] = useState(false);
  const [splashMonte, setSplashMonte] = useState(true);
  const opacite = useRef(new Animated.Value(1)).current;

  // Laisse le splash natif la main jusqu'au premier rendu JS (même visuel).
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Retour depuis la page de paiement de l'opérateur (deep link `yego://paiement…`).
  useEffect(() => installerEcouteurRetourPaiement(), []);

  useEffect(() => {
    const t = setTimeout(() => setTempsEcoule(true), DUREE_SPLASH_MIN);
    return () => clearTimeout(t);
  }, []);

  const pret = !chargement && tempsEcoule;

  useEffect(() => {
    if (!pret) return;
    Animated.timing(opacite, {
      toValue: 0,
      duration: DUREE.long,
      useNativeDriver: true,
    }).start(() => setSplashMonte(false));
  }, [pret, opacite]);

  return (
    <>
      <StatusBar style={splashMonte ? 'light' : 'dark'} />
      <AppNavigator />
      {splashMonte && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacite }]} pointerEvents="none">
          <BrandSplash />
        </Animated.View>
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LangueProvider>
        <AuthProvider>
          <ProfilProvider>
            <NotificationsProvider>
              <Racine />
            </NotificationsProvider>
          </ProfilProvider>
        </AuthProvider>
      </LangueProvider>
    </SafeAreaProvider>
  );
}

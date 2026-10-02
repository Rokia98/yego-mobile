import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Logo from './Logo';
import { COLORS } from '../theme';

// Écran de marque affiché au démarrage (pendant la restauration de session).
export default function BrandSplash() {
  const apparition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(apparition, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [apparition]);

  return (
    <View style={styles.conteneur}>
      <Animated.View
        style={{
          opacity: apparition,
          transform: [
            {
              scale: apparition.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
            },
          ],
        }}
      >
        <Logo size={56} tone="sombre" />
        <Text style={styles.tagline}>Voyagez léger.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    backgroundColor: COLORS.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 14,
    marginTop: 14,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

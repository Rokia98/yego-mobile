import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Easing } from 'react-native';

// Point « en direct » : un noyau plein + un halo qui pulse en boucle.
export default function PulseDot({ couleur, taille = 8 }: { couleur: string; taille?: number }) {
  const onde = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const boucle = Animated.loop(
      Animated.timing(onde, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    boucle.start();
    return () => boucle.stop();
  }, [onde]);

  return (
    <View style={[styles.zone, { width: taille * 2.6, height: taille * 2.6 }]}>
      <Animated.View
        style={[
          styles.halo,
          {
            width: taille * 2.6,
            height: taille * 2.6,
            borderRadius: taille * 1.3,
            backgroundColor: couleur,
            opacity: onde.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
            transform: [{ scale: onde.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }],
          },
        ]}
      />
      <View
        style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: couleur }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  zone: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
});

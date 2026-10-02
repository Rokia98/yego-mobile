import React, { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { DUREE } from '../theme';

// Apparition douce (fondu + léger glissement) au montage.
export default function FadeIn({
  children,
  delai = 0,
  depuis = 8,
  style,
}: {
  children: React.ReactNode;
  delai?: number;
  depuis?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: DUREE.moyen,
      delay: delai,
      useNativeDriver: true,
    }).start();
  }, [t, delai]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [depuis, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

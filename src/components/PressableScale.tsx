import React, { useRef } from 'react';
import { Animated, Pressable, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import { vibrer } from '../haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** échelle atteinte pendant l'appui */
  echelle?: number;
  /** retour haptique au relâchement */
  haptique?: boolean;
  /** opacité appliquée quand `disabled` (par défaut 0.45) */
  opaciteDesactive?: number;
  children: React.ReactNode;
};

// Zone tactile avec micro-animation d'échelle — le style passé s'applique bien
// à l'élément pressable lui-même (il participe donc au layout : flex, width…).
export default function PressableScale({
  style,
  echelle = 0.97,
  haptique = false,
  opaciteDesactive = 0.45,
  disabled,
  onPress,
  children,
  ...reste
}: Props) {
  const valeur = useRef(new Animated.Value(1)).current;

  const anim = (vers: number) =>
    Animated.spring(valeur, {
      toValue: vers,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => anim(echelle)}
      onPressOut={() => anim(1)}
      onPress={(e) => {
        if (haptique) vibrer.leger();
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale: valeur }], opacity: disabled ? opaciteDesactive : 1 }]}
      {...reste}
    >
      {children}
    </AnimatedPressable>
  );
}

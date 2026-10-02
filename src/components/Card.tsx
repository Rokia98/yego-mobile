import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../theme';

export default function Card({
  children,
  style,
  ombre = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  ombre?: boolean;
}) {
  return <View style={[styles.card, ombre && SHADOW, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16 },
});

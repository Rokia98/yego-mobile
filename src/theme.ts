import { Platform } from 'react-native';

export const COLORS = {
  orange: '#E67E22',
  orangeSombre: '#CF6F1C',
  orangeWash: '#FBEBDD',
  dark: '#2C3E50',
  darkSombre: '#22303D',
  background: '#F5F6F7',
  white: '#FFFFFF',
  gray: '#7F8C8D',
  grayClair: '#AEB6B7',
  border: '#E5E7EB',
  green: '#27AE60',
  greenWash: '#DFF5E7',
  danger: '#C0392B',
};

export const RADIUS = { sm: 10, md: 12, lg: 16, xl: 20, pill: 999 };

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const SHADOW = Platform.select({
  ios: {
    shadowColor: '#1E2A36',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  android: { elevation: 3 },
  default: {},
});

export const DUREE = { court: 150, moyen: 240, long: 420 };

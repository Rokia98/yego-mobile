import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './AppNavigator';
import type { TabParamList } from './TabNavigator';
import type { AgentTabParamList } from './AgentNavigator';

// Un écran d'onglet peut aussi naviguer vers les écrans de la pile racine.
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type AgentTabScreenProps<T extends keyof AgentTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<AgentTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type StackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

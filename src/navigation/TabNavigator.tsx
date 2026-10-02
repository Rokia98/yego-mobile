import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS } from '../theme';
import { vibrer } from '../haptics';
import { useLangue } from '../i18n';
import RechercheScreen from '../screens/RechercheScreen';
import MesTrajetsScreen from '../screens/MesTrajetsScreen';
import TicketsScreen from '../screens/TicketsScreen';
import ProfilScreen from '../screens/ProfilScreen';

export type TabParamList = {
  Accueil: undefined;
  MesTrajets: undefined;
  Tickets: undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const { t } = useLangue();
  return (
    <Tab.Navigator
      screenListeners={{ tabPress: () => vibrer.leger() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.orange,
        tabBarInactiveTintColor: COLORS.grayClair,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={RechercheScreen}
        options={{
          title: t.tabs.accueil,
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MesTrajets"
        component={MesTrajetsScreen}
        options={{
          title: t.tabs.mesTrajets,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bus" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tickets"
        component={TicketsScreen}
        options={{
          title: t.tabs.billets,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="ticket-confirmation" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfilScreen}
        options={{
          title: t.tabs.profilTab,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

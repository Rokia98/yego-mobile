import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS } from '../theme';
import { useLangue } from '../i18n';
import ValiderScreen from '../screens/agent/ValiderScreen';
import HistoriqueScansScreen from '../screens/agent/HistoriqueScansScreen';
import ProfilScreen from '../screens/ProfilScreen';

export type AgentTabParamList = {
  Valider: undefined;
  Historique: undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<AgentTabParamList>();

export default function AgentNavigator() {
  const { t } = useLangue();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.orange,
        tabBarInactiveTintColor: COLORS.grayClair,
        tabBarHideOnKeyboard: true,
        tabBarStyle: { backgroundColor: COLORS.white, borderTopColor: COLORS.border, borderTopWidth: 1, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tab.Screen
        name="Valider"
        component={ValiderScreen}
        options={{
          title: t.tabs.valider,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="qrcode-scan" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Historique"
        component={HistoriqueScansScreen}
        options={{
          title: t.tabs.historique,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
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

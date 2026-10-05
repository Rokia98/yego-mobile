import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SelectionDepartScreen from '../screens/agent/SelectionDepartScreen';
import ValiderScreen from '../screens/agent/ValiderScreen';

export type AgentValiderStackParamList = {
  SelectionDepart: undefined;
  Scan: { departId: number; routeLabel: string };
};

const Stack = createNativeStackNavigator<AgentValiderStackParamList>();

// Onglet "Valider" de l'agent : choisir le départ en cours d'embarquement
// (0.29.1, ?departId= recommandé) avant d'ouvrir la caméra.
export default function AgentValiderNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SelectionDepart" component={SelectionDepartScreen} />
      <Stack.Screen name="Scan" component={ValiderScreen} />
    </Stack.Navigator>
  );
}

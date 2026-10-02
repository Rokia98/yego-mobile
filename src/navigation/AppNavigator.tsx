import React from 'react';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { navigationRef } from './ref';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { useLangue } from '../i18n';
import { COLORS } from '../theme';
import BoutonRetour from '../components/BoutonRetour';
import TabNavigator, { type TabParamList } from './TabNavigator';
import AgentNavigator from './AgentNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import ReservationScreen from '../screens/ReservationScreen';
import ChoixPlacesScreen from '../screens/ChoixPlacesScreen';
import PaiementScreen from '../screens/PaiementScreen';
import TicketScreen from '../screens/TicketScreen';
import SuiviScreen from '../screens/SuiviScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import EditProfilScreen from '../screens/EditProfilScreen';
import AccesRestreintScreen from '../screens/AccesRestreintScreen';
import SupportScreen from '../screens/SupportScreen';
import NouvelleDemandeScreen from '../screens/NouvelleDemandeScreen';
import DemandeDetailScreen from '../screens/DemandeDetailScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  Reservation: { depart: string; arrivee: string; date: string; passagers: number };
  ChoixPlaces: {
    departId: number;
    passagers: number;
    prixUnitaire: number;
    compagnie: string;
    route: string;
    dateDepart: string;
    heureDepart: string;
  };
  Paiement: { reservationId: number; nombrePlaces: number; montantEstime: number; sieges?: string[] };
  Ticket: { reservationId: number; nombrePlaces: number };
  Suivi: { departId: number; route?: string };
  Notifications: undefined;
  ModifierProfil: undefined;
  Support: undefined;
  NouvelleDemande: { reservationId?: number; routeLabel?: string } | undefined;
  DemandeDetail: { demandeId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.background,
    text: COLORS.dark,
    border: 'transparent',
    primary: COLORS.orange,
  },
};

const enTete = {
  headerShown: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: COLORS.background },
  headerTitleStyle: { fontWeight: '800' as const, color: COLORS.dark, fontSize: 17 },
  headerTitleAlign: 'center' as const,
  headerTintColor: COLORS.dark,
  headerBackVisible: false,
  headerLeftContainerStyle: { paddingLeft: 8 },
  headerLeft: () => <BoutonRetour />,
};

export default function AppNavigator() {
  const { session, onboardingVu } = useAuth();
  const { t } = useLangue();
  const role = session?.role;

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {session == null ? (
          !onboardingVu ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
          )
        ) : role === 'agent' ? (
          <>
            <Stack.Screen name="Main" component={AgentNavigator} options={{ animation: 'fade' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="ModifierProfil" component={EditProfilScreen} options={{ animation: 'slide_from_bottom' }} />
          </>
        ) : role === 'user' ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} options={{ animation: 'fade' }} />
            <Stack.Screen name="Reservation" component={ReservationScreen} />

            <Stack.Screen name="ChoixPlaces" component={ChoixPlacesScreen} options={{ ...enTete, title: t.reservation.titreEcranPlaces }} />
            <Stack.Screen name="Paiement" component={PaiementScreen} options={{ ...enTete, title: t.paiement.titre }} />
            <Stack.Screen name="Ticket" component={TicketScreen} options={{ ...enTete, title: t.ticket.titreEcran }} />
            <Stack.Screen name="Suivi" component={SuiviScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="ModifierProfil" component={EditProfilScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen
              name="NouvelleDemande"
              component={NouvelleDemandeScreen}
              options={{ ...enTete, title: t.support.nouvelleDemande }}
            />
            <Stack.Screen name="DemandeDetail" component={DemandeDetailScreen} />
          </>
        ) : (
          // company_admin / admin : ces rôles se gèrent depuis le back-office
          // web (yego-dashboard), pas depuis l'app mobile voyageur. Sans cette
          // branche ils retombaient sur TabNavigator (recherche/réservation/
          // paiement) comme un voyageur — pas voulu.
          <Stack.Screen name="Main" component={AccesRestreintScreen} options={{ animation: 'fade' }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

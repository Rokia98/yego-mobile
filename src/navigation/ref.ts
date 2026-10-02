import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function versMesTrajets() {
  try {
    navigationRef.navigate('Main', { screen: 'MesTrajets' });
  } catch {
    navigationRef.navigate('Notifications');
  }
}

// Route l'app depuis les données d'une notification (tap sur une push, ou
// notification ayant réveillé l'app). `donnees` suit le payload du back-end :
// { type, reservationId?, departId?, paiementId?, ... } — valeurs en chaînes côté push.
export function routerDepuisNotification(donnees: Record<string, unknown>): void {
  if (!navigationRef.isReady()) return;

  const type = typeof donnees.type === 'string' ? donnees.type : '';
  const reservationId = Number(donnees.reservationId);
  const departId = Number(donnees.departId);
  const demandeId = Number(donnees.demandeId);

  switch (type) {
    case 'paiement.confirme':
      if (Number.isFinite(reservationId)) {
        navigationRef.navigate('Ticket', { reservationId, nombrePlaces: 1 });
        return;
      }
      break;

    // Reprise de paiement, changement d'horaire / de date : l'écran Mes trajets
    // porte l'action (bouton « Réessayer le paiement », détail de la réservation).
    case 'paiement.echoue':
    case 'depart.horaire_modifie':
    case 'depart.date_modifiee':
    case 'reservation.confirmee':
    case 'reservation.annulee':
    case 'remboursement.effectue':
    case 'depart.rappel':
      versMesTrajets();
      return;

    // Suivi GPS du véhicule (départ en cours / arrivé / en retard / notif persistante).
    case 'depart.demarre':
    case 'depart.arrive':
    case 'depart.retard':
    case 'depart.suivi':
      if (Number.isFinite(departId)) {
        navigationRef.navigate('Suivi', { departId });
      } else {
        versMesTrajets();
      }
      return;

    // Assistance : réponse de l'équipe/de la compagnie, ou demande résolue.
    case 'support.reponse':
    case 'support.statut':
      if (Number.isFinite(demandeId)) {
        navigationRef.navigate('DemandeDetail', { demandeId });
      } else {
        navigationRef.navigate('Support');
      }
      return;
  }

  // Type inconnu ou données incomplètes : ouvrir le fil.
  if (Number.isFinite(reservationId)) versMesTrajets();
  else navigationRef.navigate('Notifications');
}

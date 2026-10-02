# Yègo Mobile

Application mobile voyageur (React Native + Expo) de la plateforme **Yègo**.

## Démarrage rapide

```bash
npm install
cp .env.example .env    # renseigner API_URL (l'API yego-api)
npm start
```

Scannez le QR code avec l'app **Expo Go** (Android/iOS) pour tester sur votre téléphone.

## Écrans

| Écran        | Fichier                              | Description |
|--------------|----------------------------------------|--------------|
| Recherche    | `src/screens/RechercheScreen.tsx`     | Ville de départ/arrivée, date, nombre de passagers |
| Réservation  | `src/screens/ReservationScreen.tsx`   | Liste des départs disponibles, sélection, réservation |
| Ticket       | `src/screens/TicketScreen.tsx`        | Ticket électronique avec QR code, confirmation de paiement |

## À compléter avant la production

- Écran de paiement mobile money (actuellement la réservation est créée sans paiement réel)
- Authentification voyageur (connexion/inscription)
- Gestion des erreurs réseau et messages inline
- Historique des réservations
- Notifications push (rappel de départ)

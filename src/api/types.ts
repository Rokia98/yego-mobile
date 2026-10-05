export type Role = 'user' | 'agent' | 'company_admin' | 'admin';

export interface Ville {
  id: number;
  nom: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  utilisateurId: number;
  telephone?: string;
  role: Role;
}

// Réponse de PATCH /auth/mot-de-passe : juste des jetons neufs à installer
// (les autres sessions sont révoquées côté serveur) — pas le reste de Session.
export interface Jetons {
  accessToken: string;
  refreshToken: string;
}

export interface CompagnieBref {
  id: number;
  nom: string;
  logoUrl?: string | null; // URL absolue d'un logo, sinon monogramme
}

// Le trajet est renvoyé complet par /departs/recherche et /reservations/:id,
// mais les listes (/reservations, /tickets) n'en donnent que les IDs de villes.
export interface Trajet {
  prix: string; // décimal FCFA
  heureDepart: string; // "1970-01-01THH:mm:ss.000Z"
  villeDepartId?: number;
  villeArriveeId?: number;
  villeDepart?: Ville;
  villeArrivee?: Ville;
  compagnie?: CompagnieBref;
}

// Cycle de vie d'un départ : planifie → en_route → arrive (+ annule).
export type DepartStatut = 'planifie' | 'en_route' | 'arrive' | 'annule';

export interface DepartResultat {
  id: number;
  dateDepart: string;
  placesDisponibles: number;
  statut: DepartStatut;
  trajet: Trajet & {
    villeDepart: Ville;
    villeArrivee: Ville;
    compagnie: CompagnieBref;
  };
}

export interface SiegesDepart {
  placesTotales: number; // capacité du véhicule
  placesDisponibles: number;
  occupes: string[]; // numéros de sièges indisponibles (billets + réservations)
  placesVendues?: number; // total de places vendues (situées + non situées)
  placesSansSiege?: number; // places vendues en placement libre, non situables sur le plan
}

// --- Suivi GPS temps réel (voyageur avec réservation sur le départ) ---------
export interface PointSuivi {
  latitude: number;
  longitude: number;
  vitesse: number | null;
  cap: number | null;
  mesureA: string;
}

export interface SuiviDepart {
  departId: number;
  statut: DepartStatut;
  demarreA: string | null;
  termineA: string | null;
  derniere:
    | (PointSuivi & { precision?: number | null; ageSecondes: number; fraiche: boolean })
    | null;
  destination: { ville: string; latitude: number; longitude: number } | null;
  heureArriveePrevue: string | null;
  eta: {
    arriveeEstimee: string;
    minutesRestantes: number;
    distanceKm: number;
    retardMinutes: number;
  } | null;
  retard: boolean;
}

export interface Reservation {
  id: number;
  utilisateurId: number | null;
  passagerNom: string | null;
  nombrePlaces: number;
  sieges: string[]; // sièges choisis à la réservation (vide = placement libre)
  canal: 'en_ligne' | 'guichet';
  statut: 'confirmee' | 'annulee' | 'expiree';
  dateReservation: string;
  depart?: { id: number; dateDepart: string; statut?: DepartStatut; trajet: Trajet };
  paiement?: Paiement | null;
  tickets?: Ticket[];
}

export interface Paiement {
  id: number;
  reservationId: number;
  montant: string;
  moyenPaiement: string;
  statut: 'en_attente' | 'paye' | 'echoue' | 'rembourse';
  datePaiement: string | null;
  // Jèko (agrégateur Mobile Money, yego-api 0.28.0) — présents quand l'encaissement
  // réel est actif ; absents/`null` en mode simulation (PAYMENT_SIMULATION).
  urlPaiement?: string | null;
  actionRequise?: 'redirection' | 'ussd';
  jekoReference?: string | null;
  telephonePayeur?: string | null;
  // Frais de service (achats en ligne uniquement, 0.29.0) — `montant` reste le
  // prix des billets seul ; total réellement débité = montant + fraisService.
  fraisService?: string | null;
}

// GET /paiements/frais-service — taux courant à afficher avant paiement.
export interface FraisServicePaiement {
  pourcent: number;
}

export interface Ticket {
  id: number;
  reservationId: number;
  codeQr: string;
  siege: string | null;
  statut: 'valide' | 'utilise' | 'annule';
}

export type ResultatScan =
  | 'valide'
  | 'deja_utilise'
  | 'annule'
  | 'introuvable'
  | 'refuse_hors_compagnie';

// Un scan de l'historique agent (GET /tickets/validations). Un même billet peut
// apparaître plusieurs fois (scans successifs). `reservation` est null si le
// code QR était introuvable.
export interface BilletScanne {
  ticketId: number | null;
  siege: string | null;
  codeQr: string | null;
  resultat: ResultatScan | null;
  date: string; // horodatage du scan
  reservation: {
    nombrePlaces: number;
    depart: {
      dateDepart: string;
      trajet: {
        heureDepart: string;
        villeDepart: { nom: string };
        villeArrivee: { nom: string };
        compagnie: { nom: string };
      };
    };
  } | null;
}

export interface Remboursement {
  id: number;
  reservationId: number;
  montantRembourse: string;
  fraisRetenus: string;
  statut: 'en_attente' | 'en_cours' | 'rembourse' | 'echoue';
  motifEchec: string | null;
}

export interface Notification {
  id: number;
  type: string;
  titre: string;
  corps: string;
  donnees: Record<string, unknown> | null;
  lu: boolean;
  dateCreation: string;
}

export type MoyenPaiement = 'orange_money' | 'mtn_money' | 'moov_money' | 'wave' | 'djamo';

export interface Utilisateur {
  id: number;
  nom: string;
  telephone: string;
  email: string | null;
  role: Role;
  compagnieId: number | null;
  dateCreation: string;
  photoUrl?: string | null; // data URI ou URL — voir api/utilisateurs.ts (modifierProfil)
}

export interface RechercheRecente {
  depart: string;
  arrivee: string;
  date: string;
  passagers: number;
}

// --- Support (assistance voyageur) ------------------------------------------
export type CategorieSupport =
  | 'reservation'
  | 'paiement'
  | 'remboursement'
  | 'ticket'
  | 'compte'
  | 'abonnement'
  | 'technique'
  | 'autre';

export type StatutSupport = 'ouverte' | 'en_cours' | 'resolue' | 'fermee';

export interface AuteurSupport {
  id: number;
  nom: string;
  role: Role;
}

// Élément de GET /support/demandes (liste).
export interface DemandeSupport {
  id: number;
  categorie: CategorieSupport;
  sujet: string;
  statut: StatutSupport;
  priorite: string;
  nbMessages: number;
  dernierMessageA: string;
  dateCreation: string;
  compagnie: { id: number; nom: string } | null;
  auteur: AuteurSupport;
}

export interface MessageSupport {
  id: number;
  contenu: string;
  auteurRole: Role;
  auteur: AuteurSupport | null;
  dateCreation: string;
}

// GET /support/demandes/:id et réponse de POST /support/demandes.
export interface DemandeSupportDetail extends DemandeSupport {
  messages: MessageSupport[];
}

export interface CompteursSupport {
  ouverte: number;
  en_cours: number;
}

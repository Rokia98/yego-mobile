import { api } from './client';
import type {
  CategorieSupport,
  CompteursSupport,
  DemandeSupport,
  DemandeSupportDetail,
  MessageSupport,
  StatutSupport,
} from './types';

// Assistance voyageur (yego-api 0.27.0). Toutes ces routes exigent un Bearer
// et sont cloisonnées : un voyageur ne voit/ne modifie que ses propres demandes.

export function creerDemande(donnees: {
  categorie: CategorieSupport;
  sujet: string;
  message: string;
  reservationId?: number;
}): Promise<DemandeSupportDetail> {
  return api.post<DemandeSupportDetail>('/support/demandes', donnees).then((r) => r.data);
}

export function listerDemandes(
  opts: {
    statut?: StatutSupport;
    categorie?: CategorieSupport;
    q?: string;
    skip?: number;
    take?: number;
  } = {},
): Promise<DemandeSupport[]> {
  return api.get<DemandeSupport[]>('/support/demandes', { params: opts }).then((r) => r.data);
}

export function demande(id: number): Promise<DemandeSupportDetail> {
  return api.get<DemandeSupportDetail>(`/support/demandes/${id}`).then((r) => r.data);
}

// Répondre rouvre automatiquement une demande 'resolue' (côté serveur) ;
// impossible sur une demande 'fermee' (400).
export function repondre(id: number, contenu: string): Promise<MessageSupport> {
  return api.post<MessageSupport>(`/support/demandes/${id}/messages`, { contenu }).then((r) => r.data);
}

// Le voyageur ne peut que fermer sa demande (tout autre statut → 403 côté API).
export function fermerDemande(id: number): Promise<DemandeSupport> {
  return api.patch<DemandeSupport>(`/support/demandes/${id}`, { statut: 'fermee' }).then((r) => r.data);
}

// Pour un badge (nb de demandes ouvertes / en cours).
export function compteursSupport(): Promise<CompteursSupport> {
  return api.get<CompteursSupport>('/support/compteurs').then((r) => r.data);
}

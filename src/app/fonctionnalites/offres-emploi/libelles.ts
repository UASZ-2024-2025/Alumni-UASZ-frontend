import { ApplicationStatus } from '../../api/generes/offres-emploi/model/applicationStatus';
import { ProposalStatus } from '../../api/generes/offres-emploi/model/proposalStatus';
import { OptionChamp } from '../../commun/components/champ/champ';
import { TonBadge } from '../../commun/components/badge/badge';

/** Libellés et couleurs des statuts du service offres (job-offer-service.yaml). */
const CANDIDATURES: Record<ApplicationStatus, { libelle: string; ton: TonBadge }> = {
  SUBMITTED: { libelle: 'Envoyée', ton: 'neutre' },
  UNDER_REVIEW: { libelle: "En cours d'examen", ton: 'attention' },
  SHORTLISTED: { libelle: 'Présélectionnée', ton: 'attention' },
  ACCEPTED: { libelle: 'Retenue', ton: 'ok' },
  REJECTED: { libelle: 'Non retenue', ton: 'erreur' },
};

const PROPOSITIONS: Record<ProposalStatus, { libelle: string; ton: TonBadge }> = {
  PENDING: { libelle: 'En attente de réponse', ton: 'attention' },
  ACCEPTED: { libelle: 'Acceptée', ton: 'ok' },
  REJECTED: { libelle: 'Refusée', ton: 'erreur' },
  EXPIRED: { libelle: 'Expirée', ton: 'neutre' },
};

export const libelleCandidature = (s?: ApplicationStatus): string => (s ? (CANDIDATURES[s]?.libelle ?? s) : '—');
export const tonCandidature = (s?: ApplicationStatus): TonBadge => (s ? (CANDIDATURES[s]?.ton ?? 'neutre') : 'neutre');
export const libelleProposition = (s?: ProposalStatus): string => (s ? (PROPOSITIONS[s]?.libelle ?? s) : '—');
export const tonProposition = (s?: ProposalStatus): TonBadge => (s ? (PROPOSITIONS[s]?.ton ?? 'neutre') : 'neutre');

const options = (libelles: Record<string, { libelle: string }>): OptionChamp[] => [
  { valeur: '', libelle: 'Tous' },
  ...Object.entries(libelles).map(([valeur, { libelle }]) => ({ valeur, libelle })),
];
export const OPTIONS_STATUT_CANDIDATURE = options(CANDIDATURES);
export const OPTIONS_STATUT_PROPOSITION = options(PROPOSITIONS);

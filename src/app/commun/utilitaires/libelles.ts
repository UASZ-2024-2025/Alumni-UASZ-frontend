import { TonBadge } from '../components/badge/badge';

/** Libellés français des valeurs d'énumération renvoyées par l'API ; une valeur inconnue s'affiche telle quelle. */
const ROLES: Record<string, string> = {
  ALUMNI: 'Alumni',
  ETUDIANT: 'Étudiant',
  ENSEIGNANT: 'Enseignant',
  ADMINISTRATEUR: 'Administrateur',
  ENTREPRISE: 'Entreprise',
};
const STATUTS: Record<string, string> = {
  ACTIF: 'Actif',
  EN_ATTENTE: 'En attente',
  INACTIF: 'Inactif',
  SUSPENDU: 'Suspendu',
};

export const libelleRole = (r?: string): string => (r ? (ROLES[r] ?? r) : '—');
export const libelleStatut = (s?: string): string => (s ? (STATUTS[s] ?? s) : '—');

export const tonStatut = (s?: string): TonBadge => {
  if (s === 'ACTIF') return 'ok';
  return s === 'SUSPENDU' || s === 'EN_ATTENTE' ? 'attention' : 'neutre';
};

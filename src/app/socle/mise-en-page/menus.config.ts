import { RoleApplicatif } from '../authentification/modeles/session.model';

export interface ElementMenu { libelle: string; chemin: string; }

const commun: ElementMenu[] = [
  { libelle: 'Messagerie', chemin: '/messagerie' },
  { libelle: 'Notifications', chemin: '/notifications' },
];
/** Groupes de discussion : étudiants, Alumni, enseignants (et administrateur), pas les entreprises. */
const groupes: ElementMenu = { libelle: 'Groupes', chemin: '/groupes' };

export const MENUS: Record<RoleApplicatif, ElementMenu[]> = {
  ALUMNI: [{ libelle: 'Offres', chemin: '/offres-emploi' }, { libelle: 'Propositions envoyées', chemin: '/propositions' }, { libelle: 'Étudiants', chemin: '/etudiants' }, groupes, ...commun],
  ETUDIANT: [{ libelle: 'Offres', chemin: '/offres-emploi' }, { libelle: 'Mes candidatures', chemin: '/candidatures' }, { libelle: 'Correspondances', chemin: '/correspondances' }, groupes, ...commun],
  ENSEIGNANT: [{ libelle: 'Étudiants', chemin: '/etudiants' }, { libelle: 'Statistiques', chemin: '/statistiques' }, groupes, ...commun],
  ENTREPRISE: [{ libelle: 'Mes offres', chemin: '/offres-emploi/mes-offres' }, { libelle: 'Publier une offre', chemin: '/offres-emploi/publier' }, { libelle: 'Candidatures reçues', chemin: '/candidatures' }, { libelle: 'Propositions envoyées', chemin: '/propositions' }, ...commun],
  ADMINISTRATEUR: [{ libelle: 'Administration', chemin: '/administration' }, { libelle: 'Étudiants', chemin: '/etudiants' }, { libelle: 'Entreprises', chemin: '/entreprises' }, { libelle: 'Offres', chemin: '/offres-emploi' }, { libelle: 'Statistiques', chemin: '/statistiques' }, groupes, ...commun],
};
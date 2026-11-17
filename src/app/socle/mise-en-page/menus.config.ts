import { RoleApplicatif } from '../authentification/modeles/session.model';

export interface ElementMenu { libelle: string; chemin: string; }

const commun: ElementMenu[] = [
  { libelle: 'Messagerie', chemin: '/messagerie' },
  { libelle: 'Notifications', chemin: '/notifications' },
];

export const MENUS: Record<RoleApplicatif, ElementMenu[]> = {
  ALUMNI: [{ libelle: 'Offres', chemin: '/offres-emploi' }, { libelle: 'Étudiants', chemin: '/etudiants' }, ...commun],
  ETUDIANT: [{ libelle: 'Offres', chemin: '/offres-emploi' }, { libelle: 'Mes candidatures', chemin: '/candidatures' }, { libelle: 'Correspondances', chemin: '/correspondances' }, ...commun],
  ENSEIGNANT: [{ libelle: 'Étudiants', chemin: '/etudiants' }, { libelle: 'Statistiques', chemin: '/statistiques' }, ...commun],
  ENTREPRISE: [{ libelle: 'Mes offres', chemin: '/offres-emploi' }, { libelle: 'Candidatures reçues', chemin: '/candidatures' }, ...commun],
  ADMINISTRATEUR: [{ libelle: 'Administration', chemin: '/administration' }, { libelle: 'Étudiants', chemin: '/etudiants' }, { libelle: 'Entreprises', chemin: '/entreprises' }, { libelle: 'Offres', chemin: '/offres-emploi' }, { libelle: 'Statistiques', chemin: '/statistiques' }, ...commun],
};
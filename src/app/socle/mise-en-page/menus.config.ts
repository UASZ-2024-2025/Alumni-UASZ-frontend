import { RoleApplicatif } from '../authentification/modeles/session.model';

export interface ElementMenu { libelle: string; chemin: string; }

/**
 * Menu de la démo d'authentification : uniquement des pages qui existent.
 * Ajouter ici les entrées métier (offres, étudiants, messagerie…) au fur et à mesure que leurs pages sont créées.
 */
const commun: ElementMenu[] = [
  { libelle: 'Tableau de bord', chemin: '/' },
  { libelle: 'Mon profil', chemin: '/profil' },
  { libelle: 'Mot de passe', chemin: '/mot-de-passe' },
];

const admin: ElementMenu[] = [
  { libelle: 'Utilisateurs', chemin: '/administration/utilisateurs' },
  { libelle: 'Rôles', chemin: '/administration/roles' },
];

export const MENUS: Record<RoleApplicatif, ElementMenu[]> = {
  ALUMNI: [...commun],
  ETUDIANT: [...commun],
  ENSEIGNANT: [...commun],
  ENTREPRISE: [...commun],
  ADMINISTRATEUR: [...commun, ...admin],
};

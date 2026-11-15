import { RoleApplicatif } from '../authentification/modeles/session.model';

export interface ElementMenu { libelle: string; chemin: string; }

const commun: ElementMenu[] = [
  { libelle: 'Messagerie', chemin: '/messagerie' },
  { libelle: 'Notifications', chemin: '/notifications' },
  { libelle: 'Mon profil', chemin: '/profil' },
  { libelle: 'Mot de passe', chemin: '/mot-de-passe' },
];

export const MENUS: Record<RoleApplicatif, ElementMenu[]> = {
  ALUMNI: [
    { libelle: 'Annuaire', chemin: '/annuaire' },
    { libelle: 'Profil Alumni', chemin: '/espace-alumni/profil' },
    { libelle: 'Offres', chemin: '/offres-emploi' },
    ...commun,
  ],
  ETUDIANT: [
    { libelle: 'Profil étudiant', chemin: '/mon-espace/profil' },
    { libelle: 'Mon CV', chemin: '/mon-espace/cv' },
    { libelle: 'Annuaire', chemin: '/annuaire' },
    { libelle: 'Offres', chemin: '/offres-emploi' },
    { libelle: 'Mes candidatures', chemin: '/candidatures' },
    { libelle: 'Correspondances', chemin: '/correspondances' },
    ...commun,
  ],
  ENSEIGNANT: [
    { libelle: 'Annuaire', chemin: '/annuaire' },
    { libelle: 'Statistiques', chemin: '/statistiques' },
    ...commun,
  ],
  ENTREPRISE: [
    { libelle: 'Annuaire', chemin: '/annuaire' },
    { libelle: 'Mes offres', chemin: '/offres-emploi' },
    { libelle: 'Candidatures reçues', chemin: '/candidatures' },
    ...commun,
  ],
  ADMINISTRATEUR: [
    { libelle: 'Annuaire', chemin: '/annuaire' },
    { libelle: 'Promotions', chemin: '/promotions' },
    { libelle: 'Entreprises', chemin: '/entreprises' },
    { libelle: 'Offres', chemin: '/offres-emploi' },
    { libelle: 'Statistiques', chemin: '/statistiques' },
    ...commun,
  ],
};

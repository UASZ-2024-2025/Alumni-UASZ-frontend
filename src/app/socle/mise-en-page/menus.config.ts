import { RoleApplicatif } from '../authentification/modeles/session.model';

export interface ElementMenu {
  libelle: string;
  chemin: string;
}

const commun: ElementMenu[] = [
  { libelle: 'Messagerie', chemin: '/messagerie' },
  { libelle: 'Notifications', chemin: '/notifications' },
];
/** Groupes de discussion : étudiants, Alumni, enseignants (et administrateur), pas les entreprises. */
const groupes: ElementMenu = { libelle: 'Groupes', chemin: '/groupes' };

export const MENUS: Record<RoleApplicatif, ElementMenu[]> = {
  ALUMNI: [
    { libelle: 'Annuaire', chemin: '/annuaire' },
    { libelle: 'Profil Alumni', chemin: '/espace-alumni/profil' },
    { libelle: 'Offres', chemin: '/offres-emploi' },
    { libelle: 'Propositions envoyées', chemin: '/propositions' },
    groupes,
    ...commun,
  ],
  ETUDIANT: [
    { libelle: 'Profil étudiant', chemin: '/mon-espace/profil' },
    { libelle: 'Mon CV', chemin: '/mon-espace/cv' },
    { libelle: 'Annuaire', chemin: '/annuaire' },
    { libelle: 'Offres', chemin: '/offres-emploi' },
    { libelle: 'Mes candidatures', chemin: '/candidatures' },
    { libelle: 'Correspondances', chemin: '/correspondances' },
    groupes,
    ...commun,
  ],
  ENSEIGNANT: [
    { libelle: 'Annuaire', chemin: '/annuaire' },
    groupes,
    ...commun,
  ],
  ENTREPRISE: [
    { libelle: 'Ma fiche entreprise', chemin: '/entreprise/ma-fiche' },
    { libelle: 'Annuaire', chemin: '/annuaire' },
    { libelle: 'Mes offres', chemin: '/offres-emploi/mes-offres' },
    { libelle: 'Publier une offre', chemin: '/offres-emploi/publier' },
    { libelle: 'Propositions envoyées', chemin: '/propositions' },
    ...commun,
  ],
  ADMINISTRATEUR: [
    { libelle: 'Administration', chemin: '/administration' },
    { libelle: 'Annuaire', chemin: '/annuaire' },
    { libelle: 'Entreprises', chemin: '/administration/entreprises' },
    { libelle: 'Offres', chemin: '/offres-emploi' },
    groupes,
    ...commun,
  ],
};

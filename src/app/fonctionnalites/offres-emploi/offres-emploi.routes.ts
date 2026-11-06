import { Routes } from '@angular/router';
import { roleGuard } from '../../socle/gardes-routes/role.guard';

const enConstruction = () =>
  import('../../commun/components/page-en-construction/page-en-construction').then((m) => m.PageEnConstruction);

/** Squelette (AL-49) : remplacer chaque `enConstruction` par la vraie page. Rôles à confirmer avec l'équipe back. */
export const OFFRES_EMPLOI_ROUTES: Routes = [
  {
    path: 'offres-emploi',
    title: "Offres d'emploi",
    canActivate: [roleGuard],
    data: { roles: ['ALUMNI', 'ETUDIANT', 'ENTREPRISE', 'ADMINISTRATEUR'], titre: "Offres d'emploi", ticket: 'AL-49' },
    loadComponent: enConstruction,
  },
  {
    path: 'candidatures',
    title: 'Candidatures',
    canActivate: [roleGuard],
    data: { roles: ['ETUDIANT', 'ENTREPRISE'], titre: 'Candidatures', ticket: 'AL-49' },
    loadComponent: enConstruction,
  },
  {
    path: 'correspondances',
    title: 'Correspondances',
    canActivate: [roleGuard],
    data: { roles: ['ETUDIANT'], titre: 'Correspondances', ticket: 'AL-49' },
    loadComponent: enConstruction,
  },
];

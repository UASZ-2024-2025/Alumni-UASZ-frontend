import { Routes } from '@angular/router';
import { roleGuard } from '../../socle/gardes-routes/role.guard';

const enConstruction = () =>
  import('../../commun/components/page-en-construction/page-en-construction').then((m) => m.PageEnConstruction);

/** Squelette (AL-48) : remplacer chaque `enConstruction` par la vraie page. Rôles à confirmer avec l'équipe back. */
export const PROFILS_ROUTES: Routes = [
  {
    path: 'etudiants',
    title: 'Étudiants',
    canActivate: [roleGuard],
    data: { roles: ['ALUMNI', 'ENSEIGNANT', 'ADMINISTRATEUR'], titre: 'Étudiants', ticket: 'AL-48' },
    loadComponent: enConstruction,
  },
  {
    path: 'entreprises',
    title: 'Entreprises',
    canActivate: [roleGuard],
    data: { roles: ['ADMINISTRATEUR'], titre: 'Entreprises', ticket: 'AL-48' },
    loadComponent: enConstruction,
  },
];

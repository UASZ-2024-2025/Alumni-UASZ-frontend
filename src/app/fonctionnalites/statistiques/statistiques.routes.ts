import { Routes } from '@angular/router';
import { roleGuard } from '../../socle/gardes-routes/role.guard';

const enConstruction = () =>
  import('../../commun/components/page-en-construction/page-en-construction').then((m) => m.PageEnConstruction);

/** Squelette (AL-6) : remplacer chaque `enConstruction` par la vraie page. Rôles à confirmer avec l'équipe back. */
export const STATISTIQUES_ROUTES: Routes = [
  {
    path: 'statistiques',
    title: 'Statistiques',
    canActivate: [roleGuard],
    data: { roles: ['ENSEIGNANT', 'ADMINISTRATEUR'], titre: 'Statistiques', ticket: 'AL-6' },
    loadComponent: enConstruction,
  },
];

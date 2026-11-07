import { Routes } from '@angular/router';
import { roleGuard } from '../../socle/gardes-routes/role.guard';

const enConstruction = () =>
  import('../../commun/components/page-en-construction/page-en-construction').then((m) => m.PageEnConstruction);

/** Squelette (AL-50) : remplacer chaque `enConstruction` par la vraie page. Rôles à confirmer avec l'équipe back. */
export const MESSAGERIE_ROUTES: Routes = [
  {
    path: 'messagerie',
    title: 'Messagerie',
    canActivate: [roleGuard],
    data: { roles: ['ALUMNI', 'ETUDIANT', 'ENSEIGNANT', 'ENTREPRISE', 'ADMINISTRATEUR'], titre: 'Messagerie', ticket: 'AL-50' },
    loadComponent: enConstruction,
  },
  {
    path: 'notifications',
    title: 'Notifications',
    canActivate: [roleGuard],
    data: { roles: ['ALUMNI', 'ETUDIANT', 'ENSEIGNANT', 'ENTREPRISE', 'ADMINISTRATEUR'], titre: 'Notifications', ticket: 'AL-50' },
    loadComponent: enConstruction,
  },
];

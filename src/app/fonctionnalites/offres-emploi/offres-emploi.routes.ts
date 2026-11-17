import { Routes } from '@angular/router';
import { roleGuard } from '../../socle/gardes-routes/role.guard';

const enConstruction = () =>
  import('../../commun/components/page-en-construction/page-en-construction').then((m) => m.PageEnConstruction);

/** Squelette (AL-49) : remplacer chaque `enConstruction` par la vraie page. Rôles à confirmer avec l'équipe back. */
export const OFFRES_EMPLOI_ROUTES: Routes = [
   {
    path: 'offres-emploi/mes-offres',
    title: 'Mes offres',
    canActivate: [roleGuard],
    data: { roles: ['ENTREPRISE'], titre: 'Mes offres', ticket: 'ALUM-131' },
    loadComponent: () => import('./pages/mes-offres').then((m) => m.MesOffres),
  },
  {
    path: 'offres-emploi/publier',
    title: 'Publier une offre',
    canActivate: [roleGuard],
    data: { roles: ['ENTREPRISE'], titre: 'Publier une offre', ticket: 'ALUM-131' },
    loadComponent: () => import('./pages/publier-offre').then((m) => m.PublierOffre),
  },
 
];

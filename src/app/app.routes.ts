import { Routes } from '@angular/router';
import { CONNEXION_ROUTES } from './fonctionnalites/connexion/connexion.routes';
import { COMPTE_ROUTES } from './fonctionnalites/compte/compte.routes';
import { PROFILS_ROUTES } from './fonctionnalites/profils/profils.routes';
import { OFFRES_EMPLOI_ROUTES } from './fonctionnalites/offres-emploi/offres-emploi.routes';
import { MESSAGERIE_ROUTES } from './fonctionnalites/messagerie/messagerie.routes';
import { STATISTIQUES_ROUTES } from './fonctionnalites/statistiques/statistiques.routes';
import { authentificationGuard } from './socle/gardes-routes/authentification.guard';
import { roleGuard } from './socle/gardes-routes/role.guard';

export const routes: Routes = [
  ...CONNEXION_ROUTES,
  {
    path: '',
    canActivate: [authentificationGuard],
    loadComponent: () =>
      import('./socle/mise-en-page/coquille-principale').then((m) => m.CoquillePrincipale),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./fonctionnalites/accueil/accueil').then((m) => m.Accueil),
      },
      ...COMPTE_ROUTES,
      ...PROFILS_ROUTES,
      ...OFFRES_EMPLOI_ROUTES,
      ...MESSAGERIE_ROUTES,
      ...STATISTIQUES_ROUTES,
      {
        path: 'acces-refuse',
        title: 'Accès refusé',
        loadComponent: () => import('./socle/pages-erreur/acces-refuse').then((m) => m.AccesRefuse),
      },
      {
        path: 'administration',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRATEUR'] },
        loadChildren: () =>
          import('./fonctionnalites/administration/administration.routes').then(
            (m) => m.ADMINISTRATION_ROUTES,
          ),
      },
      {
        path: '**',
        title: 'Page introuvable',
        loadComponent: () => import('./socle/pages-erreur/introuvable').then((m) => m.Introuvable),
      },
    ],
  },
];
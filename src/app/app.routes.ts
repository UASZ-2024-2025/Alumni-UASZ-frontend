import { Routes } from '@angular/router';
import { CONNEXION_ROUTES } from './fonctionnalites/connexion/connexion.routes';
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
      // TEMPORAIRE : pour tester roleGuard
      {
        path: 'test-admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRATEUR'] },
        loadComponent: () => import('./fonctionnalites/accueil/accueil').then((m) => m.Accueil),
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
    ],
  },
  { path: '**', redirectTo: '' },
];
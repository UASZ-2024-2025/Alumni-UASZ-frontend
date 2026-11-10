import { Routes } from '@angular/router';
import { authentificationGuard } from './socle/gardes-routes/authentification.guard';
import { roleGuard } from './socle/gardes-routes/role.guard';

export const routes: Routes = [
  {
    path: 'connexion',
    loadChildren: () =>
      import('./fonctionnalites/connexion/connexion.routes').then((m) => m.CONNEXION_ROUTES),
  },
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
      // TEMPORAIRE, pour tester roleGuard : à supprimer quand les vraies pages existent
      {
        path: 'test-admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRATEUR'] },
        loadComponent: () => import('./fonctionnalites/accueil/accueil').then((m) => m.Accueil),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
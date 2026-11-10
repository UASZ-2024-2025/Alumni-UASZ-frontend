import { Routes } from '@angular/router';
import { authentificationGuard } from './socle/gardes-routes/authentification.guard';
import { roleGuard } from './socle/gardes-routes/role.guard';

export const routes: Routes = [
  // ---- Pages publiques (les liens des emails du back pointent sur confirmation-email et reinitialisation-mot-de-passe) ----
  {
    path: 'connexion',
    loadChildren: () =>
      import('./fonctionnalites/connexion/connexion.routes').then((m) => m.CONNEXION_ROUTES),
  },
  {
    path: 'inscription',
    loadComponent: () => import('./fonctionnalites/inscription/inscription').then((m) => m.Inscription),
  },
  {
    path: 'confirmation-email',
    loadComponent: () =>
      import('./fonctionnalites/confirmation-email/confirmation-email').then((m) => m.ConfirmationEmail),
  },
  {
    path: 'mot-de-passe-oublie',
    loadComponent: () =>
      import('./fonctionnalites/mot-de-passe-oublie/mot-de-passe-oublie').then((m) => m.MotDePasseOublie),
  },
  {
    path: 'reinitialisation-mot-de-passe',
    loadComponent: () =>
      import('./fonctionnalites/reinitialisation-mot-de-passe/reinitialisation-mot-de-passe').then(
        (m) => m.ReinitialisationMotDePasse,
      ),
  },

  // ---- Espace connecté ----
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
      {
        path: 'profil',
        loadComponent: () => import('./fonctionnalites/profil/profil').then((m) => m.Profil),
      },
      {
        path: 'mot-de-passe',
        loadComponent: () =>
          import('./fonctionnalites/mot-de-passe/mot-de-passe').then((m) => m.MotDePasse),
      },
      {
        path: 'administration',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRATEUR'] },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'utilisateurs' },
          {
            path: 'utilisateurs',
            loadComponent: () =>
              import('./fonctionnalites/administration/utilisateurs').then(
                (m) => m.AdministrationUtilisateurs,
              ),
          },
          {
            path: 'roles',
            loadComponent: () =>
              import('./fonctionnalites/administration/roles').then((m) => m.AdministrationRoles),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

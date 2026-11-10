import { Routes } from '@angular/router';

/** Pages de l'utilisateur connecté, accessibles à tous les rôles. */
export const COMPTE_ROUTES: Routes = [
  { path: 'profil', title: 'Mon profil', loadComponent: () => import('./pages/profil').then((m) => m.Profil) },
  {
    path: 'mot-de-passe',
    title: 'Changer mon mot de passe',
    loadComponent: () => import('./pages/mot-de-passe').then((m) => m.MotDePasse),
  },
];

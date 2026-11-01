import { Routes } from '@angular/router';

export const CONNEXION_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./pages/connexion').then((m) => m.Connexion) },
];
import { Routes } from '@angular/router';

export const CONNEXION_ROUTES: Routes = [
  { path: 'connexion', loadComponent: () => import('./pages/connexion').then((m) => m.Connexion) },
  { path: 'inscription', loadComponent: () => import('./pages/inscription').then((m) => m.Inscription) },
  { path: 'confirmation-email', loadComponent: () => import('./pages/confirmation-email').then((m) => m.ConfirmationEmail) },
  { path: 'renvoi-confirmation', loadComponent: () => import('./pages/renvoi-confirmation').then((m) => m.RenvoiConfirmation) },
  { path: 'mot-de-passe-oublie', loadComponent: () => import('./pages/mot-de-passe-oublie').then((m) => m.MotDePasseOublie) },
  { path: 'reinitialisation-mot-de-passe', loadComponent: () => import('./pages/reinitialisation-mot-de-passe').then((m) => m.ReinitialisationMotDePasse) },
];
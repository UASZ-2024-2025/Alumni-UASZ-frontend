import { Routes } from '@angular/router';

/**
 * Ancienne adresse de la gestion des entreprises (squelette AL-48). La vraie page est dans l'administration
 * (validation, rattachement, ALUM-224) : on y redirige, la garde de rôle de /administration s'applique.
 */
export const PROFILS_ROUTES: Routes = [
  { path: 'entreprises', pathMatch: 'full', redirectTo: '/administration/entreprises' },
];

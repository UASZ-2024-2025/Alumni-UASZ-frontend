import { Routes } from '@angular/router';
import { FOURNISSEURS_ALUMNI } from '../annuaire/fournisseurs-alumni';

export const PROFIL_ALUMNI_ROUTES: Routes = [
  {
    path: '',
    providers: FOURNISSEURS_ALUMNI,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profil' },
      { path: 'profil', title: 'Mon profil Alumni', loadComponent: () => import('./pages/profil-alumni').then((m) => m.ProfilAlumni) },
    ],
  },
];

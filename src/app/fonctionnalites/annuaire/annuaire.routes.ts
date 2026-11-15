import { Routes } from '@angular/router';
import { FOURNISSEURS_ALUMNI } from './fournisseurs-alumni';

export const ANNUAIRE_ROUTES: Routes = [
  {
    path: '',
    providers: FOURNISSEURS_ALUMNI,
    children: [
      { path: '', title: 'Annuaire', loadComponent: () => import('./pages/annuaire').then((m) => m.Annuaire) },
      { path: 'etudiants/:id', title: 'Fiche étudiant', loadComponent: () => import('./pages/fiche-etudiant').then((m) => m.FicheEtudiant) },
      { path: 'alumni/:id', title: 'Fiche Alumni', loadComponent: () => import('./pages/fiche-alumni').then((m) => m.FicheAlumni) },
      { path: 'entreprises/:id', title: 'Fiche entreprise', loadComponent: () => import('./pages/fiche-entreprise').then((m) => m.FicheEntreprise) },
    ],
  },
];

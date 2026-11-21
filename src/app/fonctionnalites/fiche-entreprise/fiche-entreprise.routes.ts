import { Routes } from '@angular/router';
import { FOURNISSEURS_ALUMNI } from '../annuaire/fournisseurs-alumni';

/** Espace du compte ENTREPRISE (ALUM-224). */
export const FICHE_ENTREPRISE_ROUTES: Routes = [
  {
    path: '',
    providers: FOURNISSEURS_ALUMNI,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'ma-fiche' },
      {
        path: 'ma-fiche',
        title: 'Ma fiche entreprise',
        loadComponent: () => import('./pages/ma-fiche-entreprise').then((m) => m.MaFicheEntreprise),
      },
    ],
  },
];

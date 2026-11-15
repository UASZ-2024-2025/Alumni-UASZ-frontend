import { Routes } from '@angular/router';
import { FOURNISSEURS_ALUMNI } from '../annuaire/fournisseurs-alumni';

export const PROMOTIONS_ROUTES: Routes = [
  {
    path: '',
    providers: FOURNISSEURS_ALUMNI,
    title: 'Promotions',
    loadComponent: () => import('./pages/gestion-promotions').then((m) => m.GestionPromotions),
  },
];

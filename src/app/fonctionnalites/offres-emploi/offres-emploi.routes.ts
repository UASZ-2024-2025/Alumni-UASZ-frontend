import { Routes } from '@angular/router';
import { roleGuard } from '../../socle/gardes-routes/role.guard';
import { BASE_PATH as BASE_PATH_OFFRES } from '../../api/generes/offres-emploi/variables';
import { OffersService } from '../../api/generes/offres-emploi/api/offers.service';
import { environment } from '../../../environments/environment';

const enConstruction = () =>
  import('../../commun/components/page-en-construction/page-en-construction').then((m) => m.PageEnConstruction);

/** Squelette (AL-49) : remplacer chaque `enConstruction` par la vraie page. Rôles à confirmer avec l'équipe back. */
export const OFFRES_EMPLOI_ROUTES: Routes = [
  {
    path: 'offres-emploi',
    title: "Offres d'emploi",
    canActivate: [roleGuard],
    data: { roles: ['ALUMNI', 'ETUDIANT', 'ENTREPRISE', 'ADMINISTRATEUR'], titre: "Offres d'emploi", ticket: 'AL-49' },
    // Provisoire : à retirer quand le BASE_PATH des offres sera déclaré dans app.config.ts
    providers: [{ provide: BASE_PATH_OFFRES, useValue: environment.urlsApi.offres }, OffersService],
    loadComponent: () => import('./pages/liste-offres').then((m) => m.ListeOffres),
  },
  {
    path: 'candidatures',
    title: 'Candidatures',
    canActivate: [roleGuard],
    data: { roles: ['ETUDIANT', 'ENTREPRISE'], titre: 'Candidatures', ticket: 'AL-49' },
    loadComponent: enConstruction,
  },
  {
    path: 'correspondances',
    title: 'Correspondances',
    canActivate: [roleGuard],
    data: { roles: ['ETUDIANT'], titre: 'Correspondances', ticket: 'AL-49' },
    loadComponent: enConstruction,
  },
];
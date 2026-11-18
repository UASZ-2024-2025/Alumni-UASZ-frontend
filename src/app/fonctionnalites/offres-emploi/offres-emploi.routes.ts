import { inject, Provider } from '@angular/core';
import { CanMatchFn, Routes } from '@angular/router';
import { ApplicationsService } from '../../api/generes/offres-emploi/api/applications.service';
import { ProposalsService } from '../../api/generes/offres-emploi/api/proposals.service';
import { BASE_PATH as BASE_PATH_OFFRES } from '../../api/generes/offres-emploi/variables';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';
import { roleGuard } from '../../socle/gardes-routes/role.guard';
import { environment } from '../../../environments/environment';

const enConstruction = () =>
  import('../../commun/components/page-en-construction/page-en-construction').then((m) => m.PageEnConstruction);

// Provisoire : à retirer quand le BASE_PATH offres sera déclaré dans app.config.ts
const fournisseursOffres: Provider[] = [
  { provide: BASE_PATH_OFFRES, useValue: environment.urlsApi.offres },
  ApplicationsService,
  ProposalsService,
];

/** `/candidatures` est partagé : l'étudiant y suit ses candidatures, l'entreprise y verra celles qu'elle reçoit. */
const estEtudiant: CanMatchFn = () => inject(AuthentificationService).role() === 'ETUDIANT';

/** Squelette (AL-49) : remplacer chaque `enConstruction` par la vraie page. Rôles à confirmer avec l'équipe back. */
export const OFFRES_EMPLOI_ROUTES: Routes = [
  {
    path: 'offres-emploi',
    title: "Offres d'emploi",
    canActivate: [roleGuard],
    data: { roles: ['ALUMNI', 'ETUDIANT', 'ENTREPRISE', 'ADMINISTRATEUR'], titre: "Offres d'emploi", ticket: 'AL-49' },
    loadComponent: enConstruction,
  },
  {
    path: 'candidatures',
    title: 'Mes candidatures',
    canMatch: [estEtudiant],
    providers: fournisseursOffres,
    loadComponent: () => import('./pages/mes-candidatures').then((m) => m.MesCandidatures),
  },
  {
    path: 'candidatures',
    title: 'Candidatures',
    canActivate: [roleGuard],
    data: { roles: ['ENTREPRISE'], titre: 'Candidatures', ticket: 'AL-49' },
    loadComponent: enConstruction,
  },
  {
    path: 'propositions',
    title: 'Propositions envoyées',
    canActivate: [roleGuard],
    data: { roles: ['ALUMNI', 'ENTREPRISE'] },
    providers: fournisseursOffres,
    loadComponent: () => import('./pages/propositions-envoyees').then((m) => m.PropositionsEnvoyees),
  },
  {
    path: 'correspondances',
    title: 'Correspondances',
    canActivate: [roleGuard],
    data: { roles: ['ETUDIANT'], titre: 'Correspondances', ticket: 'AL-49' },
    loadComponent: enConstruction,
  },
];

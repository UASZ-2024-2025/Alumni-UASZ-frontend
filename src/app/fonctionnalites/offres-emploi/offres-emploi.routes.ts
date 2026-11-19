
import { inject, Provider } from '@angular/core';
import { CanMatchFn, Routes } from '@angular/router';
import { StudentsService } from '../../api/generes/alumni/api/students.service';
import { BASE_PATH as BASE_PATH_ALUMNI } from '../../api/generes/alumni/variables';
import { ApplicationsService } from '../../api/generes/offres-emploi/api/applications.service';
import { OffersService } from '../../api/generes/offres-emploi/api/offers.service';
import { ProposalsService } from '../../api/generes/offres-emploi/api/proposals.service';
import { BASE_PATH as BASE_PATH_OFFRES } from '../../api/generes/offres-emploi/variables';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';
import { roleGuard } from '../../socle/gardes-routes/role.guard';
import { environment } from '../../../environments/environment';

const enConstruction = () =>
  import('../../commun/components/page-en-construction/page-en-construction')
    .then((m) => m.PageEnConstruction);

const ROLES_OFFRES = ['ALUMNI', 'ETUDIANT', 'ENTREPRISE', 'ADMINISTRATEUR'];

// Provisoire : à retirer quand le BASE_PATH sera déclaré dans app.config.ts
const fournisseursOffres: Provider[] = [
  { provide: BASE_PATH_OFFRES, useValue: environment.urlsApi.offres },
  { provide: BASE_PATH_ALUMNI, useValue: environment.urlsApi.alumni },
  OffersService,
  ApplicationsService,
  ProposalsService,
  StudentsService, // CV de l'étudiant pour le formulaire de candidature (ALUM-204)
];

const estEtudiant: CanMatchFn = () =>
  inject(AuthentificationService).role() === 'ETUDIANT';

/** Squelette (AL-49) : remplacer chaque enConstruction par la vraie page. */
export const OFFRES_EMPLOI_ROUTES: Routes = [
  {
    path: 'offres-emploi',
    title: "Offres d'emploi",
    canActivate: [roleGuard],
    data: { roles: ROLES_OFFRES, titre: "Offres d'emploi", ticket: 'AL-49' },
    providers: fournisseursOffres,
    loadComponent: () => import('./pages/liste-offres').then((m) => m.ListeOffres),
  },
  {
    path: 'offres-emploi/:id',
    title: "Détail de l'offre",
    canActivate: [roleGuard],
    data: { roles: ROLES_OFFRES, titre: "Détail de l'offre", ticket: 'AL-49' },
    providers: fournisseursOffres,
    loadComponent: () => import('./pages/detail-offre').then((m) => m.DetailOffre),
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

import { Provider } from '@angular/core';
import { Routes } from '@angular/router';
import { AlumniService } from '../../api/generes/alumni/api/alumni.service';
import { StudentsService } from '../../api/generes/alumni/api/students.service';
import { BASE_PATH as BASE_PATH_ALUMNI } from '../../api/generes/alumni/variables';
import { GroupMessagingService } from '../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { PrivateMessagingService } from '../../api/generes/notifications-messagerie/api/privateMessaging.service';
import { BASE_PATH as BASE_PATH_MESSAGERIE } from '../../api/generes/notifications-messagerie/variables';
import { roleGuard } from '../../socle/gardes-routes/role.guard';
import { environment } from '../../../environments/environment';

const enConstruction = () =>
  import('../../commun/components/page-en-construction/page-en-construction').then((m) => m.PageEnConstruction);

// Provisoire : à retirer quand les BASE_PATH messagerie et alumni seront déclarés dans app.config.ts
const fournisseursPrive: Provider[] = [
  { provide: BASE_PATH_MESSAGERIE, useValue: environment.urlsApi.messagerie },
  PrivateMessagingService,
];

const fournisseursGroupes: Provider[] = [
  { provide: BASE_PATH_MESSAGERIE, useValue: environment.urlsApi.messagerie },
  { provide: BASE_PATH_ALUMNI, useValue: environment.urlsApi.alumni },
  GroupMessagingService,
  StudentsService,
  AlumniService,
];

/** Squelette (AL-50) : remplacer chaque `enConstruction` par la vraie page. Rôles à confirmer avec l'équipe back. */
export const MESSAGERIE_ROUTES: Routes = [
  {
    // ALUM-184 : la liste des conversations reste affichée, le fil `/messagerie/:recipientId` s'ouvre à côté.
    path: 'messagerie',
    title: 'Messagerie',
    canActivate: [roleGuard],
    data: { roles: ['ALUMNI', 'ETUDIANT', 'ENSEIGNANT', 'ENTREPRISE', 'ADMINISTRATEUR'] },
    providers: fournisseursPrive,
    loadComponent: () => import('./prive/pages/conversations').then((m) => m.Conversations),
    children: [
      { path: ':recipientId', loadComponent: () => import('./prive/pages/fil-conversation').then((m) => m.FilConversation) },
    ],
  },
  {
    // ALUM-185 : la liste reste affichée, le fil `/groupes/:id` s'ouvre à côté (un non-membre reçoit un 403 du back).
    path: 'groupes',
    title: 'Groupes de discussion',
    canActivate: [roleGuard],
    data: { roles: ['ALUMNI', 'ETUDIANT', 'ENSEIGNANT', 'ADMINISTRATEUR'] },
    providers: fournisseursGroupes,
    loadComponent: () => import('./groupes/pages/groupes').then((m) => m.Groupes),
    children: [{ path: ':id', loadComponent: () => import('./groupes/pages/fil-groupe').then((m) => m.FilGroupe) }],
  },
  {
    path: 'notifications',
    title: 'Notifications',
    canActivate: [roleGuard],
    data: { roles: ['ALUMNI', 'ETUDIANT', 'ENSEIGNANT', 'ENTREPRISE', 'ADMINISTRATEUR'], titre: 'Notifications', ticket: 'AL-50' },
    loadComponent: enConstruction,
  },
];
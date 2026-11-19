import { Provider } from '@angular/core';
import { Routes } from '@angular/router';
import { PrivateMessagingService } from '../../api/generes/notifications-messagerie/api/privateMessaging.service';
import { BASE_PATH as BASE_PATH_MESSAGERIE } from '../../api/generes/notifications-messagerie/variables';
import { roleGuard } from '../../socle/gardes-routes/role.guard';
import { environment } from '../../../environments/environment';

const enConstruction = () =>
  import('../../commun/components/page-en-construction/page-en-construction').then((m) => m.PageEnConstruction);

// Provisoire : à retirer quand le BASE_PATH messagerie sera déclaré dans app.config.ts
const fournisseursPrive: Provider[] = [
  { provide: BASE_PATH_MESSAGERIE, useValue: environment.urlsApi.messagerie },
  PrivateMessagingService,
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
    path: 'notifications',
    title: 'Notifications',
    canActivate: [roleGuard],
    data: { roles: ['ALUMNI', 'ETUDIANT', 'ENSEIGNANT', 'ENTREPRISE', 'ADMINISTRATEUR'], titre: 'Notifications', ticket: 'AL-50' },
    loadComponent: enConstruction,
  },
];
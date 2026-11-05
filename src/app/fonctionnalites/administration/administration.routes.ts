import { Routes } from '@angular/router';
import { BASE_PATH as BASE_PATH_ALUMNI } from '../../api/generes/alumni/variables';
import { CompaniesService } from '../../api/generes/alumni/api/companies.service';
import { BASE_PATH as BASE_PATH_ANALYSES } from '../../api/generes/analyses-correspondances/variables';
import { AnalyticsReportsService } from '../../api/generes/analyses-correspondances/api/analyticsReports.service';
import { DashboardService } from '../../api/generes/analyses-correspondances/api/dashboard.service';
import { environment } from '../../../environments/environment';

export const ADMINISTRATION_ROUTES: Routes = [
  {
    path: '',
    // Provisoire : à retirer quand les BASE_PATH alumni et analyses seront déclarés dans app.config.ts
    providers: [
      { provide: BASE_PATH_ALUMNI, useValue: environment.urlsApi.alumni },
      { provide: BASE_PATH_ANALYSES, useValue: environment.urlsApi.analyses },
      CompaniesService,
      DashboardService,
      AnalyticsReportsService,
    ],
    loadComponent: () => import('./pages/administration').then((m) => m.Administration),
    children: [
      {
        path: '',
        title: 'Tableau de bord',
        loadComponent: () => import('./pages/tableau-de-bord').then((m) => m.TableauDeBord),
      },
      {
        path: 'utilisateurs',
        title: 'Gestion des utilisateurs',
        loadComponent: () =>
          import('./pages/gestion-utilisateurs').then((m) => m.GestionUtilisateurs),
      },
      {
        path: 'entreprises',
        title: 'Entreprises partenaires',
        loadComponent: () =>
          import('./pages/gestion-entreprises').then((m) => m.GestionEntreprises),
      },
    ],
  },
];

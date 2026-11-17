import { Routes } from '@angular/router';
import { BASE_PATH as BASE_PATH_ANALYSES } from '../../api/generes/analyses-correspondances/variables';
import { AnalyticsReportsService } from '../../api/generes/analyses-correspondances/api/analyticsReports.service';
import { DashboardService } from '../../api/generes/analyses-correspondances/api/dashboard.service';
import { environment } from '../../../environments/environment';
import { roleGuard } from '../../socle/gardes-routes/role.guard';

/** Statistiques : tableau de bord complet pour l'administrateur ; l'enseignant garde l'accès mais sans appel tant que le back ne lui ouvre pas ces API. */
export const STATISTIQUES_ROUTES: Routes = [
  {
    path: 'statistiques',
    title: 'Statistiques',
    canActivate: [roleGuard],
    data: { roles: ['ENSEIGNANT', 'ADMINISTRATEUR'] },
    // Provisoire, comme dans administration.routes.ts : à retirer quand les BASE_PATH seront déclarés dans app.config.ts
    providers: [{ provide: BASE_PATH_ANALYSES, useValue: environment.urlsApi.analyses }, DashboardService, AnalyticsReportsService],
    loadComponent: () => import('./pages/statistiques').then((m) => m.Statistiques),
  },
];

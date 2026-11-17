import { Routes } from '@angular/router';
import { BASE_PATH as BASE_PATH_ANALYSES } from '../../api/generes/analyses-correspondances/variables';
import { AnalyticsReportsService } from '../../api/generes/analyses-correspondances/api/analyticsReports.service';
import { DashboardService } from '../../api/generes/analyses-correspondances/api/dashboard.service';
import { environment } from '../../../environments/environment';
import { roleGuard } from '../../socle/gardes-routes/role.guard';

/** Statistiques de l'enseignant et de l'administrateur : même page que le tableau de bord, sans les blocs réservés à l'administrateur. */
export const STATISTIQUES_ROUTES: Routes = [
  {
    path: 'statistiques',
    title: 'Statistiques',
    canActivate: [roleGuard],
    data: { roles: ['ENSEIGNANT', 'ADMINISTRATEUR'] },
    // Provisoire, comme dans administration.routes.ts : à retirer quand les BASE_PATH seront déclarés dans app.config.ts
    providers: [{ provide: BASE_PATH_ANALYSES, useValue: environment.urlsApi.analyses }, DashboardService, AnalyticsReportsService],
    loadComponent: () => import('../administration/pages/tableau-de-bord').then((m) => m.TableauDeBord),
  },
];

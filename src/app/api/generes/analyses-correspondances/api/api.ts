export * from './analyticsReports.service';
import { AnalyticsReportsService } from './analyticsReports.service';
export * from './dashboard.service';
import { DashboardService } from './dashboard.service';
export * from './matchings.service';
import { MatchingsService } from './matchings.service';
export const APIS = [AnalyticsReportsService, DashboardService, MatchingsService];

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalyticsReportsService } from '../../../api/generes/analyses-correspondances/api/analyticsReports.service';
import { DashboardService } from '../../../api/generes/analyses-correspondances/api/dashboard.service';
import { UsersService } from '../../../api/generes/utilisateurs/api/users.service';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { Statistiques } from './statistiques';

describe('Statistiques', () => {
  const monter = (admin: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthentificationService, useValue: { estAdministrateur: signal(admin) } },
        { provide: DashboardService, useValue: { getDashboardStats: vi.fn(() => of({})) } },
        { provide: AnalyticsReportsService, useValue: { getInsertionReport: vi.fn(() => of({})), getSkillsGapReport: vi.fn(() => of({})) } },
        { provide: UsersService, useValue: { listUsers: vi.fn(() => of({ totalElements: 0 })) } },
      ],
    });
    const fixture = TestBed.createComponent(Statistiques);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it("affiche le tableau de bord complet à l'administrateur", () => {
    expect(monter(true).querySelector('h1')!.textContent).toBe('Statistiques');
  });

  it("affiche le message d'attente à l'enseignant", () => {
    expect(monter(false).textContent).toContain('Statistiques bientôt disponibles');
  });
});

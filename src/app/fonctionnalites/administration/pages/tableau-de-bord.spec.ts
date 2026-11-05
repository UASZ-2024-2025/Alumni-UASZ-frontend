import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AnalyticsReportsService } from '../../../api/generes/analyses-correspondances/api/analyticsReports.service';
import { DashboardService } from '../../../api/generes/analyses-correspondances/api/dashboard.service';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { TableauDeBord } from './tableau-de-bord';

const stats = { alumniCount: 320, studentCount: 1450, companyCount: 23, insertionRate: 68.4, internshipCount: 87, jobOfferCount: 42 };
const insertion = {
  overallInsertionRate: 68.4,
  reportData: [
    { graduationYear: 2023, specialty: 'Réseaux', totalGraduates: 30, employedCount: 18, insertionRate: 60 },
    { graduationYear: 2024, specialty: 'Génie Logiciel', totalGraduates: 45, employedCount: 36, insertionRate: 80 },
  ],
};
const competences = {
  topRequiredSkills: ['Angular'],
  skillsGapAnalysis: [{ skillName: 'Angular', demandPercentage: 80, supplyPercentage: 45, gap: 35 }],
};

describe('TableauDeBord', () => {
  let dashboard: { getDashboardStats: ReturnType<typeof vi.fn> };
  let rapports: { getInsertionReport: ReturnType<typeof vi.fn>; getSkillsGapReport: ReturnType<typeof vi.fn> };

  const monter = () => {
    const fixture = TestBed.createComponent(TableauDeBord);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    dashboard = { getDashboardStats: vi.fn(() => of(stats)) };
    rapports = {
      getInsertionReport: vi.fn(() => of(insertion)),
      getSkillsGapReport: vi.fn(() => of(competences)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: DashboardService, useValue: dashboard },
        { provide: AnalyticsReportsService, useValue: rapports },
      ],
    });
  });

  it('affiche les 6 indicateurs', () => {
    const el = monter();
    expect(el.querySelectorAll('.kpi').length).toBe(6);
    expect(el.textContent).toContain('1450');
    expect(el.textContent).toContain('68.4 %');
    expect(el.textContent).toContain("Offres d'emploi publiées");
  });

  it('remplace les valeurs absentes par un tiret', () => {
    dashboard.getDashboardStats.mockReturnValue(of({}));
    expect(monter().querySelector('.kpi dd')!.textContent!.trim()).toBe('—');
  });

  it("garde les graphiques quand seuls les indicateurs échouent", () => {
    dashboard.getDashboardStats.mockReturnValue(throwError(() => new ErreurApi(500, 'X', 'Service indisponible')));
    const el = monter();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Service indisponible');
    expect(el.querySelectorAll('app-graphique-barres').length).toBe(2);
  });

  it('alimente la liste des spécialités et filtre le rapport', () => {
    const el = monter();
    const options = [...el.querySelectorAll('select option')].map((o) => o.textContent!.trim());
    expect(options).toEqual(['Toutes', 'Génie Logiciel', 'Réseaux']);

    (el.querySelector('input[type="number"]') as HTMLInputElement).value = '2023';
    (el.querySelector('select') as HTMLSelectElement).value = 'Réseaux';
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(rapports.getInsertionReport).toHaveBeenLastCalledWith(2023, 'Réseaux');
  });

  it("affiche un état vide quand il n'y a aucune donnée", () => {
    rapports.getInsertionReport.mockReturnValue(of({ overallInsertionRate: 0, reportData: [] }));
    rapports.getSkillsGapReport.mockReturnValue(of({ skillsGapAnalysis: [] }));
    const texte = monter().textContent;
    expect(texte).toContain("Aucune donnée d'insertion");
    expect(texte).toContain('Aucune donnée de compétences');
  });
});

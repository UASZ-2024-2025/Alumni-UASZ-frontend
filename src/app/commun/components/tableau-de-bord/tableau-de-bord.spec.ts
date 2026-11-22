import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AnalyticsReportsService } from '../../../api/generes/analyses-correspondances/api/analyticsReports.service';
import { DashboardService } from '../../../api/generes/analyses-correspondances/api/dashboard.service';
import { UsersService } from '../../../api/generes/utilisateurs/api/users.service';
import { ErreurApi } from '../../modeles/erreur-api.model';
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
  let utilisateurs: { listUsers: ReturnType<typeof vi.fn> };
  let rapports: { getInsertionReport: ReturnType<typeof vi.fn>; getSkillsGapReport: ReturnType<typeof vi.fn> };

  const monter = (admin = true) => {
    const fixture = TestBed.createComponent(TableauDeBord);
    fixture.componentRef.setInput('admin', admin);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    utilisateurs = { listUsers: vi.fn(() => of({ content: [], totalElements: 5 })) };
    dashboard = { getDashboardStats: vi.fn(() => of(stats)) };
    rapports = {
      getInsertionReport: vi.fn(() => of(insertion)),
      getSkillsGapReport: vi.fn(() => of(competences)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: DashboardService, useValue: dashboard },
        { provide: AnalyticsReportsService, useValue: rapports },
        { provide: UsersService, useValue: utilisateurs },
      ],
    });
  });

  it('affiche les 6 indicateurs', () => {
    const el = monter();
    expect(el.querySelectorAll('app-carte-stat').length).toBe(6);
    expect(el.textContent).toContain('1450');
    expect(el.textContent).toContain('68.4 %');
    expect(el.textContent).toContain("Offres d'emploi publiées");
  });

  it('remplace les valeurs absentes par un tiret', () => {
    dashboard.getDashboardStats.mockReturnValue(of({}));
    expect(monter().querySelector('app-carte-stat b')!.textContent!.trim()).toBe('—');
  });

  it("garde les graphiques quand seuls les indicateurs échouent", () => {
    dashboard.getDashboardStats.mockReturnValue(throwError(() => new ErreurApi(500, 'X', 'Service indisponible')));
    const el = monter();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Service indisponible');
    expect(el.querySelectorAll('app-graphique-barres').length).toBe(2);
  });

  it('alimente la liste des spécialités et filtre le rapport', async () => {
    const el = monter();
    await Promise.resolve(); // ngModel branche ses contrôles en microtâche
    const options = [...el.querySelectorAll('select option')].map((o) => o.textContent!.trim());
    expect(options).toEqual(['Toutes', 'Génie Logiciel', 'Réseaux']);

    const annee = el.querySelector('input[type="number"]') as HTMLInputElement;
    annee.value = '2023';
    annee.dispatchEvent(new Event('input'));
    const choix = el.querySelector('select') as HTMLSelectElement;
    choix.value = 'Réseaux';
    choix.dispatchEvent(new Event('change'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(rapports.getInsertionReport).toHaveBeenLastCalledWith(2023, 'Réseaux');
  });

  it('affiche les répartitions et le taux global en anneaux', () => {
    const el = monter();
    expect(el.querySelectorAll('app-graphique-anneau').length).toBe(3);
    expect(el.textContent).toContain('Administrateur');
    expect(el.textContent).toContain('En attente');
    expect(el.querySelector('app-graphique-colonnes')).toBeTruthy();
  });

  it("garde le reste du tableau de bord quand les répartitions échouent", () => {
    TestBed.overrideProvider(UsersService, { useValue: { listUsers: vi.fn(() => throwError(() => new ErreurApi(500, 'X', 'Panne comptes'))) } });
    const el = monter();
    expect(el.textContent).toContain('Panne comptes');
    expect(el.querySelectorAll('app-carte-stat').length).toBe(6);
  });

  it("affiche un état vide quand il n'y a aucune donnée", () => {
    rapports.getInsertionReport.mockReturnValue(of({ overallInsertionRate: 0, reportData: [] }));
    rapports.getSkillsGapReport.mockReturnValue(of({ skillsGapAnalysis: [] }));
    const texte = monter().textContent;
    expect(texte).toContain("Aucune donnée d'insertion");
    expect(texte).toContain('Aucune donnée de compétences');
  });

  it("pour l'enseignant : message d'attente, aucun appel (ces API répondent 403 hors administrateur)", () => {
    const el = monter(false);
    expect(el.querySelector('h1')!.textContent).toBe('Statistiques');
    expect(el.textContent).toContain('Statistiques bientôt disponibles');
    expect(el.querySelector('app-carte-stat')).toBeNull();
    expect(dashboard.getDashboardStats).not.toHaveBeenCalled();
    expect(rapports.getInsertionReport).not.toHaveBeenCalled();
    expect(rapports.getSkillsGapReport).not.toHaveBeenCalled();
    expect(utilisateurs.listUsers).not.toHaveBeenCalled();
  });

  it('affiche un message clair quand un bloc répond 403', () => {
    const refus = () => throwError(() => new ErreurApi(403, 'FORBIDDEN', 'Action réservée à l\'Administrateur'));
    dashboard.getDashboardStats.mockReturnValue(refus());
    rapports.getSkillsGapReport.mockReturnValue(refus());
    const el = monter();
    expect(el.querySelectorAll('[role="alert"]').length).toBe(2);
    expect(el.textContent).toContain("Action réservée à l'Administrateur");
    expect(el.querySelectorAll('app-graphique-barres').length).toBe(1);
  });

  it("pour l'administrateur : titre Tableau de bord administrateur", () => {
    expect(monter().querySelector('h1')!.textContent).toBe('Tableau de bord administrateur');
  });
});

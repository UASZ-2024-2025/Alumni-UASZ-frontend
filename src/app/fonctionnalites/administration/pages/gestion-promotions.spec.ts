import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PromotionsService } from '../../../api/generes/alumni/api/promotions.service';
import { Promotion } from '../../../api/generes/alumni/model/promotion';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { ToastService } from '../../../commun/services/toast.service';
import { GestionPromotions } from './gestion-promotions';

const p2024: Promotion = { id: 'p1', academicYear: 2024, specialty: 'Informatique', graduateCount: 12 };
const p2025: Promotion = { id: 'p2', academicYear: 2025, specialty: 'Informatique', graduateCount: 0 };

describe('GestionPromotions', () => {
  let api: Record<'listPromotions' | 'createPromotion' | 'getPromotionGraduates', ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<GestionPromotions>;
  let el: HTMLElement;
  let toast: { succes: ReturnType<typeof vi.fn> };

  const creer = (annee: string, specialite: string) => {
    el.querySelector<HTMLButtonElement>('.entete-page button')!.click();
    fixture.detectChanges();
    const saisir = (nom: string, valeur: string) => {
      const champ = el.querySelector<HTMLInputElement>(`app-champ[formControlName="${nom}"] input`)!;
      champ.value = valeur;
      champ.dispatchEvent(new Event('input'));
    };
    saisir('academicYear', annee);
    saisir('specialty', specialite);
    el.querySelector<HTMLFormElement>('form.formulaire')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  const monter = () => {
    fixture = TestBed.createComponent(GestionPromotions);
    fixture.detectChanges();
    el = fixture.nativeElement;
  };

  beforeEach(() => {
    api = {
      listPromotions: vi.fn(() => of([p2024, p2025])),
      createPromotion: vi.fn(() => of({ id: 'p3', academicYear: 2026, specialty: 'Réseaux', graduateCount: 0 })),
      getPromotionGraduates: vi.fn(() => of([{ id: 's1', firstName: 'Awa', lastName: 'Fall', email: 'awa@uasz.sn' }])),
    };
    toast = { succes: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: PromotionsService, useValue: api }, { provide: ToastService, useValue: toast }] });
  });

  it("liste les promotions, l'année la plus récente d'abord", () => {
    monter();
    const annees = [...el.querySelectorAll('tbody tr td:first-child')].map((c) => c.textContent!.trim());
    expect(annees).toEqual(['2025', '2024']);
  });

  it("affiche l'état vide quand il n'y a aucune promotion", () => {
    api.listPromotions.mockReturnValue(of([]));
    monter();
    expect(el.textContent).toContain('Aucune promotion');
  });

  it('refuse un formulaire invalide', () => {
    monter();
    creer('1999', '');
    expect(api.createPromotion).not.toHaveBeenCalled();
    expect(el.textContent).toContain('La spécialité est obligatoire');
  });

  it('crée une promotion puis recharge la liste', () => {
    monter();
    creer('2026', ' Réseaux ');
    expect(api.createPromotion).toHaveBeenCalledWith({ academicYear: 2026, specialty: 'Réseaux' });
    expect(api.listPromotions).toHaveBeenCalledTimes(2);
    expect(toast.succes).toHaveBeenCalled();
  });

  it('affiche le message du 409 à la création', () => {
    monter();
    api.createPromotion.mockReturnValue(throwError(() => new ErreurApi(409, 'EXISTS', 'Promotion déjà existante')));
    creer('2024', 'Informatique');
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Promotion déjà existante');
  });

  it('affiche les diplômés d’une promotion', () => {
    monter();
    el.querySelector<HTMLButtonElement>('button[aria-label^="Voir les diplômés 2025"]')!.click();
    fixture.detectChanges();
    expect(api.getPromotionGraduates).toHaveBeenCalledWith('p2');
    expect(el.textContent).toContain('Awa Fall');
  });

  it('traduit le 403 au chargement (non administrateur)', () => {
    api.listPromotions.mockReturnValue(throwError(() => new ErreurApi(403, 'FORBIDDEN', 'x')));
    monter();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain("réservée à l'administrateur");
  });

  it("signale une promotion disparue (404) sur les diplômés", () => {
    monter();
    api.getPromotionGraduates.mockReturnValue(throwError(() => new ErreurApi(404, 'NF', 'x')));
    el.querySelector<HTMLButtonElement>('button[aria-label^="Voir les diplômés 2024"]')!.click();
    fixture.detectChanges();
    expect(el.textContent).toContain("n'existe plus");
  });
});

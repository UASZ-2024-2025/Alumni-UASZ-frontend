import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { MatchingsService } from '../../../api/generes/analyses-correspondances/api/matchings.service';
import { OfferMatchResult } from '../../../api/generes/analyses-correspondances/model/offerMatchResult';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { OffresRecommandees } from './offres-recommandees';

const OFFRES: OfferMatchResult[] = [
  { offerId: 'o1', offerTitle: 'Développeur Java', companyName: 'Sonatel', matchScore: 60, matchingSkills: ['Java'], missingSkills: ['Kubernetes', 'Docker'] },
  { offerId: 'o2', offerTitle: 'Développeur Angular', companyName: 'Orange', matchScore: 90, matchingSkills: ['Angular', 'TypeScript'], missingSkills: [] },
];

describe('OffresRecommandees', () => {
  let api: { getMatchingOffersForStudent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { getMatchingOffersForStudent: vi.fn() };
    TestBed.configureTestingModule({
      imports: [OffresRecommandees],
      providers: [
        provideRouter([]),
        { provide: MatchingsService, useValue: api },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: 'e1' }) } },
      ],
    });
  });

  const monter = async (reponse$: Observable<OfferMatchResult[]>) => {
    api.getMatchingOffersForStudent.mockReturnValue(reponse$);
    const fixture: ComponentFixture<OffresRecommandees> = TestBed.createComponent(OffresRecommandees);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };

  it("demande les recommandations de l'étudiant connecté avec le score minimum par défaut", async () => {
    await monter(of(OFFRES));
    expect(api.getMatchingOffersForStudent).toHaveBeenCalledWith('e1', 50);
  });

  it('affiche le score et les compétences manquantes, les meilleures offres en premier', async () => {
    const { el } = await monter(of(OFFRES));
    const cartes = el.querySelectorAll('ul.propositions > li');
    expect(cartes.length).toBe(2);
    expect(cartes[0].textContent).toContain('Développeur Angular');
    expect(cartes[0].textContent).toContain('90 %');
    expect(cartes[1].textContent).toContain('60 %');
    expect(cartes[1].textContent).toContain('Kubernetes');
    expect(cartes[1].textContent).toContain('Docker');
  });

  it('affiche un état vide quand aucune offre ne correspond', async () => {
    const { el } = await monter(of([]));
    expect(el.textContent).toContain('Aucune offre recommandée');
  });

  it("affiche un message clair quand le profil étudiant est introuvable", async () => {
    const { el } = await monter(throwError(() => new ErreurApi(404, 'NOT_FOUND', 'Introuvable')));
    expect(el.textContent).toContain('profil étudiant est introuvable');
  });
});

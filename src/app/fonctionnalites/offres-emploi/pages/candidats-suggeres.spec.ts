import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { MatchingsService } from '../../../api/generes/analyses-correspondances/api/matchings.service';
import { CandidateMatchResult } from '../../../api/generes/analyses-correspondances/model/candidateMatchResult';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { OffresEntrepriseService } from '../services/offres-entreprise.service';
import { CandidatsSuggeres } from './candidats-suggeres';

const CANDIDATS: CandidateMatchResult[] = [
  { studentId: 's1', studentName: 'Aminata Sow', specialty: 'Génie Logiciel', matchScore: 70, matchingSkills: ['Java'] },
  { studentId: 's2', studentName: 'Moussa Ndiaye', specialty: 'Réseaux', matchScore: 92, matchingSkills: ['Java', 'Spring Boot'] },
];

describe('CandidatsSuggeres', () => {
  let api: { getMatchingCandidatesForOffer: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { getMatchingCandidatesForOffer: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CandidatsSuggeres],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'o1' }) } } },
        { provide: MatchingsService, useValue: api },
        { provide: OffresEntrepriseService, useValue: { offre: () => of({ id: 'o1', title: 'Développeur Java' }) } },
      ],
    });
  });

  const monter = async (reponse$: Observable<CandidateMatchResult[]>) => {
    api.getMatchingCandidatesForOffer.mockReturnValue(reponse$);
    const fixture: ComponentFixture<CandidatsSuggeres> = TestBed.createComponent(CandidatsSuggeres);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it("demande les candidats de l'offre ouverte et affiche son titre", async () => {
    const el = await monter(of(CANDIDATS));
    expect(api.getMatchingCandidatesForOffer).toHaveBeenCalledWith('o1', 60);
    expect(el.querySelector('.meta')!.textContent).toContain('Développeur Java');
  });

  it('affiche score et compétences en commun, le meilleur candidat en premier', async () => {
    const el = await monter(of(CANDIDATS));
    const cartes = el.querySelectorAll('ul.propositions > li');
    expect(cartes[0].textContent).toContain('Moussa Ndiaye');
    expect(cartes[0].textContent).toContain('92 %');
    expect(cartes[0].textContent).toContain('Spring Boot');
    expect(cartes[1].textContent).toContain('70 %');
  });

  it('affiche un état vide sans candidat', async () => {
    const el = await monter(of([]));
    expect(el.textContent).toContain('Aucun candidat suggéré');
  });

  it("explique le refus 403 à un recruteur qui n'est pas l'auteur de l'offre", async () => {
    const el = await monter(throwError(() => new ErreurApi(403, 'FORBIDDEN', 'Interdit')));
    expect(el.textContent).toContain("seul l'auteur de l'offre");
  });
});

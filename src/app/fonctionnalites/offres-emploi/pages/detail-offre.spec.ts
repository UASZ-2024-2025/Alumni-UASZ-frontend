import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OffersService } from '../../../api/generes/offres-emploi/api/offers.service';
import { JobOffer } from '../../../api/generes/offres-emploi/model/jobOffer';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { DetailOffre } from './detail-offre';

const offre: JobOffer = {
  id: 'o1',
  title: 'Développeur Angular',
  type: 'JOB',
  description: 'Vous développez des interfaces web.',
  companyName: 'Orange',
  location: 'Dakar',
  remoteType: 'HYBRID',
  requiredSkills: ['Angular', 'TypeScript'],
  durationMonths: 6,
  deadline: '2026-12-31',
  status: 'OPEN',
};

describe('DetailOffre', () => {
  let api: { getOfferById: ReturnType<typeof vi.fn> };
  let el: HTMLElement;

  function creer(id: string | null = 'o1'): ComponentFixture<DetailOffre> {
       TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: OffersService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    const fixture = TestBed.createComponent(DetailOffre);
    fixture.detectChanges();
    el = fixture.nativeElement;
    return fixture;
  }

  beforeEach(() => {
    api = { getOfferById: vi.fn(() => of(offre)) };
  });

  it("charge l'offre demandée et affiche ses informations", () => {
    creer();
    expect(api.getOfferById).toHaveBeenCalledWith('o1');
    expect(el.textContent).toContain('Développeur Angular');
    expect(el.textContent).toContain('Orange');
    expect(el.textContent).toContain('Vous développez des interfaces web.');
    expect(el.textContent).toContain('Angular');
    expect(el.textContent).toContain('TypeScript');
    expect(el.textContent).toContain('Ouverte');
    expect(el.textContent).toContain('Hybride');
    expect(el.textContent).toContain('6 mois');
  });

  it("n'affiche pas le bouton Postuler (ALUM-204, Sprint 3)", () => {
    creer();
    expect(el.textContent).not.toContain('Postuler');
  });

  it('propose un retour vers la liste', () => {
    creer();
    expect(el.querySelector('a.retour')!.getAttribute('href')).toBe('/offres-emploi');
  });

  it('affiche un message clair quand l’offre est introuvable (404)', () => {
    api.getOfferById.mockReturnValue(throwError(() => new ErreurApi(404, 'OFFER_NOT_FOUND', 'Offre introuvable.')));
    creer();
    expect(el.textContent).toContain('Cette offre est introuvable.');
    expect(el.querySelector('h1')).toBeNull();
  });

  it('affiche le message du service quand la session a expiré (401)', () => {
    api.getOfferById.mockReturnValue(throwError(() => new ErreurApi(401, 'TOKEN_EXPIRED', 'Session expirée.')));
    creer();
    expect(el.textContent).toContain('Session expirée.');
  });

  it("n'appelle pas le service sans identifiant dans l'adresse", () => {
    creer(null);
    expect(api.getOfferById).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Cette offre est introuvable.');
  });
});
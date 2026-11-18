import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OffersService } from '../../../api/generes/offres-emploi/api/offers.service';
import { JobOffer } from '../../../api/generes/offres-emploi/model/jobOffer';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { ListeOffres } from './liste-offres';

const offre: JobOffer = {
  id: 'o1',
  title: 'Développeur Angular',
  type: 'JOB',
  companyName: 'Orange',
  location: 'Dakar',
  remoteType: 'HYBRID',
  deadline: '2026-12-31',
  status: 'OPEN',
};
const page = (content: JobOffer[]) => ({ content, totalElements: content.length, page: 0, size: 10 });

describe('ListeOffres', () => {
  let api: { searchOffers: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<ListeOffres>;
  let el: HTMLElement;

  beforeEach(() => {
    api = { searchOffers: vi.fn(() => of(page([offre]))) };
    TestBed.configureTestingModule({
      providers: [{ provide: OffersService, useValue: api }, provideRouter([])],
    });
    fixture = TestBed.createComponent(ListeOffres);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('charge la première page au démarrage', () => {
    expect(api.searchOffers).toHaveBeenCalledWith(
      undefined, undefined, undefined, undefined, undefined, undefined, 0, 10,
    );
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
    expect(el.textContent).toContain('Développeur Angular');
    expect(el.textContent).toContain('Orange');
    expect(el.textContent).toContain('Ouverte');
  });

  it("ouvre le détail de l'offre au clic sur son titre", () => {
    const lien = el.querySelector<HTMLAnchorElement>('tbody a')!;
    expect(lien.getAttribute('href')).toBe('/offres-emploi/o1');
  });

  it('filtre par type', () => {
    const choix = el.querySelector<HTMLSelectElement>('select')!;
    choix.value = 'INTERNSHIP';
    choix.dispatchEvent(new Event('change'));
    expect(api.searchOffers).toHaveBeenLastCalledWith(
      undefined, 'INTERNSHIP', undefined, undefined, undefined, undefined, 0, 10,
    );
  });

  it('affiche un message quand aucune offre ne correspond', () => {
    api.searchOffers.mockReturnValue(of(page([])));
    const choix = el.querySelector<HTMLSelectElement>('select')!;
    choix.value = 'JOB';
    choix.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Aucune offre ne correspond');
  });

  it("affiche l'erreur du service", () => {
    api.searchOffers.mockReturnValue(throwError(() => new ErreurApi(500, 'SERVER_ERROR', 'Service indisponible.')));
    const choix = el.querySelector<HTMLSelectElement>('select')!;
    choix.value = 'JOB';
    choix.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Service indisponible.');
  });
});
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { JobOffer, JobOfferPagedResponse } from '../../../api/generes/offres-emploi';
import { OffresEntrepriseService } from '../services/offres-entreprise.service';
import { MesOffres } from './mes-offres';

const OUVERTE: JobOffer = {
  id: '1', title: 'Développeur Angular', type: 'JOB', location: 'Ziguinchor',
  status: 'OPEN', createdAt: '2026-11-17T09:00:00Z',
};
const STAGE_CLOTURE: JobOffer = {
  id: '2', title: 'Stage Data', type: 'INTERNSHIP', location: 'Dakar',
  status: 'CLOSED', createdAt: '2026-11-10T09:00:00Z',
};
const page = (content: JobOffer[], totalElements = content.length): JobOfferPagedResponse => ({
  content, totalElements, page: 0, size: 10,
});

describe('MesOffres', () => {
  const mesOffres = vi.fn();

  beforeEach(() => {
    mesOffres.mockReset();
    TestBed.configureTestingModule({
      imports: [MesOffres],
      providers: [provideRouter([]), { provide: OffresEntrepriseService, useValue: { mesOffres } }],
    });
  });

  const monter = (reponse$: Observable<JobOfferPagedResponse>) => {
    mesOffres.mockReturnValue(reponse$);
    const fixture = TestBed.createComponent(MesOffres);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };

  it("charge la première page et affiche les offres de l'entreprise", () => {
    const { el } = monter(of(page([OUVERTE, STAGE_CLOTURE])));
    expect(mesOffres).toHaveBeenCalledWith(0, 10);

    const lignes = el.querySelectorAll('tbody tr');
    expect(lignes.length).toBe(2);
    expect(lignes[0].textContent).toContain('Développeur Angular');
    expect(lignes[0].textContent).toContain('Emploi');
    expect(lignes[0].textContent).toContain('17/11/2026');
    expect(lignes[0].querySelector('.badge--ok')!.textContent).toContain('Ouverte');
    expect(lignes[1].textContent).toContain('Stage');
    expect(lignes[1].querySelector('.badge--attention')!.textContent).toContain('Clôturée');
  });

  it('affiche un lien vers la publication', () => {
    const { el } = monter(of(page([OUVERTE])));
    expect(el.querySelector('a[href="/offres-emploi/publier"]')).not.toBeNull();
  });

  it('propose pour chaque offre un lien vers ses candidatures reçues', () => {
    const { el } = monter(of(page([OUVERTE, STAGE_CLOTURE])));
    const liens = el.querySelectorAll('tbody a');
    expect(liens[0].getAttribute('href')).toBe('/offres-emploi/1/candidatures');
    expect(liens[1].getAttribute('href')).toBe('/offres-emploi/2/candidatures');
  });

  it("affiche l'état vide quand l'entreprise n'a aucune offre", () => {
    const { el } = monter(of(page([])));
    expect(el.textContent).toContain("Vous n'avez publié aucune offre pour le moment.");
    expect(el.querySelector('tbody')).toBeNull();
  });

  it('affiche le chargement tant que le serveur ne répond pas', () => {
    const { el } = monter(new Subject<JobOfferPagedResponse>());
    expect(el.querySelector('[role="status"]')).not.toBeNull();
    expect(el.querySelector('table')).toBeNull();
  });

  it("n'affiche pas la pagination pour une seule page", () => {
    const { el } = monter(of(page([OUVERTE, STAGE_CLOTURE])));
    expect(el.querySelector('app-pagination')).toBeNull();
  });

  it('affiche la pagination et charge la page suivante', () => {
    const { fixture, el } = monter(of(page([OUVERTE], 25)));
    expect(el.querySelector('app-pagination')!.textContent).toContain('Page 1 / 3');

    el.querySelectorAll<HTMLButtonElement>('app-pagination button')[1].click();
    fixture.detectChanges();
    expect(mesOffres).toHaveBeenLastCalledWith(1, 10);
  });

    const refus: [number, string][] = [
    [401, 'Votre session a expiré'],
    [403, 'pas encore validée'],
    [404, 'Entreprise introuvable'],
  ];
  refus.forEach(([status, message]) =>
    it(`affiche le message adapté pour un refus ${status}`, () => {
      const { el } = monter(throwError(() => new ErreurApi(status, 'ERREUR', 'Message du back.')));
      expect(el.querySelector('[role="alert"]')?.textContent).toContain(message);
      expect(el.querySelector('tbody')).toBeNull();
    }),
  );

  it('affiche le message réseau quand le serveur est injoignable', () => {
    const { el } = monter(
      throwError(() => new ErreurApi(0, 'RESEAU', 'Serveur injoignable. Vérifiez votre connexion.')),
    );
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Serveur injoignable');
  });

  it("propose « Ma fiche entreprise » quand le compte n'est rattaché à aucune fiche", () => {
    const { el } = monter(throwError(() => new ErreurApi(403, 'ACCOUNT_NOT_LINKED', "Votre compte n'est rattaché à aucune fiche entreprise.")));
    expect(el.textContent).toContain("Votre compte n'est rattaché à aucune fiche entreprise.");
    expect(el.querySelector('a[href="/entreprise/ma-fiche"]')).not.toBeNull();
  });

  it("ne propose pas la fiche pour un autre refus 403", () => {
    const { el } = monter(throwError(() => new ErreurApi(403, 'COMPANY_NOT_VALIDATED', 'non validée')));
    expect(el.querySelector('a[href="/entreprise/ma-fiche"]')).toBeNull();
  });
});

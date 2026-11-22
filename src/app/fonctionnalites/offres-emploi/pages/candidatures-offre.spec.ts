import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { Application } from '../../../api/generes/offres-emploi/model/application';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { ConfirmationService } from '../../../commun/services/confirmation.service';
import { ToastService } from '../../../commun/services/toast.service';
import { OffresEntrepriseService } from '../services/offres-entreprise.service';
import { CandidaturesOffre } from './candidatures-offre';

const RECUE: Application = {
  id: 'a1', offerId: 'o1', offerTitle: 'Développeur Angular', studentId: 'e1', studentName: 'Moussa Ndiaye',
  cvId: 'cv-1', coverLetter: 'Très motivé par ce poste.', status: 'SUBMITTED', createdAt: '2026-11-15T09:00:00Z',
};
const SANS_CV: Application = {
  id: 'a2', offerId: 'o1', offerTitle: 'Développeur Angular', studentId: 'e2', studentName: 'Aminata Sow',
  status: 'ACCEPTED', createdAt: '2026-11-14T09:00:00Z',
};

describe('CandidaturesOffre', () => {
  let service: {
    offre: ReturnType<typeof vi.fn>;
    candidaturesRecues: ReturnType<typeof vi.fn>;
    changerStatut: ReturnType<typeof vi.fn>;
  };
  let confirmation: { demander: ReturnType<typeof vi.fn> };
  let toast: { succes: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = {
      offre: vi.fn(() => of({ id: 'o1', title: 'Développeur Angular' })),
      candidaturesRecues: vi.fn(),
      changerStatut: vi.fn((id: string, status: string) => of({ ...RECUE, id, status })),
    };
    confirmation = { demander: vi.fn(() => Promise.resolve(true)) };
    toast = { succes: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CandidaturesOffre],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'o1' }) } } },
        { provide: OffresEntrepriseService, useValue: service },
        { provide: ConfirmationService, useValue: confirmation },
        { provide: ToastService, useValue: toast },
      ],
    });
  });

  const monter = (reponse$: Observable<Application[]>) => {
    service.candidaturesRecues.mockReturnValue(reponse$);
    const fixture: ComponentFixture<CandidaturesOffre> = TestBed.createComponent(CandidaturesOffre);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };
  const attendre = async (fixture: ComponentFixture<CandidaturesOffre>) => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const choisir = (el: HTMLElement, ligne: number, statut: string) => {
    const ligneEl = el.querySelectorAll('tbody tr')[ligne];
    const select = ligneEl.querySelector<HTMLSelectElement>('select')!;
    select.value = statut;
    select.dispatchEvent(new Event('change'));
    ligneEl.querySelector<HTMLButtonElement>('app-bouton button')!.click();
  };

  // --- ALUM-209 : liste ---

  it("charge les candidatures de l'offre ouverte et affiche son titre", () => {
    const { el } = monter(of([RECUE]));
    expect(service.candidaturesRecues).toHaveBeenCalledWith('o1');
    expect(el.querySelector('.meta')!.textContent).toContain('Développeur Angular');
  });

  it("affiche l'étudiant, la date, le CV, la lettre et le statut", () => {
    const { el } = monter(of([RECUE, SANS_CV]));
    const lignes = el.querySelectorAll('tbody tr');
    expect(lignes.length).toBe(2);
    expect(lignes[0].textContent).toContain('Moussa Ndiaye');
    expect(lignes[0].textContent).toContain('15/11/2026');
    expect(lignes[0].textContent).toContain('CV joint');
    expect(lignes[0].querySelector('details blockquote')!.textContent).toContain('Très motivé par ce poste.');
    expect(lignes[0].querySelector('.badge--neutre')!.textContent).toContain('Envoyée');
    expect(lignes[1].textContent).toContain('Aucun CV');
    expect(lignes[1].querySelector('details')).toBeNull();
  });

  it('affiche le chargement tant que le serveur ne répond pas', () => {
    const { el } = monter(new Subject<Application[]>());
    expect(el.querySelector('[role="status"]')).not.toBeNull();
    expect(el.querySelector('table')).toBeNull();
  });

  it("affiche l'état vide quand l'offre n'a aucune candidature", () => {
    const { el } = monter(of([]));
    expect(el.textContent).toContain('Aucune candidature');
    expect(el.querySelector('table')).toBeNull();
  });

  it("affiche l'erreur du serveur sans candidature", () => {
    const { el } = monter(throwError(() => new ErreurApi(500, 'INTERNAL', 'Erreur interne du serveur.')));
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Erreur interne du serveur.');
    expect(el.querySelector('table')).toBeNull();
  });

  it('affiche le message réseau quand le serveur est injoignable', () => {
    const { el } = monter(throwError(() => new ErreurApi(0, 'RESEAU', 'Serveur injoignable. Vérifiez votre connexion.')));
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Serveur injoignable');
  });

  it("affiche un message clair si l'offre n'existe pas (404)", () => {
    const { el } = monter(throwError(() => new ErreurApi(404, 'OFFER_NOT_FOUND', 'Offre introuvable : o1')));
    expect(el.querySelector('[role="alert"]')!.textContent).toContain("n'existe pas");
  });

  // --- ALUM-211 : cas refusé (403) ---

  it("affiche le refus (403) et aucune candidature quand on n'est pas l'auteur de l'offre", () => {
    const { el } = monter(throwError(() => new ErreurApi(403, 'FORBIDDEN', 'Seul l\'auteur de l\'offre ...')));
    expect(el.querySelector('[role="alert"]')!.textContent).toContain("Accès refusé : seul l'auteur de l'offre");
    expect(el.querySelector('table')).toBeNull();
    expect(el.querySelector('app-etat-vide')).toBeNull();
    expect(el.textContent).not.toContain('Moussa Ndiaye');
  });

  // --- ALUM-210 : changement de statut ---

  it('ne propose que les statuts atteignables depuis le statut actuel', () => {
    const { el } = monter(of([RECUE]));
    const options = [...el.querySelectorAll<HTMLOptionElement>('tbody select option')].map((o) => o.value);
    expect(options).toEqual(['', 'UNDER_REVIEW', 'REJECTED']);
  });

  it("n'offre aucun changement pour une décision finale", () => {
    const { el } = monter(of([SANS_CV]));
    expect(el.querySelector('tbody select')).toBeNull();
    expect(el.querySelector('tbody tr')!.textContent).toContain('Décision finale');
  });

  it('change le statut, met la ligne à jour et prévient par un toast', async () => {
    const { fixture, el } = monter(of([RECUE]));
    choisir(el, 0, 'UNDER_REVIEW');
    await attendre(fixture);

    expect(confirmation.demander).not.toHaveBeenCalled();
    expect(service.changerStatut).toHaveBeenCalledWith('a1', 'UNDER_REVIEW');
    expect(toast.succes).toHaveBeenCalledWith("Candidature de Moussa Ndiaye : en cours d'examen.");
    expect(el.querySelector('tbody .badge--attention')!.textContent).toContain("En cours d'examen");
    const options = [...el.querySelectorAll<HTMLOptionElement>('tbody select option')].map((o) => o.value);
    expect(options).toEqual(['', 'SHORTLISTED', 'REJECTED']);
  });

  it("n'envoie rien tant qu'aucun nouveau statut n'est choisi", async () => {
    const { fixture, el } = monter(of([RECUE]));
    choisir(el, 0, '');
    await attendre(fixture);
    expect(service.changerStatut).not.toHaveBeenCalled();
  });

  it('demande une confirmation avant de refuser et envoie le refus une fois confirmé', async () => {
    const { fixture, el } = monter(of([RECUE]));
    choisir(el, 0, 'REJECTED');
    await attendre(fixture);

    expect(confirmation.demander).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    expect(service.changerStatut).toHaveBeenCalledWith('a1', 'REJECTED');
    expect(el.querySelector('tbody .badge--erreur')!.textContent).toContain('Non retenue');
  });

  it("n'envoie rien si le refus n'est pas confirmé", async () => {
    confirmation.demander.mockResolvedValue(false);
    const { fixture, el } = monter(of([RECUE]));
    choisir(el, 0, 'REJECTED');
    await attendre(fixture);

    expect(service.changerStatut).not.toHaveBeenCalled();
    expect(el.querySelector('tbody .badge--neutre')).not.toBeNull();
  });

  it('garde la liste et affiche un message si la transition est refusée (400)', async () => {
    service.changerStatut.mockReturnValue(throwError(() => new ErreurApi(400, 'INVALID_STATUS_TRANSITION', 'Transition interdite')));
    const { fixture, el } = monter(of([RECUE]));
    choisir(el, 0, 'UNDER_REVIEW');
    await attendre(fixture);

    expect(el.querySelector('[role="alert"]')!.textContent).toContain("n'est pas autorisé");
    expect(el.querySelector('tbody')!.textContent).toContain('Moussa Ndiaye');
    expect(el.querySelector('tbody .badge--neutre')!.textContent).toContain('Envoyée');
    expect(toast.succes).not.toHaveBeenCalled();
  });

  it('affiche le refus (403) lors du changement de statut', async () => {
    service.changerStatut.mockReturnValue(throwError(() => new ErreurApi(403, 'FORBIDDEN', 'Refusé')));
    const { fixture, el } = monter(of([RECUE]));
    choisir(el, 0, 'UNDER_REVIEW');
    await attendre(fixture);
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Accès refusé');
  });
});

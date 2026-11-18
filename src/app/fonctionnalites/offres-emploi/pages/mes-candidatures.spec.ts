import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApplicationsService } from '../../../api/generes/offres-emploi/api/applications.service';
import { ProposalsService } from '../../../api/generes/offres-emploi/api/proposals.service';
import { Application } from '../../../api/generes/offres-emploi/model/application';
import { Proposal } from '../../../api/generes/offres-emploi/model/proposal';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { ConfirmationService } from '../../../commun/services/confirmation.service';
import { ToastService } from '../../../commun/services/toast.service';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { MesCandidatures } from './mes-candidatures';

const candidature: Application = { id: 'a1', offerTitle: 'Stage Java', status: 'UNDER_REVIEW', createdAt: '2026-10-10T09:00:00Z' };
const enAttente: Proposal = { id: 'p1', offerTitle: 'Dev Angular', recruiterName: 'Ibou Ba', message: 'Bonjour', status: 'PENDING', createdAt: '2026-11-01T09:00:00Z' };
const expiree: Proposal = { id: 'p2', offerTitle: 'Stage data', recruiterName: 'Awa Diop', status: 'EXPIRED', createdAt: '2026-11-05T09:00:00Z' };

describe('MesCandidatures', () => {
  let candidaturesApi: { listMyApplications: ReturnType<typeof vi.fn> };
  let propositionsApi: { listProposals: ReturnType<typeof vi.fn>; updateProposalStatus: ReturnType<typeof vi.fn> };
  let confirmation: { demander: ReturnType<typeof vi.fn> };
  let toast: { succes: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<MesCandidatures>;
  let el: HTMLElement;

  const ouvrirPropositions = () => {
    el.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    fixture.detectChanges();
  };
  const bouton = (libelle: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('.proposition button')].find((b) => b.textContent?.includes(libelle))!;
  const attendre = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    candidaturesApi = { listMyApplications: vi.fn(() => of({ content: [candidature], totalElements: 1 })) };
    propositionsApi = {
      listProposals: vi.fn(() => of([expiree, enAttente])),
      updateProposalStatus: vi.fn((id: string, { status }: { status: string }) => of({ ...enAttente, status })),
    };
    confirmation = { demander: vi.fn(() => Promise.resolve(true)) };
    toast = { succes: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApplicationsService, useValue: candidaturesApi },
        { provide: ProposalsService, useValue: propositionsApi },
        { provide: ConfirmationService, useValue: confirmation },
        { provide: ToastService, useValue: toast },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: 'etu-1' }) } },
      ],
    });
    fixture = TestBed.createComponent(MesCandidatures);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it("charge les candidatures et les propositions de l'étudiant connecté", () => {
    expect(candidaturesApi.listMyApplications).toHaveBeenCalledWith('etu-1', undefined, 0, 10);
    expect(propositionsApi.listProposals).toHaveBeenCalledWith('etu-1');
    expect(el.querySelector('tbody')!.textContent).toContain('Stage Java');
    expect(el.querySelector('tbody')!.textContent).toContain("En cours d'examen");
  });

  it('filtre les candidatures par statut en revenant à la première page', async () => {
    await fixture.whenStable(); // NgModel s'enregistre dans le <form> de façon asynchrone
    const choix = el.querySelector<HTMLSelectElement>('select')!;
    choix.value = 'ACCEPTED';
    choix.dispatchEvent(new Event('change'));
    expect(candidaturesApi.listMyApplications).toHaveBeenLastCalledWith('etu-1', 'ACCEPTED', 0, 10);
  });

  it("indique dans l'onglet le nombre de propositions en attente", () => {
    expect(el.querySelectorAll('[role="tab"]')[1].textContent).toContain('Propositions reçues (1)');
  });

  it("affiche d'abord les propositions en attente, avec les boutons de réponse", () => {
    ouvrirPropositions();
    const titres = [...el.querySelectorAll('.proposition h2')].map((h) => h.textContent);
    expect(titres).toEqual(['Dev Angular', 'Stage data']);
    expect(el.querySelectorAll('.proposition .actions').length).toBe(1);
  });

  it('accepte une proposition après confirmation', async () => {
    ouvrirPropositions();
    bouton('Accepter').click();
    await attendre();
    expect(propositionsApi.updateProposalStatus).toHaveBeenCalledWith('p1', { status: 'ACCEPTED' });
    expect(toast.succes).toHaveBeenCalledWith('Proposition « Dev Angular » acceptée.');
    expect(el.textContent).toContain('Acceptée');
    expect(el.querySelector('.proposition .actions')).toBeNull();
  });

  it("n'envoie rien si le refus n'est pas confirmé", async () => {
    confirmation.demander.mockResolvedValue(false);
    ouvrirPropositions();
    bouton('Refuser').click();
    await attendre();
    expect(confirmation.demander).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    expect(propositionsApi.updateProposalStatus).not.toHaveBeenCalled();
  });

  it('affiche un message clair si la proposition a disparu', async () => {
    propositionsApi.updateProposalStatus.mockReturnValue(throwError(() => new ErreurApi(404, 'NOT_FOUND', 'Not found')));
    ouvrirPropositions();
    bouton('Refuser').click();
    await attendre();
    expect(el.querySelector('app-alerte')!.textContent).toContain("Cette proposition n'existe plus.");
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProposalsService } from '../../../api/generes/offres-emploi/api/proposals.service';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { PropositionsEnvoyees } from './propositions-envoyees';

describe('PropositionsEnvoyees', () => {
  let api: { listProposals: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<PropositionsEnvoyees>;
  let el: HTMLElement;

  const creer = () => {
    fixture = TestBed.createComponent(PropositionsEnvoyees);
    fixture.detectChanges();
    el = fixture.nativeElement;
  };

  beforeEach(() => {
    api = {
      listProposals: vi.fn(() =>
        of([{ id: 'p1', studentName: 'Moussa Ndiaye', offerTitle: 'Dev Angular', status: 'ACCEPTED' }]),
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ProposalsService, useValue: api },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: 'rec-1' }) } },
      ],
    });
  });

  it("montre au recruteur la réponse de l'étudiant", () => {
    creer();
    expect(api.listProposals).toHaveBeenCalledWith(undefined, 'rec-1', undefined);
    const ligne = el.querySelector('tbody tr')!.textContent;
    expect(ligne).toContain('Moussa Ndiaye');
    expect(ligne).toContain('Acceptée');
  });

  it('filtre par réponse', async () => {
    creer();
    await fixture.whenStable(); // NgModel s'enregistre dans le <form> de façon asynchrone
    const choix = el.querySelector<HTMLSelectElement>('select')!;
    choix.value = 'PENDING';
    choix.dispatchEvent(new Event('change'));
    expect(api.listProposals).toHaveBeenLastCalledWith(undefined, 'rec-1', 'PENDING');
  });

  it("affiche l'erreur du serveur", () => {
    api.listProposals.mockReturnValue(throwError(() => new ErreurApi(500, 'ERREUR', 'Service indisponible')));
    creer();
    expect(el.querySelector('app-alerte')!.textContent).toContain('Service indisponible');
  });
});

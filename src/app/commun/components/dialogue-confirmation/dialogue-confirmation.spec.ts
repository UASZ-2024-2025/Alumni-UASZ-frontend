import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from '../../services/confirmation.service';
import { DialogueConfirmation } from './dialogue-confirmation';

describe('DialogueConfirmation', () => {
  const monter = () => {
    const fixture = TestBed.createComponent(DialogueConfirmation);
    const service = TestBed.inject(ConfirmationService);
    fixture.detectChanges();
    return { fixture, service, el: fixture.nativeElement as HTMLElement };
  };
  const boutons = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('.actions button')];

  it("n'affiche rien sans demande", () => {
    expect(monter().el.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('affiche la demande et résout true sur Confirmer', async () => {
    const { fixture, service, el } = monter();
    const reponse = service.demander({ titre: 'Supprimer ?', message: 'Action définitive', libelleConfirmer: 'Supprimer', danger: true });
    fixture.detectChanges();
    expect(el.querySelector('h2')!.textContent).toBe('Supprimer ?');
    const confirmer = boutons(el)[1];
    expect(confirmer.textContent).toBe('Supprimer');
    expect(confirmer.className).toContain('btn--danger');
    confirmer.click();
    expect(await reponse).toBe(true);
  });

  it('résout false sur Annuler et sur le clic du fond', async () => {
    const { fixture, service, el } = monter();
    const r1 = service.demander({ titre: 'T', message: 'M' });
    fixture.detectChanges();
    boutons(el)[0].click();
    expect(await r1).toBe(false);
    const r2 = service.demander({ titre: 'T', message: 'M' });
    fixture.detectChanges();
    el.querySelector<HTMLElement>('.fond')!.click();
    expect(await r2).toBe(false);
  });
});

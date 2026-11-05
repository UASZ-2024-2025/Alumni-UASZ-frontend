import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from './confirmation.service';

describe('ConfirmationService', () => {
  it('résout true quand on confirme et ferme la demande', async () => {
    const service = TestBed.inject(ConfirmationService);
    const reponse = service.demander({ titre: 'Titre', message: 'Message' });
    expect(service.demande()?.libelleConfirmer).toBe('Confirmer');
    service.demande()!.resoudre(true);
    expect(await reponse).toBe(true);
    expect(service.demande()).toBeNull();
  });

  it('résout false quand on annule', async () => {
    const service = TestBed.inject(ConfirmationService);
    const reponse = service.demander({ titre: 'T', message: 'M', danger: true });
    service.demande()!.resoudre(false);
    expect(await reponse).toBe(false);
  });
});

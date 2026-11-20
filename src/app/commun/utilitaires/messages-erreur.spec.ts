import { ErreurApi } from '../modeles/erreur-api.model';
import { messageErreur } from './messages-erreur';

describe('messageErreur', () => {
  it("donne le message de l'écran pour le statut", () => {
    expect(messageErreur(new ErreurApi(403, 'COMPANY_NOT_VALIDATED', 'message du back'), { 403: "message de l'écran" }))
      .toBe("message de l'écran");
  });

  it('retombe sur le message du back sans message pour le statut', () => {
    expect(messageErreur(new ErreurApi(409, 'CONFLIT', 'message du back'))).toBe('message du back');
  });

  it('garde le message du back pour un compte entreprise non rattaché, même avec un message pour 403', () => {
    expect(messageErreur(new ErreurApi(403, 'ACCOUNT_NOT_LINKED', 'Compte non rattaché'), { 403: 'Entreprise non validée' }))
      .toBe('Compte non rattaché');
  });

  it('donne un message générique pour une erreur inconnue', () => {
    expect(messageErreur(new Error('x'))).toBe('Une erreur est survenue.');
  });
});

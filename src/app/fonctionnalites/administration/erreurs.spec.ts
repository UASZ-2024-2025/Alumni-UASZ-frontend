import { ErreurApi } from '../../commun/modeles/erreur-api.model';
import { messageErreur } from './erreurs';

describe('messageErreur', () => {
  it('traduit un 403', () => {
    expect(messageErreur(new ErreurApi(403, 'FORBIDDEN', 'x'))).toBe(
      "Action réservée à l'administrateur.",
    );
  });

  it('préfixe les erreurs de validation 400 et 422', () => {
    expect(messageErreur(new ErreurApi(422, 'X', 'email invalide'))).toBe(
      'Données invalides : email invalide',
    );
    expect(messageErreur(new ErreurApi(400, 'X', 'champ requis'))).toContain('champ requis');
  });

  it('privilégie la surcharge par statut', () => {
    expect(messageErreur(new ErreurApi(404, 'X', 'brut'), { 404: 'Introuvable' })).toBe('Introuvable');
  });

  it("renvoie le message de l'API par défaut", () => {
    expect(messageErreur(new ErreurApi(409, 'CONFLIT', 'déjà pris'))).toBe('déjà pris');
  });

  it("gère une erreur qui n'est pas une ErreurApi", () => {
    expect(messageErreur(new Error('boom'))).toBe('Une erreur inattendue est survenue.');
  });
});

import { FormControl, FormGroup } from '@angular/forms';
import { confirmationIdentique, validateurPolitiqueMotDePasse } from './mot-de-passe';

describe('politique de mot de passe', () => {
  const erreur = (v: string) => validateurPolitiqueMotDePasse(new FormControl(v));

  it.each(['Abcdef12', 'motdepasse1', 'été2026éé'])('accepte %s', (v) => expect(erreur(v)).toBeNull());
  it.each(['court1', 'sansaucunchiffre', '1234567890', 'é'.repeat(37) + '1'])('refuse %s', (v) =>
    expect(erreur(v)).toEqual({ politique: true }),
  );
  it('laisse la valeur vide à Validators.required', () => expect(erreur('')).toBeNull());

  it('vérifie la confirmation', () => {
    const g = (a: string, b: string) => new FormGroup({ mdp: new FormControl(a), conf: new FormControl(b) });
    expect(confirmationIdentique('mdp', 'conf')(g('x', 'x'))).toBeNull();
    expect(confirmationIdentique('mdp', 'conf')(g('x', 'y'))).toEqual({ confirmation: true });
  });
});

import { of, throwError } from 'rxjs';
import { ErreurApi } from '../modeles/erreur-api.model';
import { creerListePaginee } from './liste-paginee';

describe('creerListePaginee', () => {
  const reponse = { content: ['a', 'b'], totalElements: 25 };

  it('charge la première page et calcule le nombre de pages', () => {
    const appeler = vi.fn(() => of(reponse));
    const l = creerListePaginee<string>(appeler, 10);
    l.charger();
    expect(appeler).toHaveBeenCalledWith(0, 10);
    expect(l.elements()).toEqual(['a', 'b']);
    expect(l.nbPages()).toBe(3);
    expect(l.chargement()).toBe(false);
  });

  it('va à une page valide et ignore une page hors limites', () => {
    const appeler = vi.fn(() => of(reponse));
    const l = creerListePaginee<string>(appeler, 10);
    l.charger();
    l.aller(2);
    expect(appeler).toHaveBeenLastCalledWith(2, 10);
    l.aller(3);
    l.aller(-1);
    expect(appeler).toHaveBeenCalledTimes(2);
  });

  it('revient à la page 0 quand on recommence', () => {
    const appeler = vi.fn(() => of(reponse));
    const l = creerListePaginee<string>(appeler, 10);
    l.charger();
    l.aller(1);
    l.recommencer();
    expect(l.page()).toBe(0);
    expect(appeler).toHaveBeenLastCalledWith(0, 10);
  });

  it('gère une réponse vide', () => {
    const l = creerListePaginee<string>(() => of({}), 10);
    l.charger();
    expect(l.elements()).toEqual([]);
    expect(l.nbPages()).toBe(1);
  });

  it("expose le message d'erreur, avec un message propre au statut", () => {
    const erreur = new ErreurApi(404, 'NOT_FOUND', 'brut');
    const l = creerListePaginee<string>(() => throwError(() => erreur), 10, { 404: 'Introuvable.' });
    l.charger();
    expect(l.erreur()).toBe('Introuvable.');
    expect(l.chargement()).toBe(false);
  });
});

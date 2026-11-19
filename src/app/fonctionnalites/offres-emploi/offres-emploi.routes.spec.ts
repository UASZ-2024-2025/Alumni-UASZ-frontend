import type { Routes } from '@angular/router';
import { OFFRES_EMPLOI_ROUTES } from './offres-emploi.routes';

// Aplatit les routes dans l'ordre de déclaration, avec leur chemin complet
function aplatir(liste: Routes, prefixe = ''): string[] {
  const resultat: string[] = [];
  for (const r of liste) {
    const chemin = [prefixe, r.path ?? ''].filter(Boolean).join('/');
    resultat.push(chemin);
    if (r.children) {
      resultat.push(...aplatir(r.children, chemin));
    }
  }
  return resultat;
}

describe('offres-emploi.routes', () => {
  const chemins = aplatir(OFFRES_EMPLOI_ROUTES);

  const indexDe = (fin: string) => chemins.findIndex((c) => c === fin || c.endsWith('/' + fin));
  const indexDetail = chemins.findIndex((c) => /(^|\/):id$/.test(c));

  it('exporte un tableau de routes non vide', () => {
    expect(Array.isArray(OFFRES_EMPLOI_ROUTES)).toBe(true);
    expect(OFFRES_EMPLOI_ROUTES.length).toBeGreaterThan(0);
  });

  it('declare la route mes-offres', () => {
    expect(indexDe('mes-offres')).toBeGreaterThanOrEqual(0);
  });

  it('declare la route publier', () => {
    expect(indexDe('publier')).toBeGreaterThanOrEqual(0);
  });

  it('declare la route de detail :id', () => {
    expect(indexDetail).toBeGreaterThanOrEqual(0);
  });

  it('place mes-offres avant :id (sinon "mes-offres" est pris pour un identifiant)', () => {
    expect(indexDe('mes-offres')).toBeLessThan(indexDetail);
  });

  it('place publier avant :id (sinon "publier" est pris pour un identifiant)', () => {
    expect(indexDe('publier')).toBeLessThan(indexDetail);
  });
});
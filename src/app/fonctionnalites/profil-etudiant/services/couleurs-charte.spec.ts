import { afterEach, describe, expect, it } from 'vitest';
import { couleurCharte, versRvb } from './couleurs-charte';

describe('couleurs de la charte', () => {
  afterEach(() => document.documentElement.style.removeProperty('--test-couleur'));

  it.each([
    ['#0b5d3b', [11, 93, 59]],
    ['#FFF', [255, 255, 255]],
    ['#1d4f91', [29, 79, 145]],
    ['rgb(29, 79, 145)', [29, 79, 145]],
    ['rgba(7, 61, 39, 0.5)', [7, 61, 39]],
  ])('convertit %s', (valeur, attendu) => {
    expect(versRvb(valeur)).toEqual(attendu);
  });

  it.each(['', 'rouge', '#12', 'var(--g8)'])('refuse « %s »', (valeur) => {
    expect(versRvb(valeur)).toBeNull();
  });

  it('lit la variable CSS de la racine du document', () => {
    document.documentElement.style.setProperty('--test-couleur', '#13734b');
    expect(couleurCharte('--test-couleur')).toEqual([19, 115, 75]);
  });

  it('donne du noir quand la variable n’existe pas', () => {
    expect(couleurCharte('--variable-inexistante')).toEqual([0, 0, 0]);
  });
});

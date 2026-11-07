import { TestBed } from '@angular/core/testing';
import { BarreScore } from './barre-score';

describe('BarreScore', () => {
  const rendu = (valeur: number) => {
    const f = TestBed.createComponent(BarreScore);
    f.componentRef.setInput('valeur', valeur);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it('arrondit la valeur et l\'affiche', () => {
    const el = rendu(72.6);
    expect(el.querySelector('b')!.textContent).toBe('73 %');
    expect(el.querySelector('meter')!.value).toBe(73);
  });

  it.each([
    [-5, '0 %'],
    [140, '100 %'],
    [Number.NaN, '0 %'],
  ])('borne %s à %s', (valeur, attendu) => {
    expect(rendu(valeur).querySelector('b')!.textContent).toBe(attendu);
  });
});

import { TestBed } from '@angular/core/testing';
import { CarteStat } from './carte-stat';

describe('CarteStat', () => {
  const monter = (valeur?: string | number) => {
    const f = TestBed.createComponent(CarteStat);
    f.componentRef.setInput('libelle', 'Alumni');
    f.componentRef.setInput('valeur', valeur);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it('affiche le libellé et la valeur', () => {
    const el = monter(1450);
    expect(el.querySelector('b')!.textContent).toBe('1450');
    expect(el.querySelector('span')!.textContent).toBe('Alumni');
  });

  it('affiche un tiret sans valeur, mais garde le zéro', () => {
    expect(monter().querySelector('b')!.textContent).toBe('—');
    expect(monter(0).querySelector('b')!.textContent).toBe('0');
  });
});

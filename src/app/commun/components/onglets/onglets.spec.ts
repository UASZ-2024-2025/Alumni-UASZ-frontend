import { TestBed } from '@angular/core/testing';
import { Onglets } from './onglets';

describe('Onglets', () => {
  const creer = () => {
    const f = TestBed.createComponent(Onglets);
    f.componentRef.setInput('onglets', [
      { cle: 'a', libelle: 'A' },
      { cle: 'b', libelle: 'B' },
      { cle: 'c', libelle: 'C' },
    ]);
    f.componentRef.setInput('actif', 'a');
    f.detectChanges();
    const boutons = () => Array.from((f.nativeElement as HTMLElement).querySelectorAll('button'));
    return { f, boutons };
  };

  it("marque l'onglet actif et change au clic", () => {
    const { f, boutons } = creer();
    expect(boutons().map((b) => b.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    boutons()[1].click();
    f.detectChanges();
    expect(f.componentInstance.actif()).toBe('b');
  });

  it('navigue aux flèches en bouclant', () => {
    const { f, boutons } = creer();
    boutons()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    f.detectChanges();
    expect(f.componentInstance.actif()).toBe('c');
    boutons()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(f.componentInstance.actif()).toBe('a');
  });

  it('ignore les autres touches', () => {
    const { f, boutons } = creer();
    boutons()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(f.componentInstance.actif()).toBe('a');
  });
});

import { TestBed } from '@angular/core/testing';
import { Compteur } from './compteur';

describe('Compteur', () => {
  const rendu = (valeur: number) => {
    const f = TestBed.createComponent(Compteur);
    f.componentRef.setInput('valeur', valeur);
    f.detectChanges();
    return (f.nativeElement as HTMLElement).querySelector('.compteur');
  };

  it("n'affiche rien à 0", () => expect(rendu(0)).toBeNull());
  it('affiche la valeur', () => expect(rendu(7)!.textContent).toBe('7'));
  it('plafonne au maximum', () => expect(rendu(150)!.textContent).toBe('99+'));
  it('annonce le nombre aux lecteurs d\'écran', () => expect(rendu(3)!.getAttribute('aria-label')).toBe('3 non lus'));
});

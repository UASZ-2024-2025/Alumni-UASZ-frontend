import { TestBed } from '@angular/core/testing';
import { Bouton } from './bouton';

describe('Bouton', () => {
  const monter = (entrees: Record<string, unknown> = {}) => {
    const fixture = TestBed.createComponent(Bouton);
    Object.entries(entrees).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  };

  it('applique la variante et la taille', () => {
    const b = monter({ variante: 'danger', petit: true });
    expect(b.className).toContain('btn--danger');
    expect(b.className).toContain('btn--petit');
    expect(b.className).toContain('btn--auto');
  });

  it('prend toute la largeur à la demande', () => {
    expect(monter({ pleineLargeur: true }).className).not.toContain('btn--auto');
  });

  it('est désactivé et occupé pendant le chargement', () => {
    const b = monter({ chargement: true });
    expect(b.disabled).toBe(true);
    expect(b.getAttribute('aria-busy')).toBe('true');
    expect(b.querySelector('.roue')).toBeTruthy();
  });
});

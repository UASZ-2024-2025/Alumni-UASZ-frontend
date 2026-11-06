import { TestBed } from '@angular/core/testing';
import { Spinner } from './spinner';

describe('Spinner', () => {
  it('affiche le libellé par défaut avec le rôle status', () => {
    const fixture = TestBed.createComponent(Spinner);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
    expect(el.textContent).toContain('Chargement…');
  });

  it('affiche un libellé personnalisé', () => {
    const fixture = TestBed.createComponent(Spinner);
    fixture.componentRef.setInput('libelle', 'Chargement des offres…');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Chargement des offres…');
  });
});

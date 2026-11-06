import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EtatVide } from './etat-vide';

@Component({
  imports: [EtatVide],
  template: '<app-etat-vide titre="Aucune entreprise">Essayez un autre filtre.</app-etat-vide>',
})
class Hote {}

describe('EtatVide', () => {
  it('affiche le titre et le contenu projeté', () => {
    const fixture = TestBed.createComponent(Hote);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('b')!.textContent).toBe('Aucune entreprise');
    expect(el.textContent).toContain('Essayez un autre filtre.');
  });
});

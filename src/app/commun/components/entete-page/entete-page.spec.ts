import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EntetePage } from './entete-page';

@Component({
  imports: [EntetePage],
  template: '<app-entete-page titre="Promotions"><p class="sous">3 promotions</p><button actions>Ajouter</button></app-entete-page>',
})
class Hote {}

describe('EntetePage', () => {
  it('affiche le titre en h1, le sous-titre et les actions projetés', () => {
    const f = TestBed.createComponent(Hote);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('h1')?.textContent).toBe('Promotions');
    expect(el.querySelector('.sous')?.textContent).toBe('3 promotions');
    expect(el.querySelector('.actions button')?.textContent).toBe('Ajouter');
  });
});

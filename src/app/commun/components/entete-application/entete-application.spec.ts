import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnteteApplication } from './entete-application';

@Component({ imports: [EnteteApplication], template: '<app-entete-application role="ALUMNI" nom="a b"><i class="projete"></i></app-entete-application>' })
class Hote {}

describe('EnteteApplication', () => {
  let fixture: ComponentFixture<EnteteApplication>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EnteteApplication] });
    fixture = TestBed.createComponent(EnteteApplication);
    fixture.componentRef.setInput('role', 'ADMINISTRATEUR');
    fixture.componentRef.setInput('nom', 'admin uasz');
    fixture.detectChanges();
  });

  it('montre la recherche, le rôle et les initiales en majuscule', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('input[type="search"]')).toBeTruthy();
    expect(el.querySelector('.role')?.textContent).toContain('ADMINISTRATEUR');
    expect(el.querySelector('app-avatar')?.textContent?.trim()).toBe('AU');
  });

  it('affiche le contenu projeté (la cloche) à droite, avant le rôle', () => {
    const hote = TestBed.createComponent(Hote);
    hote.detectChanges();
    const droite: HTMLElement = hote.nativeElement.querySelector('.droite');
    expect(droite.firstElementChild?.classList).toContain('projete');
  });
});

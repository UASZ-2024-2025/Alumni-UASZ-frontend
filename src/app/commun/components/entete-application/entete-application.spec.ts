import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EnteteApplication } from './entete-application';

describe('EnteteApplication', () => {
  let fixture: ComponentFixture<EnteteApplication>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EnteteApplication], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(EnteteApplication);
    fixture.componentRef.setInput('role', 'ADMINISTRATEUR');
    fixture.componentRef.setInput('nom', 'admin uasz');
    fixture.detectChanges();
  });

  it('montre la recherche, le rôle et l’initiale en majuscule', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('input[type="search"]')).toBeTruthy();
    expect(el.querySelector('.role')?.textContent).toContain('ADMINISTRATEUR');
    expect(el.querySelector('.avatar')?.textContent).toBe('A');
  });

  it('renvoie vers les notifications', () => {
    expect(fixture.nativeElement.querySelector('.cloche').getAttribute('href')).toBe('/notifications');
  });
});

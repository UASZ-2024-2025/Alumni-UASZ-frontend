import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SousNavigation } from './sous-navigation';

@Component({ template: '' })
class Vide {}

@Component({
  imports: [SousNavigation],
  template: `<app-sous-navigation libelleAria="Section" [liens]="liens" />`,
})
class Hote {
  liens = [{ chemin: '/a', libelle: 'A', exact: true }, { chemin: '/b', libelle: 'B' }];
}

describe('SousNavigation', () => {
  it('marque le lien de la page courante avec aria-current', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'a', component: Vide }, { path: 'b', component: Vide }])] });
    const harness = await RouterTestingHarness.create('/b');
    const f = TestBed.createComponent(Hote);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Section');
    const liens = Array.from(el.querySelectorAll('a'));
    expect(liens.map((a) => a.getAttribute('aria-current'))).toEqual([null, 'page']);
    expect(harness).toBeTruthy();
  });
});

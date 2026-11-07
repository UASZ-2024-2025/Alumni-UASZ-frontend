import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageErreur } from './page-erreur';

describe('PageErreur', () => {
  it('affiche le code, le titre et un lien de retour', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const f = TestBed.createComponent(PageErreur);
    f.componentRef.setInput('code', '404');
    f.componentRef.setInput('titre', 'Page introuvable');
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('.code')!.textContent).toBe('404');
    expect(el.querySelector('h1')!.textContent).toBe('Page introuvable');
    expect(el.querySelector('a')!.getAttribute('href')).toBe('/');
  });
});

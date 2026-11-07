import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccesRefuse } from './acces-refuse';
import { Introuvable } from './introuvable';

describe('Pages d\'erreur', () => {
  it.each([
    [AccesRefuse, '403'],
    [Introuvable, '404'],
  ])('%o affiche le code %s', (page, code) => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const f = TestBed.createComponent(page);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('.code')!.textContent).toBe(code);
  });
});

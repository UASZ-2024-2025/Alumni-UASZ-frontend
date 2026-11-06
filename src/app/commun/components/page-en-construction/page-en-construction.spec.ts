import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { PageEnConstruction } from './page-en-construction';

describe('PageEnConstruction', () => {
  const rendu = (data: Record<string, string>) => {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data } } }],
    });
    const f = TestBed.createComponent(PageEnConstruction);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it('affiche le titre et le ticket de la route', () => {
    const el = rendu({ titre: 'Étudiants', ticket: 'AL-48' });
    expect(el.querySelector('h1')!.textContent).toBe('Étudiants');
    expect(el.textContent).toContain('AL-48');
  });

  it('a des valeurs par défaut', () => {
    const el = rendu({});
    expect(el.querySelector('h1')!.textContent).toBe('Page');
  });
});

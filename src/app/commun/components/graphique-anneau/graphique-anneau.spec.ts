import { TestBed } from '@angular/core/testing';
import { GraphiqueAnneau } from './graphique-anneau';

describe('GraphiqueAnneau', () => {
  const creer = (segments: unknown[], centre?: string) => {
    const f = TestBed.createComponent(GraphiqueAnneau);
    f.componentRef.setInput('segments', segments);
    if (centre) f.componentRef.setInput('centre', centre);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it('affiche le total au centre, la légende et les pourcentages', () => {
    const el = creer([{ libelle: 'Alumni', valeur: 30 }, { libelle: 'Étudiants', valeur: 10 }]);
    expect(el.querySelector('.centre')!.textContent).toBe('40');
    expect(el.textContent).toContain('75 %');
    expect(el.querySelector('figure[aria-label]')!.getAttribute('aria-label')).toBe('Alumni : 30, Étudiants : 10');
  });

  it('accepte un texte central personnalisé', () => {
    expect(creer([{ libelle: 'A', valeur: 1 }], '68 %').querySelector('.centre')!.textContent).toBe('68 %');
  });

  it('reste valide quand tout vaut 0', () => {
    const el = creer([{ libelle: 'A', valeur: 0 }]);
    expect(el.textContent).toContain('0 %');
  });
});

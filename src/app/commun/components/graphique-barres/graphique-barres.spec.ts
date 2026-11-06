import { TestBed } from '@angular/core/testing';
import { borner, GraphiqueBarres } from './graphique-barres';

describe('borner', () => {
  it.each([
    [50, 50],
    [130, 100],
    [-5, 0],
    [undefined, 0],
    [NaN, 0],
  ])('borner(%s) = %s', (entree, attendu) => {
    expect(borner(entree)).toBe(attendu);
  });
});

describe('GraphiqueBarres', () => {
  function creer(lignes: unknown[]) {
    const fixture = TestBed.createComponent(GraphiqueBarres);
    fixture.componentRef.setInput('lignes', lignes);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche une barre accessible par ligne, bornée à 100 %', () => {
    const el = creer([{ libelle: 'Génie Logiciel 2023', valeur: 130, detail: '29/40 insérés' }]);
    const barre = el.querySelector('figure[aria-label]')!;
    expect(barre.getAttribute('aria-label')).toBe('Génie Logiciel 2023 : 130 %');
    expect((barre.firstElementChild as HTMLElement).style.width).toBe('100%');
    expect(el.textContent).toContain('29/40 insérés');
  });

  it("affiche la barre d'offre uniquement si `secondaire` est fourni", () => {
    const sans = creer([{ libelle: 'SQL', valeur: 70 }]);
    expect(sans.querySelectorAll('figure[aria-label]').length).toBe(1);

    const avec = creer([{ libelle: 'SQL', valeur: 70, secondaire: 40 }]);
    expect(avec.querySelectorAll('figure[aria-label]').length).toBe(2);
  });

  it('accepte une autre unité et un autre maximum', () => {
    const f = TestBed.createComponent(GraphiqueBarres);
    f.componentRef.setInput('lignes', [{ libelle: 'Stages', valeur: 50 }]);
    f.componentRef.setInput('max', 200);
    f.componentRef.setInput('unite', 'offres');
    f.detectChanges();
    const barre = (f.nativeElement as HTMLElement).querySelector('figure[aria-label]')!;
    expect(barre.getAttribute('aria-label')).toBe('Stages : 50 offres');
    expect((barre.firstElementChild as HTMLElement).style.width).toBe('25%');
  });
});

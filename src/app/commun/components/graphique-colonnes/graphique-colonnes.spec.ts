import { TestBed } from '@angular/core/testing';
import { GraphiqueColonnes } from './graphique-colonnes';

describe('GraphiqueColonnes', () => {
  it('affiche une colonne accessible par promotion, bornée à 100 %', () => {
    const f = TestBed.createComponent(GraphiqueColonnes);
    f.componentRef.setInput('colonnes', [{ libelle: '2023', valeur: 140 }, { libelle: '2024', valeur: 50 }]);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const pistes = el.querySelectorAll('figure[aria-label]');
    expect(pistes.length).toBe(2);
    expect(pistes[1].getAttribute('aria-label')).toBe('2024 : 50 %');
    expect((pistes[0].firstElementChild as HTMLElement).style.height).toBe('100%');
  });
});

import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { cvInitial, DonneesCv, MODELES_CV } from '../modeles/cv.modele';
import { ApercuCv } from './apercu-cv';

const afficher = (modele: string) => {
  const fixture = TestBed.createComponent(ApercuCv);
  const d: DonneesCv = { ...cvInitial(null, null), prenom: 'Awa', nom: 'Diop', titre: 'Développeuse', modele };
  fixture.componentRef.setInput('donnees', d);
  fixture.detectChanges();
  return fixture;
};

describe('ApercuCv : modèles', () => {
  it.each(MODELES_CV.map((m) => m.code))('applique le modèle %s à la feuille', (code) => {
    const feuille = (afficher(code).nativeElement as HTMLElement).querySelector('.feuille, article')!;
    expect(feuille.getAttribute('data-modele')).toBe(code);
  });

  it('change de modèle en direct, sans recréer l’aperçu', () => {
    const fixture = afficher('MODERN_BLUE');
    const feuille = (fixture.nativeElement as HTMLElement).querySelector('article')!;

    fixture.componentRef.setInput('donnees', { ...fixture.componentInstance.donnees(), modele: 'CLASSIC' });
    fixture.detectChanges();

    expect(feuille.getAttribute('data-modele')).toBe('CLASSIC');
  });
});

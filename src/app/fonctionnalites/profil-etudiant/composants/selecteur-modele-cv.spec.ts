import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { MODELES_CV } from '../modeles/cv.modele';
import { SelecteurModeleCv } from './selecteur-modele-cv';

@Component({
  imports: [SelecteurModeleCv, ReactiveFormsModule],
  template: `<app-selecteur-modele-cv libelle="Modèle" [formControl]="controle" />`,
})
class Hote {
  controle = new FormControl('CLASSIC', { nonNullable: true });
}

describe('SelecteurModeleCv', () => {
  const creer = () => {
    const f = TestBed.createComponent(Hote);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    return { f, el, radios: () => Array.from(el.querySelectorAll<HTMLInputElement>('input[type=radio]')) };
  };

  it('propose chaque modèle, avec son nom', () => {
    const { el, radios } = creer();
    expect(radios()).toHaveLength(MODELES_CV.length);
    expect(radios().map((r) => r.value)).toEqual(MODELES_CV.map((m) => m.code));
    for (const m of MODELES_CV) expect(el.textContent).toContain(m.libelle);
  });

  it('est un groupe nommé pour les lecteurs d’écran', () => {
    const { el } = creer();
    expect(el.querySelector('fieldset legend')?.textContent).toBe('Modèle');
  });

  it('coche le modèle de la valeur du formulaire', () => {
    const { radios } = creer();
    expect(radios().map((r) => r.checked)).toEqual(MODELES_CV.map((m) => m.code === 'CLASSIC'));
  });

  it('met à jour le formulaire quand on choisit un modèle', () => {
    const { f, radios } = creer();
    radios()[1].click();
    expect(f.componentInstance.controle.value).toBe('UASZ_VERT');
  });

  it('suit un changement de valeur venu du formulaire (CV chargé)', () => {
    const { f, radios } = creer();
    f.componentInstance.controle.setValue('MODERN_BLUE');
    f.detectChanges();
    expect(radios().map((r) => r.checked)).toEqual(MODELES_CV.map((m) => m.code === 'MODERN_BLUE'));
  });

  it('colore chaque miniature avec la variable de la charte du modèle', () => {
    const { el } = creer();
    const cartes = Array.from(el.querySelectorAll<HTMLElement>('label'));
    expect(cartes.map((c) => c.style.getPropertyValue('--accent'))).toEqual(MODELES_CV.map((m) => `var(${m.accent})`));
  });

  it('se désactive avec le formulaire', () => {
    const { f, el } = creer();
    f.componentInstance.controle.disable();
    f.detectChanges();
    expect(el.querySelector('fieldset')!.disabled).toBe(true);
  });
});

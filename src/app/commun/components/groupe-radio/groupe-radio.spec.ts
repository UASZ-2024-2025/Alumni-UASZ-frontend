import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { GroupeRadio } from './groupe-radio';

@Component({
  imports: [GroupeRadio, ReactiveFormsModule],
  template: `<app-groupe-radio libelle="Contrat" [options]="options" [formControl]="controle" />`,
})
class Hote {
  options = [
    { valeur: 'CDI', libelle: 'CDI' },
    { valeur: 'STAGE', libelle: 'Stage' },
  ];
  controle = new FormControl('STAGE');
}

describe('GroupeRadio', () => {
  const creer = () => {
    const f = TestBed.createComponent(Hote);
    f.detectChanges();
    return { f, radios: Array.from((f.nativeElement as HTMLElement).querySelectorAll('input')) };
  };

  it("coche l'option de la valeur du formulaire", () => {
    expect(creer().radios.map((r) => r.checked)).toEqual([false, true]);
  });

  it('met à jour le formulaire au choix', () => {
    const { f, radios } = creer();
    radios[0].click();
    expect(f.componentInstance.controle.value).toBe('CDI');
  });

  it('se désactive avec le formulaire', () => {
    const { f } = creer();
    f.componentInstance.controle.disable();
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('fieldset')!.disabled).toBe(true);
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CaseACocher } from './case-a-cocher';

@Component({
  imports: [CaseACocher, ReactiveFormsModule],
  template: `<app-case-a-cocher libelle="Disponible" [formControl]="controle" />`,
})
class Hote {
  controle = new FormControl(true);
}

describe('CaseACocher', () => {
  const creer = () => {
    const f = TestBed.createComponent(Hote);
    f.detectChanges();
    return { f, input: (f.nativeElement as HTMLElement).querySelector('input')! };
  };

  it('reflète la valeur du formulaire', () => {
    expect(creer().input.checked).toBe(true);
  });

  it('met à jour le formulaire au clic', () => {
    const { f, input } = creer();
    input.click();
    expect(f.componentInstance.controle.value).toBe(false);
  });

  it('se désactive avec le formulaire', () => {
    const { f, input } = creer();
    f.componentInstance.controle.disable();
    f.detectChanges();
    expect(input.disabled).toBe(true);
  });
});

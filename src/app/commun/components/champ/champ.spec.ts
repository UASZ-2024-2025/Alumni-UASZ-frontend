import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Champ } from './champ';

@Component({
  imports: [Champ, ReactiveFormsModule],
  template: '<app-champ libelle="Nom" [requis]="true" [erreur]="erreur" [formControl]="controle" />',
})
class Hote {
  controle = new FormControl('Awa');
  erreur: string | null = null;
}

describe('Champ', () => {
  const monter = () => {
    const fixture = TestBed.createComponent(Hote);
    fixture.detectChanges();
    return fixture;
  };

  it('affiche le libellé, la valeur du formulaire et l’étoile des champs requis', () => {
    const el: HTMLElement = monter().nativeElement;
    expect(el.querySelector('label')!.textContent).toContain('Nom');
    expect(el.querySelector('label')!.textContent).toContain('*');
    expect(el.querySelector('input')!.value).toBe('Awa');
  });

  it('répercute la saisie dans le contrôle', () => {
    const fixture = monter();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'Moussa';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.controle.value).toBe('Moussa');
  });

  it("affiche l'erreur et marque le champ invalide", () => {
    const fixture = monter();
    fixture.componentInstance.erreur = 'Obligatoire';
    fixture.changeDetectorRef.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.erreur')!.textContent).toBe('Obligatoire');
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('se désactive avec le contrôle', () => {
    const fixture = monter();
    fixture.componentInstance.controle.disable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input').disabled).toBe(true);
  });
});

describe('Champ de type date', () => {
  it('affiche un champ natif de type date', () => {
    const f = TestBed.createComponent(Champ);
    f.componentRef.setInput('libelle', 'Début');
    f.componentRef.setInput('type', 'date');
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('input')!.type).toBe('date');
  });
});

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

  it('propose des suggestions via une datalist', () => {
    @Component({ imports: [Champ, ReactiveFormsModule], template: '<app-champ libelle="Spé" [suggestions]="[\'Droit\', \'Gestion\']" [formControl]="c" />' })
    class Hote2 { c = new FormControl(''); }
    const f = TestBed.createComponent(Hote2);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const liste = el.querySelector('input')!.getAttribute('list')!;
    expect(el.querySelector('#' + liste)!.querySelectorAll('option').length).toBe(2);
  });
});

describe('Champ autocomplete et type url', () => {
  const monter = (type: string, autocomplete?: string) => {
    const f = TestBed.createComponent(Champ);
    f.componentRef.setInput('libelle', 'X');
    f.componentRef.setInput('type', type);
    if (autocomplete) f.componentRef.setInput('autocomplete', autocomplete);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it("n'ajoute pas d'attribut autocomplete par défaut", () => {
    expect(monter('text').querySelector('input')!.hasAttribute('autocomplete')).toBe(false);
  });

  it('applique autocomplete sur input, textarea et select', () => {
    expect(monter('password', 'new-password').querySelector('input')!.getAttribute('autocomplete')).toBe('new-password');
    expect(monter('textarea', 'off').querySelector('textarea')!.getAttribute('autocomplete')).toBe('off');
    expect(monter('select', 'sex').querySelector('select')!.getAttribute('autocomplete')).toBe('sex');
  });

  it('affiche un champ natif de type url', () => {
    expect(monter('url').querySelector('input')!.type).toBe('url');
  });
});

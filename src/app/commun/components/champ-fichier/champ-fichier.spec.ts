import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ChampFichier } from './champ-fichier';

@Component({
  imports: [ChampFichier, ReactiveFormsModule],
  template: `<app-champ-fichier libelle="CV" [tailleMaxMo]="1" [formControl]="controle" />`,
})
class Hote {
  controle = new FormControl<File | null>(null);
}

describe('ChampFichier', () => {
  const choisir = (taille: number) => {
    const f = TestBed.createComponent(Hote);
    f.detectChanges();
    const input = (f.nativeElement as HTMLElement).querySelector('input')!;
    const fichier = new File([new Uint8Array(taille)], 'cv.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [fichier], configurable: true });
    input.dispatchEvent(new Event('change'));
    f.detectChanges();
    return { f, fichier, el: f.nativeElement as HTMLElement };
  };

  it('transmet le fichier au formulaire', () => {
    const { f, fichier } = choisir(100);
    expect(f.componentInstance.controle.value).toBe(fichier);
  });

  it('refuse un fichier trop gros avec un message', () => {
    const { f, el } = choisir(2 * 1024 * 1024);
    expect(f.componentInstance.controle.value).toBeNull();
    expect(el.querySelector('.erreur')!.textContent).toBe('Le fichier dépasse 1 Mo.');
  });

  it("efface l'erreur quand le formulaire est vidé", () => {
    const { f, el } = choisir(2 * 1024 * 1024);
    f.componentInstance.controle.reset();
    f.detectChanges();
    expect(el.querySelector('.erreur')).toBeNull();
  });
});

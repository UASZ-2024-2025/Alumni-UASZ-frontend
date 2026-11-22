import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PucesCompetences } from './puces-competences';

@Component({
  imports: [PucesCompetences, ReactiveFormsModule],
  template: `<app-puces-competences libelle="Compétences" [lectureSeule]="lecture" [formControl]="controle" />`,
})
class Hote {
  lecture = false;
  controle = new FormControl<string[]>(['Java']);
}

describe('PucesCompetences', () => {
  const creer = (lecture = false) => {
    const f = TestBed.createComponent(Hote);
    f.componentInstance.lecture = lecture;
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const ajouter = (t: string) => {
      const input = el.querySelector('input')!;
      input.value = t;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      f.detectChanges();
    };
    return { f, el, ajouter };
  };

  it('affiche les compétences du formulaire', () => {
    expect(creer().el.querySelectorAll('li').length).toBe(1);
  });

  it('ajoute une compétence avec Entrée, sans doublon ni valeur vide', () => {
    const { f, ajouter } = creer();
    ajouter('Angular');
    ajouter('angular');
    ajouter('   ');
    expect(f.componentInstance.controle.value).toEqual(['Java', 'Angular']);
  });

  it('retire une compétence', () => {
    const { f, el } = creer();
    el.querySelector('li button')!.dispatchEvent(new Event('click'));
    f.detectChanges();
    expect(f.componentInstance.controle.value).toEqual([]);
    expect(el.querySelector('.vide')).not.toBeNull();
  });

  it('est en affichage seul en lecture seule', () => {
    const { el } = creer(true);
    expect(el.querySelector('input')).toBeNull();
    expect(el.querySelector('li button')).toBeNull();
  });

  it('affiche le texte vide et le placeholder fournis', () => {
    @Component({
      imports: [PucesCompetences, ReactiveFormsModule],
      template: `<app-puces-competences libelle="Intérêts" placeholder="DevOps…" texteVide="Aucun intérêt" [formControl]="c" />`,
    })
    class Hote2 { c = new FormControl<string[]>([]); }
    const f = TestBed.createComponent(Hote2);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('.vide')!.textContent).toContain('Aucun intérêt');
    expect(el.querySelector('input')!.placeholder).toBe('DevOps…');
  });

  it('ajoute avec la virgule, à la sortie du champ, et retire la dernière avec Retour arrière', () => {
    const { f, el } = creer();
    const input = el.querySelector('input')!;
    input.value = 'Go';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ',' }));
    input.value = 'Rust';
    input.dispatchEvent(new Event('blur'));
    f.detectChanges();
    expect(f.componentInstance.controle.value).toEqual(['Java', 'Go', 'Rust']);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(f.componentInstance.controle.value).toEqual(['Java', 'Go']);
  });
});

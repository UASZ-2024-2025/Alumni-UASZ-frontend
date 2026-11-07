import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Liste de compétences en puces. En édition (par défaut) : saisie + Entrée pour ajouter, croix pour retirer.
 * Avec `[lectureSeule]="true"` : affichage seul, la valeur vient du formulaire ou de ngModel.
 *   <app-puces-competences libelle="Compétences" formControlName="competences" />
 */
@Component({
  selector: 'app-puces-competences',
  templateUrl: './puces-competences.html',
  styleUrl: './puces-competences.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PucesCompetences), multi: true }],
})
export class PucesCompetences implements ControlValueAccessor {
  private static prochainId = 0;

  readonly libelle = input.required<string>();
  readonly lectureSeule = input(false);
  protected readonly id = `puces-${PucesCompetences.prochainId++}`;
  protected readonly valeur = signal<string[]>([]);
  protected readonly desactive = signal(false);
  private surChangement: (v: string[]) => void = () => undefined;
  protected contact: () => void = () => undefined;

  writeValue(v: string[] | null): void { this.valeur.set(v ?? []); }
  registerOnChange(fn: (v: string[]) => void): void { this.surChangement = fn; }
  registerOnTouched(fn: () => void): void { this.contact = fn; }
  setDisabledState(d: boolean): void { this.desactive.set(d); }

  protected ajouter(evenement: Event, champ: HTMLInputElement): void {
    evenement.preventDefault();
    const texte = champ.value.trim();
    champ.value = '';
    if (!texte || this.valeur().some((c) => c.toLowerCase() === texte.toLowerCase())) return;
    this.maj([...this.valeur(), texte]);
  }

  protected retirer(competence: string): void {
    this.maj(this.valeur().filter((c) => c !== competence));
  }

  private maj(v: string[]): void {
    this.valeur.set(v);
    this.surChangement(v);
  }
}

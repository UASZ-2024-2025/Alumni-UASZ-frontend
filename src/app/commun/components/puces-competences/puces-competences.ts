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
  readonly placeholder = input('Ajouter une compétence, puis Entrée');
  readonly max = input(30);
  readonly texteVide = input('Aucune compétence');
  protected readonly id = `puces-${PucesCompetences.prochainId++}`;
  protected readonly valeur = signal<string[]>([]);
  protected readonly desactive = signal(false);
  private surChangement: (v: string[]) => void = () => undefined;
  protected contact: () => void = () => undefined;

  writeValue(v: string[] | null): void { this.valeur.set(v ?? []); }
  registerOnChange(fn: (v: string[]) => void): void { this.surChangement = fn; }
  registerOnTouched(fn: () => void): void { this.contact = fn; }
  setDisabledState(d: boolean): void { this.desactive.set(d); }

  protected touche(evenement: KeyboardEvent, champ: HTMLInputElement): void {
    if (evenement.key === 'Enter' || evenement.key === ',') {
      evenement.preventDefault();
      this.valider(champ);
    } else if (evenement.key === 'Backspace') {
      this.retirerDernier(champ);
    }
  }

  /** Ajoute la saisie en cours (Entrée, virgule ou sortie du champ), sans doublon ni dépassement de la limite. */
  protected valider(champ: HTMLInputElement): void {
    const texte = champ.value.replace(/,/g, ' ').trim();
    champ.value = '';
    if (!texte || this.valeur().length >= this.max() || this.valeur().some((c) => c.toLowerCase() === texte.toLowerCase())) return;
    this.maj([...this.valeur(), texte]);
  }

  protected retirerDernier(champ: HTMLInputElement): void {
    if (champ.value === '' && this.valeur().length) this.maj(this.valeur().slice(0, -1));
  }

  protected retirer(competence: string): void {
    this.maj(this.valeur().filter((c) => c !== competence));
  }

  private maj(v: string[]): void {
    this.valeur.set(v);
    this.surChangement(v);
  }
}

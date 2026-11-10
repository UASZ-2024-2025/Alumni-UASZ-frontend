import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Sélection d'un fichier (CV, photo…). La valeur du formulaire est un `File` ou `null`.
 * Un fichier trop gros est refusé avec un message ; la validation finale reste côté back.
 *   <app-champ-fichier libelle="CV (PDF)" accept="application/pdf" [tailleMaxMo]="5" formControlName="cv" />
 */
@Component({
  selector: 'app-champ-fichier',
  template: `
    <div class="champ">
      <label [attr.for]="id">{{ libelle() }}</label>
      <input [id]="id" type="file" [accept]="accept()" [disabled]="desactive()" [attr.aria-invalid]="erreur() ? true : null"
        [attr.aria-describedby]="erreur() ? id + '-err' : null" (change)="choisir($any($event.target))" (blur)="contact()" />
      @if (erreur(); as message) {
        <span class="erreur" [id]="id + '-err'">{{ message }}</span>
      }
    </div>
  `,
  styles: `
    .champ { display: flex; flex-direction: column; gap: 0.3rem; }
    label { font-size: 0.8125rem; font-weight: 600; }
    .erreur { color: var(--dg); font-size: 0.8125rem; }
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ChampFichier), multi: true }],
})
export class ChampFichier implements ControlValueAccessor {
  private static prochainId = 0;

  readonly libelle = input.required<string>();
  readonly accept = input('');
  readonly tailleMaxMo = input(5);
  protected readonly id = `fichier-${ChampFichier.prochainId++}`;
  protected readonly erreur = signal<string | null>(null);
  protected readonly desactive = signal(false);
  private surChangement: (v: File | null) => void = () => undefined;
  protected contact: () => void = () => undefined;

  writeValue(v: File | null): void {
    if (!v) this.erreur.set(null);
  }
  registerOnChange(fn: (v: File | null) => void): void { this.surChangement = fn; }
  registerOnTouched(fn: () => void): void { this.contact = fn; }
  setDisabledState(d: boolean): void { this.desactive.set(d); }

  protected choisir(champ: HTMLInputElement): void {
    const fichier = champ.files?.[0] ?? null;
    if (fichier && fichier.size > this.tailleMaxMo() * 1024 * 1024) {
      this.erreur.set(`Le fichier dépasse ${this.tailleMaxMo()} Mo.`);
      champ.value = '';
      this.surChangement(null);
      return;
    }
    this.erreur.set(null);
    this.surChangement(fichier);
  }
}

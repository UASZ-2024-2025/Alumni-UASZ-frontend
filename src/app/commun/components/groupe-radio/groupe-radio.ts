import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { OptionChamp } from '../champ/champ';

/** Choix unique parmi quelques options : <app-groupe-radio libelle="Type de contrat" [options]="contrats" formControlName="contrat" /> */
@Component({
  selector: 'app-groupe-radio',
  template: `
    <fieldset [disabled]="desactive()">
      <legend>{{ libelle() }}</legend>
      @for (o of options(); track o.valeur) {
        <label>
          <input type="radio" [name]="nom" [value]="o.valeur" [checked]="o.valeur === valeur()" (change)="choisir(o.valeur)" (blur)="contact()" />
          {{ o.libelle }}
        </label>
      }
    </fieldset>
  `,
  styles: `
    fieldset { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0; padding: 0; border: 0; }
    legend { margin-bottom: 4px; padding: 0; font-size: 0.8125rem; font-weight: 600; }
    label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
    input { accent-color: var(--g8); }
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => GroupeRadio), multi: true }],
})
export class GroupeRadio implements ControlValueAccessor {
  private static prochainNom = 0;

  readonly libelle = input.required<string>();
  readonly options = input.required<OptionChamp[]>();
  protected readonly nom = `radio-${GroupeRadio.prochainNom++}`;
  protected readonly valeur = signal('');
  protected readonly desactive = signal(false);
  private surChangement: (v: string) => void = () => undefined;
  protected contact: () => void = () => undefined;

  writeValue(v: string | null): void { this.valeur.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this.surChangement = fn; }
  registerOnTouched(fn: () => void): void { this.contact = fn; }
  setDisabledState(d: boolean): void { this.desactive.set(d); }

  protected choisir(v: string): void {
    this.valeur.set(v);
    this.surChangement(v);
  }
}

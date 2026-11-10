import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Case à cocher liée à un booléen : <app-case-a-cocher libelle="Disponible immédiatement" formControlName="disponible" /> */
@Component({
  selector: 'app-case-a-cocher',
  template: `
    <label>
      <input type="checkbox" [checked]="valeur()" [disabled]="desactive()" (change)="changer($any($event.target).checked)" (blur)="contact()" />
      {{ libelle() }}
    </label>
  `,
  styles: `
    label { display: inline-flex; align-items: center; gap: 8px; font-size: 0.9375rem; cursor: pointer; }
    input { width: 1.125rem; height: 1.125rem; accent-color: var(--g8); }
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CaseACocher), multi: true }],
})
export class CaseACocher implements ControlValueAccessor {
  readonly libelle = input.required<string>();
  protected readonly valeur = signal(false);
  protected readonly desactive = signal(false);
  private surChangement: (v: boolean) => void = () => undefined;
  protected contact: () => void = () => undefined;

  writeValue(v: boolean | null): void { this.valeur.set(!!v); }
  registerOnChange(fn: (v: boolean) => void): void { this.surChangement = fn; }
  registerOnTouched(fn: () => void): void { this.contact = fn; }
  setDisabledState(d: boolean): void { this.desactive.set(d); }

  protected changer(v: boolean): void {
    this.valeur.set(v);
    this.surChangement(v);
  }
}

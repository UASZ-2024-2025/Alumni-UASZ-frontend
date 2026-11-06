import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface OptionChamp { valeur: string; libelle: string; }

/**
 * Champ de formulaire (libellé, saisie, message d'erreur), compatible formControlName / ngModel.
 * <app-champ libelle="Email" type="email" formControlName="email" [erreur]="…" />
 * type="select" utilise `options`, type="textarea" affiche une zone multiligne.
 */
@Component({
  selector: 'app-champ',
  templateUrl: './champ.html',
  styleUrl: './champ.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Champ), multi: true }],
})
export class Champ implements ControlValueAccessor {
  private static prochainId = 0;

  readonly libelle = input.required<string>();
  readonly type = input<'text' | 'email' | 'password' | 'search' | 'tel' | 'date' | 'number' | 'textarea' | 'select'>('text');
  readonly options = input<OptionChamp[]>([]);
  readonly placeholder = input('');
  readonly erreur = input<string | null>(null);
  readonly requis = input(false);
  readonly lignes = input(3);

  protected readonly id = `champ-${Champ.prochainId++}`;
  protected readonly valeur = signal('');
  protected readonly desactive = signal(false);
  private surChangement: (v: string) => void = () => undefined;
  private surContact: () => void = () => undefined;

  writeValue(v: string | null): void { this.valeur.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this.surChangement = fn; }
  registerOnTouched(fn: () => void): void { this.surContact = fn; }
  setDisabledState(d: boolean): void { this.desactive.set(d); }

  protected saisie(v: string): void {
    this.valeur.set(v);
    this.surChangement(v);
  }
  protected contact(): void { this.surContact(); }
}

import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MODELES_CV } from '../modeles/cv.modele';

/**
 * Choix du modèle de CV, avec une miniature par modèle (couleurs de la charte) :
 * <app-selecteur-modele-cv libelle="Modèle" formControlName="modele" />
 * La valeur est le code du modèle (MODELES_CV). L'aperçu du CV se met à jour dès que la valeur change.
 */
@Component({
  selector: 'app-selecteur-modele-cv',
  template: `
    <fieldset [disabled]="desactive()">
      <legend>{{ libelle() }}</legend>
      <div class="choix">
        @for (m of modeles; track m.code) {
          <label [class.actif]="m.code === valeur()" [style.--accent]="'var(' + m.accent + ')'">
            <input type="radio" [name]="nom" [value]="m.code" [checked]="m.code === valeur()" (change)="choisir(m.code)" (blur)="contact()" />
            <span class="mini" [class.pleine]="m.colonnePleine" aria-hidden="true">
              <span class="colonne"></span>
              <span class="page"><i></i><i></i><i></i><i></i></span>
            </span>
            <span class="libelle">{{ m.libelle }}</span>
            <span class="description">{{ m.description }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
  styles: `
    fieldset { min-width: 0; margin: 0 0 1rem; padding: 0; border: 0; }
    legend { margin-bottom: 6px; padding: 0; font-size: var(--t-s); font-weight: 600; }
    .choix { display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: 0.6rem; }
    label {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      padding: 0.5rem;
      border: 2px solid var(--bd);
      border-radius: var(--rayon);
      background: var(--sf);
      cursor: pointer;
    }
    label.actif { border-color: var(--g8); background: var(--g0); }
    label.actif .libelle::after { content: ' ✓'; color: var(--g8); }
    label:has(input:focus-visible) { outline: 2px solid var(--g8); outline-offset: 2px; }
    fieldset:disabled label { cursor: not-allowed; opacity: 0.6; }
    /* Le bouton radio couvre toute la carte : clic et clavier fonctionnent, sans être dessiné. */
    input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: inherit; }
    .mini {
      display: grid;
      grid-template-columns: 32% 1fr;
      width: 4.5rem;
      margin: 0 auto;
      aspect-ratio: 210 / 297;
      overflow: hidden;
      border: 1px solid var(--bd);
      background: var(--sf);
    }
    .colonne { background: var(--g0); }
    .pleine .colonne { background: var(--accent); }
    .page { display: flex; flex-direction: column; gap: 0.2rem; padding: 0.3rem; }
    .page i { display: block; height: 3px; border-radius: 2px; background: var(--mu); opacity: 0.35; }
    .page i:first-child { width: 70%; height: 5px; background: var(--accent); opacity: 1; }
    .libelle { font-size: var(--t-s); font-weight: 600; }
    .description { color: var(--mu); font-size: var(--t-xs); }
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelecteurModeleCv), multi: true }],
})
export class SelecteurModeleCv implements ControlValueAccessor {
  private static prochainNom = 0;

  readonly libelle = input.required<string>();
  protected readonly modeles = MODELES_CV;
  protected readonly nom = `modele-cv-${SelecteurModeleCv.prochainNom++}`;
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

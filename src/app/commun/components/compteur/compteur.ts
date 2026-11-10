import { Component, computed, input } from '@angular/core';

/**
 * Pastille de compteur (notifications non lues) : <app-compteur [valeur]="nonLues()" libelle="notifications non lues" />
 * Rien n'est affiché à 0 ; au-delà de `max`, affiche « 99+ ».
 */
@Component({
  selector: 'app-compteur',
  template: `
    @if (valeur() > 0) {
      <span class="compteur" [attr.aria-label]="valeur() + ' ' + libelle()">{{ texte() }}</span>
    }
  `,
  styles: `
    .compteur { display: inline-block; min-width: 1.25rem; padding: 0 6px; border-radius: 999px; background: var(--dg); color: #fff; font-size: 0.75rem; font-weight: 700; line-height: 1.25rem; text-align: center; }
  `,
})
export class Compteur {
  readonly valeur = input.required<number>();
  readonly max = input(99);
  readonly libelle = input('non lus');
  protected readonly texte = computed(() => (this.valeur() > this.max() ? `${this.max()}+` : String(this.valeur())));
}

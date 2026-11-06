import { Component, computed, input, output } from '@angular/core';

export type VarianteBouton = 'principal' | 'secondaire' | 'danger';

/** Bouton de la charte : <app-bouton variante="danger" [chargement]="envoi()">Supprimer</app-bouton> */
@Component({
  selector: 'app-bouton',
  templateUrl: './bouton.html',
  styleUrl: './bouton.scss',
})
export class Bouton {
  readonly variante = input<VarianteBouton>('principal');
  readonly type = input<'button' | 'submit'>('button');
  readonly petit = input(false);
  readonly pleineLargeur = input(false);
  readonly desactive = input(false);
  readonly chargement = input(false);
  readonly libelleAria = input<string | null>(null);
  /** Émis seulement si le bouton natif est actif (un `(click)` sur l'hôte part aussi quand il est désactivé). */
  readonly clic = output<MouseEvent>();

  protected readonly classes = computed(() =>
    ['btn', `btn--${this.variante()}`, this.petit() ? 'btn--petit' : '', this.pleineLargeur() ? '' : 'btn--auto'].filter(Boolean).join(' '),
  );
}

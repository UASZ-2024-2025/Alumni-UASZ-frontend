import { Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

export type VarianteBouton = 'principal' | 'secondaire' | 'danger' | 'discret';

/** Bouton de la charte : <app-bouton variante="danger" [chargement]="envoi()">Supprimer</app-bouton> */
@Component({
  selector: 'app-bouton',
  imports: [RouterLink, NgTemplateOutlet],
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
  /** Si renseigné, le bouton est un vrai lien routé (<a>) au lieu d'un <button>. */
  readonly lien = input<string | unknown[] | null>(null);
  readonly libelleAria = input<string | null>(null);
  /** aria-expanded et aria-controls, pour un bouton qui ouvre un panneau. */
  readonly etendu = input<boolean | null>(null);
  readonly controle = input<string | null>(null);
  /** Émis seulement si le bouton natif est actif (un `(click)` sur l'hôte part aussi quand il est désactivé). */
  readonly clic = output<MouseEvent>();

  protected readonly classes = computed(() =>
    ['btn', `btn--${this.variante()}`, this.petit() ? 'btn--petit' : '', this.pleineLargeur() ? '' : 'btn--auto'].filter(Boolean).join(' '),
  );
}

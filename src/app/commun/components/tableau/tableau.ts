import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, input, TemplateRef } from '@angular/core';
import { EtatVide } from '../etat-vide/etat-vide';
import { Spinner } from '../spinner/spinner';

export interface ColonneTableau { cle: string; libelle: string; }

/** Contexte donné au gabarit `#cellule` : la ligne et la clé de la colonne. */
export interface ContexteCellule<T> { $implicit: T; cle: string; }

/**
 * Tableau de données (colonnes, chargement, état vide, repli en cartes sur mobile).
 * Sans gabarit, chaque cellule affiche `ligne[cle]`. Pour personnaliser :
 *   <app-tableau [colonnes]="colonnes" [lignes]="items()" legende="Offres">
 *     <ng-template #cellule let-ligne let-cle="cle">
 *       @if (cle === 'statut') { <app-badge>{{ ligne.statut }}</app-badge> } @else { {{ ligne[cle] }} }
 *     </ng-template>
 *   </app-tableau>
 */
@Component({
  selector: 'app-tableau',
  imports: [NgTemplateOutlet, EtatVide, Spinner],
  templateUrl: './tableau.html',
})
export class Tableau<T extends object = Record<string, unknown>> {
  readonly colonnes = input.required<ColonneTableau[]>();
  readonly lignes = input.required<T[]>();
  readonly legende = input.required<string>();
  readonly chargement = input(false);
  readonly messageVide = input('Aucun résultat');
  protected readonly cellule = contentChild<TemplateRef<ContexteCellule<T>>>('cellule');

  protected valeur(ligne: T, cle: string): unknown {
    return (ligne as Record<string, unknown>)[cle] ?? '—';
  }
}

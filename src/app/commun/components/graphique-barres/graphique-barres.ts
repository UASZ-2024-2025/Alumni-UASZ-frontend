import { Component, input } from '@angular/core';

export interface LigneGraphique {
  libelle: string;
  /** pourcentage 0-100 */
  valeur: number;
  /** deuxième barre optionnelle (ex. offre face à la demande) */
  secondaire?: number;
  detail?: string;
}

/** Ramène une valeur dans [0, 100] ; une valeur absente ou invalide vaut 0. */
export const borner = (v: number | undefined): number =>
  Number.isFinite(v) ? Math.min(100, Math.max(0, v as number)) : 0;

/** Barres horizontales (barre de progression de la maquette), une ou deux par ligne. */
@Component({
  selector: 'app-graphique-barres',
  templateUrl: './graphique-barres.html',
  styleUrl: './graphique-barres.scss',
})
export class GraphiqueBarres {
  readonly lignes = input.required<LigneGraphique[]>();
  /** valeur correspondant à une barre pleine (100 pour des pourcentages) */
  readonly max = input(100);
  /** unité affichée après la valeur */
  readonly unite = input('%');
  protected readonly borner = borner;

  protected largeur(v: number | undefined): number {
    return this.max() > 0 ? borner(((v ?? 0) / this.max()) * 100) : 0;
  }
}

import { Component, input } from '@angular/core';
import { borner } from '../graphique-barres/graphique-barres';

export interface ColonneGraphique {
  libelle: string;
  /** pourcentage 0-100 */
  valeur: number;
}

/** Colonnes verticales (ex. taux d'insertion par promotion), valeurs en pourcentage. */
@Component({
  selector: 'app-graphique-colonnes',
  templateUrl: './graphique-colonnes.html',
  styleUrl: './graphique-colonnes.scss',
})
export class GraphiqueColonnes {
  readonly colonnes = input.required<ColonneGraphique[]>();
  protected readonly borner = borner;
}

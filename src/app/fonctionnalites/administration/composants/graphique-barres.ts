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

@Component({
  selector: 'app-graphique-barres',
  styles: `
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .75rem; }
    .ligne { display: grid; grid-template-columns: minmax(8rem, 14rem) 1fr; gap: .75rem; align-items: center; }
    .piste { background: #e5e7eb; border-radius: 4px; height: .8rem; margin-bottom: 2px; }
    .barre { height: 100%; border-radius: 4px; background: #166534; }
    .barre.secondaire { background: #d97706; }
    .detail { font-size: .8rem; color: #374151; }
    @media (max-width: 600px) { .ligne { grid-template-columns: 1fr; } }
  `,
  template: `
    <ul>
      @for (l of lignes(); track l.libelle) {
        <li class="ligne">
          <span>{{ l.libelle }}</span>
          <div>
            <div class="piste" role="img" [attr.aria-label]="l.libelle + ' : ' + l.valeur + ' %'">
              <div class="barre" [style.width.%]="borner(l.valeur)"></div>
            </div>
            @if (l.secondaire !== undefined) {
              <div class="piste" role="img"
                [attr.aria-label]="l.libelle + ' (offre) : ' + l.secondaire + ' %'">
                <div class="barre secondaire" [style.width.%]="borner(l.secondaire)"></div>
              </div>
            }
            <span class="detail">{{ l.valeur }} %
              @if (l.secondaire !== undefined) { · offre {{ l.secondaire }} % }
              @if (l.detail) { · {{ l.detail }} }
            </span>
          </div>
        </li>
      }
    </ul>
  `,
})
export class GraphiqueBarres {
  readonly lignes = input.required<LigneGraphique[]>();
  protected readonly borner = borner;
}

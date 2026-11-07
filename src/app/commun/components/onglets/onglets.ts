import { Component, input, model } from '@angular/core';

export interface Onglet { cle: string; libelle: string; }

/**
 * Onglets génériques ; le contenu est affiché par le parent selon `actif`.
 *   <app-onglets [onglets]="onglets" [(actif)]="onglet" />
 *   @if (onglet() === 'profil') { … }
 */
@Component({
  selector: 'app-onglets',
  templateUrl: './onglets.html',
  styles: `
    .onglets { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--bd); overflow-x: auto; }
    button { padding: 10px 16px; border: 0; border-bottom: 3px solid transparent; background: none; color: var(--mu); font: inherit; font-weight: 600; cursor: pointer; white-space: nowrap; }
    button[aria-selected='true'] { border-bottom-color: var(--g8); color: var(--g8); }
    button:focus-visible { outline: 2px solid var(--g8); outline-offset: -2px; }
  `,
})
export class Onglets {
  readonly onglets = input.required<Onglet[]>();
  readonly actif = model.required<string>();

  /** Flèches gauche et droite pour passer d'un onglet à l'autre. */
  protected naviguer(evenement: KeyboardEvent, index: number): void {
    const decalage = evenement.key === 'ArrowRight' ? 1 : evenement.key === 'ArrowLeft' ? -1 : 0;
    if (!decalage) return;
    const liste = this.onglets();
    const suivant = liste[(index + decalage + liste.length) % liste.length];
    this.actif.set(suivant.cle);
    (evenement.currentTarget as HTMLElement).parentElement
      ?.querySelectorAll('button')[liste.indexOf(suivant)]
      ?.focus();
  }
}

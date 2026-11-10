import { Component, input } from '@angular/core';

/** Message affiché quand une liste est vide : <app-etat-vide titre="Aucun résultat">…</app-etat-vide> */
@Component({
  selector: 'app-etat-vide',
  template: '<div class="vide"><b>{{ titre() }}</b><ng-content /></div>',
  styles: `
    .vide { display: flex; flex-direction: column; gap: 4px; padding: 28px 16px; border: 1px dashed var(--bord-champ); border-radius: 16px; background: var(--sf); color: var(--mu); text-align: center; }
    b { color: var(--tx); }
  `,
})
export class EtatVide {
  readonly titre = input.required<string>();
}

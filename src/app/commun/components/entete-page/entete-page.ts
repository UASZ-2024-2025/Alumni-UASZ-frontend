import { Component, input } from '@angular/core';

/**
 * En-tête de page : titre (h1), sous-titre projeté et actions à droite.
 * <app-entete-page titre="Promotions"><p>3 promotion(s)</p><app-bouton actions>Ajouter</app-bouton></app-entete-page>
 */
@Component({
  selector: 'app-entete-page',
  template: `
    <div class="entete-page">
      <div>
        <h1>{{ titre() }}</h1>
        <ng-content />
      </div>
      <div class="actions"><ng-content select="[actions]" /></div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .entete-page { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 1rem; }
    h1 { margin: 0; font: 700 1.625rem/1.2 var(--police-titre); }
    .actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .5rem; }
    :host ::ng-deep .entete-page > div:first-child > p { margin: .25rem 0 0; color: var(--mu); } /* sous-titre toujours gris */
    .actions:empty { display: none; }
    @media (max-width: 600px) {
      h1 { font-size: 1.375rem; }
      .actions { width: 100%; }
      :host ::ng-deep .actions > app-bouton { flex: 1 1 auto; display: block; }
      :host ::ng-deep .actions .btn { width: 100%; }
    }
  `,
})
export class EntetePage {
  readonly titre = input.required<string>();
}

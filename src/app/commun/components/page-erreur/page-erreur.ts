import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Page d'erreur plein contenu (403, 404) : <app-page-erreur code="404" titre="Page introuvable">message</app-page-erreur> */
@Component({
  selector: 'app-page-erreur',
  imports: [RouterLink],
  template: `
    <section class="erreur">
      <p class="code">{{ code() }}</p>
      <h1>{{ titre() }}</h1>
      <p><ng-content /></p>
      <a routerLink="/">Retour à l'accueil</a>
    </section>
  `,
  styles: `
    .erreur { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 16px; text-align: center; }
    .code { margin: 0; color: var(--g8); font-family: var(--police-titre, inherit); font-size: 4rem; font-weight: 700; }
    h1 { margin: 0; }
  `,
})
export class PageErreur {
  readonly code = input.required<string>();
  readonly titre = input.required<string>();
}

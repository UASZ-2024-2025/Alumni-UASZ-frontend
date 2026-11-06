import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Page provisoire d'une fonctionnalité pas encore développée.
 * Lit `data.titre` et `data.ticket` de la route ; à remplacer par la vraie page.
 */
@Component({
  selector: 'app-page-en-construction',
  template: `
    <h1>{{ titre }}</h1>
    <p>Cet écran est en cours de développement ({{ ticket }}).</p>
  `,
})
export class PageEnConstruction {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  protected readonly titre = (this.data['titre'] as string | undefined) ?? 'Page';
  protected readonly ticket = (this.data['ticket'] as string | undefined) ?? 'ticket à préciser';
}

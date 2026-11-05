import { Component, input, output } from '@angular/core';

/** Fenêtre modale centrée (feuille en bas sur mobile). Le contenu se place dans la balise : <app-modale titre="…" [ouvert]="…" (fermer)="…">. */
@Component({
  selector: 'app-modale',
  templateUrl: './modale.html',
  styleUrl: './modale.scss',
  host: { '(document:keydown.escape)': 'ouvert() && fermer.emit()' },
})
export class Modale {
  readonly ouvert = input(false);
  readonly titre = input.required<string>();
  readonly fermer = output<void>();
}

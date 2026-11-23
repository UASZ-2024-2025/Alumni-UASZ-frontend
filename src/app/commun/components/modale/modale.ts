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
  /** Fenêtre large (960 px) pour un contenu riche, par exemple l'aperçu d'un CV. */
  readonly large = input(false);
  readonly fermer = output<void>();

  /** Ferme au clic sur le fond seulement. Pas d'expression `a && b` dans le gabarit : quand elle vaut `false`, Angular bloque l'action par défaut (donc l'envoi d'un formulaire). */
  protected clicFond(e: Event): void {
    if (e.target === e.currentTarget) this.fermer.emit();
  }
}

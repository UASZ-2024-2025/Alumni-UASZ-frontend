import { Component, input, output } from '@angular/core';

/** Pagination « Précédent / Suivant ». `page` commence à 0 ; émet le numéro de la page demandée. */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {
  readonly page = input.required<number>();
  readonly nbPages = input.required<number>();
  readonly changement = output<number>();
}

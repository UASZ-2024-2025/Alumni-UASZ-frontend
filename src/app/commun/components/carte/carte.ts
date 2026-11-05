import { Component, input } from '@angular/core';

/** Surface blanche de la maquette : <app-carte titre="Inscriptions">…</app-carte> */
@Component({
  selector: 'app-carte',
  templateUrl: './carte.html',
  styleUrl: './carte.scss',
})
export class Carte {
  readonly titre = input<string>();
}

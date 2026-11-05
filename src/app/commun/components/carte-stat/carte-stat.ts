import { Component, input } from '@angular/core';

/** Chiffre clé : <app-carte-stat libelle="Alumni" [valeur]="1450" />. Sans valeur, affiche un tiret. */
@Component({
  selector: 'app-carte-stat',
  templateUrl: './carte-stat.html',
  styleUrl: './carte-stat.scss',
})
export class CarteStat {
  readonly libelle = input.required<string>();
  readonly valeur = input<string | number | undefined>();
}

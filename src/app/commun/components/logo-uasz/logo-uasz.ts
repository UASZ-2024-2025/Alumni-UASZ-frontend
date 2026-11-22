import { Component, input } from '@angular/core';

/**
 * Logo de l'UASZ. Utilise l'image officielle (par défaut « logo-uasz.png », dans public/).
 * Usage : <app-logo-uasz variante="clair" />  (clair = sur fond vert, fonce = sur fond blanc)
 */
@Component({
  selector: 'app-logo-uasz',
  templateUrl: './logo-uasz.html',
  styleUrl: './logo-uasz.scss',
})
export class LogoUasz {
  readonly variante = input<'clair' | 'fonce'>('fonce');
  readonly source = input('logo-uasz.png');
}

import { Component, input, signal } from '@angular/core';

/**
 * Logo de l'UASZ. Utilise l'image officielle (par défaut « logos/uasz.png », dans public/)
 * et retombe sur l'emblème vectoriel si le fichier est introuvable.
 * Usage : <app-logo-uasz variante="clair" />  (clair = sur fond vert, fonce = sur fond blanc)
 */
@Component({
  selector: 'app-logo-uasz',
  templateUrl: './logo-uasz.html',
  styleUrl: './logo-uasz.scss',
})
export class LogoUasz {
  readonly variante = input<'clair' | 'fonce'>('fonce');
  readonly source = input('logos/uasz.png');
  protected readonly imageIndisponible = signal(false);
}

import { Avatar } from '../avatar/avatar';
import { Component, input, output } from '@angular/core';

/** En-tête de la maquette : recherche, rôle et avatar. Le contenu projeté (la cloche) s'affiche avant le rôle. */
@Component({
  imports: [Avatar],
  selector: 'app-entete-application',
  templateUrl: './entete-application.html',
  styleUrl: './entete-application.scss',
})
export class EnteteApplication {
  readonly role = input<string>('');
  readonly nom = input<string>('');
  readonly menu = output<void>();

}

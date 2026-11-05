import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/** En-tête de la maquette : recherche, notifications, rôle et avatar. */
@Component({
  selector: 'app-entete-application',
  imports: [RouterLink],
  templateUrl: './entete-application.html',
  styleUrl: './entete-application.scss',
})
export class EnteteApplication {
  readonly role = input<string>('');
  readonly nom = input<string>('');
  readonly menu = output<void>();

  protected initiale(): string {
    return this.nom().trim().charAt(0).toUpperCase();
  }
}

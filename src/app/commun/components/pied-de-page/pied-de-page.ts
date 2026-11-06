import { Component } from '@angular/core';

/** Pied de page simple de l'application. */
@Component({
  selector: 'app-pied-de-page',
  templateUrl: './pied-de-page.html',
  styleUrl: './pied-de-page.scss',
})
export class PiedDePage {
  protected readonly annee = new Date().getFullYear();
}

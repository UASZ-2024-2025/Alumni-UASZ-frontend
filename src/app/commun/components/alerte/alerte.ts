import { Component, input } from '@angular/core';

/** Message d'erreur (par défaut) ou de succès : <app-alerte type="succes">…</app-alerte> */
@Component({
  selector: 'app-alerte',
  templateUrl: './alerte.html',
  styleUrl: './alerte.scss',
})
export class Alerte {
  readonly type = input<'erreur' | 'succes'>('erreur');
}

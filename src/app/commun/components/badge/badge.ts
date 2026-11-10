import { Component, input } from '@angular/core';

export type TonBadge = 'neutre' | 'ok' | 'attention' | 'erreur';

/** Pastille de statut : <app-badge ton="ok">Actif</app-badge> */
@Component({
  selector: 'app-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
})
export class Badge {
  readonly ton = input<TonBadge>('neutre');
}

import { Component, inject } from '@angular/core';
import { ConfirmationService } from '../../services/confirmation.service';

import { Bouton } from '../bouton/bouton';

/** Boîte de dialogue de confirmation : à placer une seule fois dans la coquille. */
@Component({
  imports: [Bouton],
  selector: 'app-dialogue-confirmation',
  templateUrl: './dialogue-confirmation.html',
  styleUrl: './dialogue-confirmation.scss',
})
export class DialogueConfirmation {
  protected readonly service = inject(ConfirmationService);
}

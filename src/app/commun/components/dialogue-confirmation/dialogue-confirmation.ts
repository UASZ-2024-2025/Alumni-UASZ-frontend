import { Component, inject } from '@angular/core';
import { ConfirmationService } from '../../services/confirmation.service';

/** Boîte de dialogue de confirmation : à placer une seule fois dans la coquille. */
@Component({
  selector: 'app-dialogue-confirmation',
  templateUrl: './dialogue-confirmation.html',
  styleUrl: './dialogue-confirmation.scss',
})
export class DialogueConfirmation {
  protected readonly service = inject(ConfirmationService);
}

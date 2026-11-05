import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

/** Zone d'affichage des toasts : à placer une seule fois dans la coquille. */
@Component({
  selector: 'app-toasts',
  templateUrl: './toasts.html',
  styleUrl: './toasts.scss',
})
export class Toasts {
  protected readonly service = inject(ToastService);
}

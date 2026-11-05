import { Injectable, signal } from '@angular/core';

export interface DemandeConfirmation {
  titre: string;
  message: string;
  libelleConfirmer: string;
  danger: boolean;
  resoudre: (accepte: boolean) => void;
}

/** Remplace window.confirm : `await confirmation.demander({...})` renvoie true ou false. */
@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  readonly demande = signal<DemandeConfirmation | null>(null);

  demander(options: { titre: string; message: string; libelleConfirmer?: string; danger?: boolean }): Promise<boolean> {
    return new Promise((resolve) => {
      this.demande.set({
        titre: options.titre,
        message: options.message,
        libelleConfirmer: options.libelleConfirmer ?? 'Confirmer',
        danger: options.danger ?? false,
        resoudre: (accepte) => { this.demande.set(null); resolve(accepte); },
      });
    });
  }
}

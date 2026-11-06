import { Injectable, signal } from '@angular/core';

export type TypeToast = 'succes' | 'erreur' | 'info';
export interface Toast { id: number; type: TypeToast; message: string; }

const DUREE_MS = 4000;

/** File de notifications éphémères, affichées par <app-toasts>. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private prochainId = 0;
  readonly toasts = signal<Toast[]>([]);

  succes(message: string): void { this.ajouter('succes', message); }
  erreur(message: string): void { this.ajouter('erreur', message); }
  info(message: string): void { this.ajouter('info', message); }

  fermer(id: number): void {
    this.toasts.update((liste) => liste.filter((t) => t.id !== id));
  }

  private ajouter(type: TypeToast, message: string): void {
    const id = ++this.prochainId;
    this.toasts.update((liste) => [...liste, { id, type, message }]);
    setTimeout(() => this.fermer(id), DUREE_MS);
  }
}

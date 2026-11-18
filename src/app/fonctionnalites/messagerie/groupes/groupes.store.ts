import { computed, inject, Injectable, signal } from '@angular/core';
import { GroupMessagingService } from '../../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { GroupSummary } from '../../../api/generes/notifications-messagerie/model/groupSummary';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';

/**
 * Liste des groupes partagée entre la page (colonne de gauche) et le fil ouvert (route enfant).
 * Fournie par la page `Groupes` : le fil y reporte ses changements (message envoyé, lecture, départ).
 */
@Injectable()
export class GroupesStore {
  private readonly api = inject(GroupMessagingService);

  private readonly groupes = signal<GroupSummary[]>([]);
  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly charge = signal(false);

  /** Les conversations les plus récentes en haut. */
  readonly liste = computed(() =>
    [...this.groupes()].sort((a, b) => (b.lastMessageTime ?? '').localeCompare(a.lastMessageTime ?? '')),
  );

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.api.listGroups().subscribe({
      next: (liste) => {
        this.groupes.set(liste);
        this.chargement.set(false);
        this.charge.set(true);
      },
      error: (e) => {
        this.erreur.set(messageErreur(e));
        this.chargement.set(false);
      },
    });
  }

  ajouter(groupe: GroupSummary): void {
    this.groupes.update((l) => [groupe, ...l.filter((g) => g.id !== groupe.id)]);
  }

  maj(id: string, changements: Partial<GroupSummary>): void {
    this.groupes.update((l) => l.map((g) => (g.id === id ? { ...g, ...changements } : g)));
  }

  retirer(id: string): void {
    this.groupes.update((l) => l.filter((g) => g.id !== id));
  }
}

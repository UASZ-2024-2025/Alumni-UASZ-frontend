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

  /** Comme WhatsApp : épinglés en haut, puis les conversations les plus récentes. */
  readonly liste = computed(() =>
    [...this.groupes()].sort(
      (a, b) =>
        Number(!!b.preferences?.pinned) - Number(!!a.preferences?.pinned) ||
        (b.lastMessageTime ?? '').localeCompare(a.lastMessageTime ?? ''),
    ),
  );
  /** La liste principale exclut les groupes archivés, rangés dans leur propre section. */
  readonly actifs = computed(() => this.liste().filter((g) => !g.preferences?.archived));
  readonly archives = computed(() => this.liste().filter((g) => g.preferences?.archived));

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

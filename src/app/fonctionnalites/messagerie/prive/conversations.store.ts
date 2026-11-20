import { computed, inject, Injectable, signal } from '@angular/core';
import { PrivateMessagingService } from '../../../api/generes/notifications-messagerie/api/privateMessaging.service';
import { ConversationSummary } from '../../../api/generes/notifications-messagerie/model/conversationSummary';
import { PrivateMessage } from '../../../api/generes/notifications-messagerie/model/privateMessage';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';

/**
 * Liste des conversations partagée entre la page (colonne de gauche) et le fil ouvert (route enfant).
 * Fournie par la page `Conversations` : le fil y reporte ses changements (message envoyé, lecture).
 */
@Injectable()
export class ConversationsStore {
  private readonly api = inject(PrivateMessagingService);

  private readonly conversations = signal<ConversationSummary[]>([]);
  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly charge = signal(false);

  /** Les conversations les plus récentes en premier. */
  readonly liste = computed(() =>
    [...this.conversations()].sort((a, b) => (b.lastMessageTime ?? '').localeCompare(a.lastMessageTime ?? '')),
  );

  /** Premier chargement, visible (spinner, message d'erreur). */
  charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.api.listConversations().subscribe({
      next: (liste) => {
        this.conversations.set(liste);
        this.chargement.set(false);
        this.charge.set(true);
      },
      error: (e) => {
        this.erreur.set(messageErreur(e));
        this.chargement.set(false);
      },
    });
  }

  /** Rafraîchissement silencieux : une erreur passagère ne vide pas la liste déjà affichée. */
  rafraichir(): void {
    this.api.listConversations().subscribe({
      next: (liste) => {
        this.conversations.set(liste);
        this.charge.set(true);
        this.erreur.set(null);
      },
      error: () => undefined,
    });
  }

  maj(recipientId: string, changements: Partial<ConversationSummary>): void {
    this.conversations.update((l) => l.map((c) => (c.recipientId === recipientId ? { ...c, ...changements } : c)));
  }

  /** Après un envoi : la conversation passe en tête, ou apparaît s'il s'agit d'une nouvelle. */
  apresEnvoi(message: PrivateMessage): void {
    const id = message.recipientId;
    if (!id) return;
    const existante = this.conversations().find((c) => c.recipientId === id);
    const maj: ConversationSummary = {
      ...existante,
      recipientId: id,
      recipientName: existante?.recipientName ?? message.recipientName,
      lastMessage: message.content,
      lastMessageTime: message.createdAt,
      unreadCount: 0,
    };
    this.conversations.update((l) => [maj, ...l.filter((c) => c.recipientId !== id)]);
  }
}

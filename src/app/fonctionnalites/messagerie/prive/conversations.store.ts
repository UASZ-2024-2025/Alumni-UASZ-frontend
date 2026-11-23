import { computed, inject, Injectable, signal } from '@angular/core';
import { PrivateMessagingService } from '../../../api/generes/notifications-messagerie/api/privateMessaging.service';
import { ConversationSummary } from '../../../api/generes/notifications-messagerie/model/conversationSummary';
import { PrivateMessage } from '../../../api/generes/notifications-messagerie/model/privateMessage';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';

/** Personne choisie pour une nouvelle discussion : son nom et son rôle, tant qu'aucun message n'existe. */
export interface ContactChoisi {
  userId: string;
  nom: string;
  role: string;
}

/**
 * Liste des conversations partagée entre la page (colonne de gauche) et le fil ouvert (route enfant).
 * Fournie par la page `Conversations` : le fil y reporte ses changements (message envoyé, modifié, lecture, préférences).
 */
@Injectable()
export class ConversationsStore {
  private readonly api = inject(PrivateMessagingService);

  private readonly conversations = signal<ConversationSummary[]>([]);
  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly charge = signal(false);
  /** ALUM-263 : personnes choisies via « Nouvelle discussion » (en-tête du fil avant le premier message). */
  private readonly contacts = signal<Record<string, ContactChoisi>>({});

  /** Comme les groupes (et WhatsApp) : épinglées en haut, puis les conversations les plus récentes. */
  readonly liste = computed(() =>
    [...this.conversations()].sort(
      (a, b) =>
        Number(!!b.preferences?.pinned) - Number(!!a.preferences?.pinned) ||
        (b.lastMessageTime ?? '').localeCompare(a.lastMessageTime ?? ''),
    ),
  );
  /** La liste principale exclut les conversations archivées, rangées dans leur propre section. */
  readonly actives = computed(() => this.liste().filter((c) => !c.preferences?.archived));
  readonly archives = computed(() => this.liste().filter((c) => c.preferences?.archived));

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

  retenir(contact: ContactChoisi): void {
    this.contacts.update((c) => ({ ...c, [contact.userId]: contact }));
  }

  contact(userId: string | null): ContactChoisi | undefined {
    return userId ? this.contacts()[userId] : undefined;
  }

  trouver(recipientId: string | null): ConversationSummary | undefined {
    return this.conversations().find((c) => c.recipientId === recipientId);
  }

  maj(recipientId: string, changements: Partial<ConversationSummary>): void {
    this.conversations.update((l) => l.map((c) => (c.recipientId === recipientId ? { ...c, ...changements } : c)));
  }

  /** Après un envoi : la conversation passe en tête, ou apparaît s'il s'agit d'une nouvelle. */
  apresEnvoi(message: PrivateMessage): void {
    const id = message.recipientId;
    if (!id) return;
    const existante = this.trouver(id);
    const maj: ConversationSummary = {
      ...existante,
      recipientId: id,
      recipientName: existante?.recipientName ?? message.recipientName ?? this.contact(id)?.nom,
      recipientRole: existante?.recipientRole ?? this.contact(id)?.role,
      lastMessage: message.content,
      lastMessageSenderId: message.senderId,
      lastMessageDeleted: false,
      lastMessageType: message.type ?? 'TEXT',
      lastMessageAttachmentKind: message.attachment?.kind,
      lastMessageTime: message.createdAt,
      unreadCount: 0,
    };
    this.conversations.update((l) => [maj, ...l.filter((c) => c.recipientId !== id)]);
  }

  /** Un message modifié ou supprimé n'est repris dans l'aperçu que s'il est le dernier de la conversation. */
  apresChangement(recipientId: string, message: PrivateMessage): void {
    const c = this.trouver(recipientId);
    if (!c || c.lastMessageTime !== message.createdAt) return;
    this.maj(recipientId, {
      lastMessage: message.deleted ? undefined : message.content,
      lastMessageDeleted: !!message.deleted,
      lastMessageAttachmentKind: message.deleted ? undefined : message.attachment?.kind,
    });
  }
}

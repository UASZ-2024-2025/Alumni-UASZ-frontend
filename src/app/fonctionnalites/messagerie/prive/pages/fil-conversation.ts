import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, EMPTY, exhaustMap, filter, map, switchMap, tap, timer } from 'rxjs';
import { PrivateMessagingService } from '../../../../api/generes/notifications-messagerie/api/privateMessaging.service';
import { PrivateMessage } from '../../../../api/generes/notifications-messagerie/model/privateMessage';
import { PrivateMessagePagedResponse } from '../../../../api/generes/notifications-messagerie/model/privateMessagePagedResponse';
import { Alerte } from '../../../../commun/components/alerte/alerte';
import { Avatar } from '../../../../commun/components/avatar/avatar';
import { Bouton } from '../../../../commun/components/bouton/bouton';
import { EtatVide } from '../../../../commun/components/etat-vide/etat-vide';
import { Spinner } from '../../../../commun/components/spinner/spinner';
import { messageErreur } from '../../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { ConversationsStore } from '../conversations.store';
import { construireFil, fusionnerMessages, heure, libelleRole } from '../fil-prive';

const TAILLE_PAGE = 30;
/** Le contrat n'a pas de temps réel : le fil ouvert est réinterrogé à intervalle régulier. */
const INTERVALLE_FIL_MS = 5_000;

const ERREURS_CHARGEMENT: Record<number, string> = {
  404: "Cet utilisateur n'existe pas.",
};
const ERREURS_ENVOI: Record<number, string> = {
  400: "Le message n'a pas pu être envoyé : vérifiez son contenu.",
  404: "Ce destinataire n'existe pas.",
};

/**
 * ALUM-184 : fil de discussion avec un utilisateur (route `/messagerie/:recipientId`).
 * Hypothèse (à confirmer avec le back) : la page 0 contient les messages les plus récents ; on trie toujours côté écran.
 */
@Component({
  selector: 'app-fil-conversation',
  imports: [Alerte, Avatar, Bouton, EtatVide, Spinner],
  templateUrl: './fil-conversation.html',
  styleUrl: './fil-conversation.scss',
})
export class FilConversation {
  private readonly api = inject(PrivateMessagingService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(ConversationsStore);
  private readonly moiId = inject(AuthentificationService).utilisateur()?.id;
  private readonly zone = viewChild<ElementRef<HTMLElement>>('defilement');

  protected readonly heure = heure;
  protected readonly libelleRole = libelleRole;

  private readonly recipientId = signal<string | null>(null);
  protected readonly messages = signal<PrivateMessage[]>([]);
  private readonly total = signal(0);
  private readonly pageCourante = signal(0);
  protected readonly chargement = signal(true);
  protected readonly chargementAnciens = signal(false);
  protected readonly erreur = signal<string | null>(null);

  protected readonly brouillon = signal('');
  protected readonly envoiEnCours = signal(false);
  protected readonly erreurEnvoi = signal<string | null>(null);

  protected readonly elements = computed(() => construireFil(this.messages(), this.moiId));
  protected readonly resteAnciens = computed(() => this.messages().length < this.total());
  protected readonly peutEnvoyer = computed(() => this.brouillon().trim().length > 0 && !this.envoiEnCours());

  /** Nom et rôle affichés en en-tête : d'abord la liste des conversations, sinon les messages déjà chargés. */
  protected readonly interlocuteur = computed(() => {
    const id = this.recipientId();
    const resume = this.store.liste().find((c) => c.recipientId === id);
    const message = this.messages().find((m) => m.senderId === id || m.recipientId === id);
    const nomMessage = message?.senderId === id ? message?.senderName : message?.recipientName;
    return { nom: resume?.recipientName ?? nomMessage ?? 'Conversation', role: resume?.recipientRole };
  });

  private marquageEnCours = false;
  private marquageEchoue = false;

  constructor() {
    // Un seul abonnement : à chaque changement d'interlocuteur, l'ancien rafraîchissement est annulé (switchMap).
    this.route.paramMap
      .pipe(
        map((params) => params.get('recipientId')),
        filter((id): id is string => !!id),
        tap((id) => this.ouvrir(id)),
        switchMap((id) =>
          timer(0, INTERVALLE_FIL_MS).pipe(
            exhaustMap(() =>
              this.api.getConversationMessages(id, 0, TAILLE_PAGE).pipe(
                catchError((e) => {
                  this.echecChargement(id, e);
                  return EMPTY;
                }),
              ),
            ),
            map((page) => ({ id, page })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ id, page }) => this.recevoir(id, page));
  }

  private ouvrir(id: string): void {
    this.recipientId.set(id);
    this.messages.set([]);
    this.total.set(0);
    this.pageCourante.set(0);
    this.chargement.set(true);
    this.erreur.set(null);
    this.brouillon.set('');
    this.erreurEnvoi.set(null);
    this.marquageEchoue = false;
  }

  private echecChargement(id: string, e: unknown): void {
    if (this.recipientId() !== id) return;
    this.erreur.set(messageErreur(e, ERREURS_CHARGEMENT));
    this.chargement.set(false);
  }

  private recevoir(id: string, page: PrivateMessagePagedResponse): void {
    if (this.recipientId() !== id) return;
    const premier = this.chargement();
    const procheDuBas = this.procheDuBas();
    this.messages.update((l) => fusionnerMessages(l, page.content ?? []));
    this.total.set(page.totalElements ?? this.messages().length);
    this.chargement.set(false);
    this.erreur.set(null);
    // On ne ramène en bas que si on y était (ou au premier affichage) : pas de saut quand on relit un ancien message.
    if (premier || procheDuBas) this.defiler();
    this.marquerCommeLus(id);
  }

  /** Ouvrir un fil, ou y recevoir un message de l'autre, le marque comme lu côté serveur. */
  private marquerCommeLus(id: string): void {
    if (this.marquageEnCours || this.marquageEchoue) return;
    if (!this.messages().some((m) => m.senderId === id && m.isRead === false)) return;
    this.marquageEnCours = true;
    this.api.markConversationAsRead(id).subscribe({
      next: () => {
        this.marquageEnCours = false;
        if (this.recipientId() !== id) return;
        this.messages.update((l) => l.map((m) => (m.senderId === id ? { ...m, isRead: true } : m)));
        this.store.maj(id, { unreadCount: 0 });
      },
      // Au mieux : un échec ne bloque pas la lecture, et on ne réessaie pas toutes les 5 secondes.
      error: () => {
        this.marquageEnCours = false;
        this.marquageEchoue = true;
      },
    });
  }

  protected chargerAnciens(): void {
    const id = this.recipientId();
    if (!id || this.chargementAnciens()) return;
    const suivante = this.pageCourante() + 1;
    this.chargementAnciens.set(true);
    this.api.getConversationMessages(id, suivante, TAILLE_PAGE).subscribe({
      next: (page) => {
        this.chargementAnciens.set(false);
        if (this.recipientId() !== id) return;
        this.pageCourante.set(suivante);
        this.messages.update((l) => fusionnerMessages(l, page.content ?? []));
      },
      error: (e) => {
        this.chargementAnciens.set(false);
        if (this.recipientId() === id) this.erreur.set(messageErreur(e));
      },
    });
  }

  protected envoyer(): void {
    const id = this.recipientId();
    const texte = this.brouillon().trim();
    if (!id || !texte || this.envoiEnCours()) return;
    this.envoiEnCours.set(true);
    this.erreurEnvoi.set(null);
    this.api.sendPrivateMessage(id, { content: texte }).subscribe({
      next: (message) => {
        this.envoiEnCours.set(false);
        this.store.apresEnvoi(message);
        if (this.recipientId() !== id) return;
        this.messages.update((l) => fusionnerMessages(l, [message]));
        this.total.update((t) => Math.max(t, this.messages().length));
        this.brouillon.set('');
        this.defiler();
      },
      // Le texte saisi est conservé : rien n'est perdu si l'envoi échoue.
      error: (e) => {
        this.envoiEnCours.set(false);
        this.erreurEnvoi.set(messageErreur(e, ERREURS_ENVOI));
      },
    });
  }

  private procheDuBas(): boolean {
    const zone = this.zone()?.nativeElement;
    return !zone || zone.scrollHeight - zone.scrollTop - zone.clientHeight < 80;
  }

  private defiler(): void {
    setTimeout(() => {
      const zone = this.zone()?.nativeElement;
      if (zone) zone.scrollTop = zone.scrollHeight;
    });
  }
}

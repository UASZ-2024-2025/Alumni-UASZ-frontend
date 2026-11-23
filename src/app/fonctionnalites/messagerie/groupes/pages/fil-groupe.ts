import { Component, computed, DestroyRef, ElementRef, inject, Injector, afterNextRender, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, EMPTY, exhaustMap, forkJoin, interval, map, merge, Observable, Subject, Subscription, switchMap, tap } from 'rxjs';
import { GroupMessagingService } from '../../../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { Group } from '../../../../api/generes/notifications-messagerie/model/group';
import { GroupMessage } from '../../../../api/generes/notifications-messagerie/model/groupMessage';
import { GroupPreferencesUpdateRequest } from '../../../../api/generes/notifications-messagerie/model/groupPreferencesUpdateRequest';
import { SendMessageRequest } from '../../../../api/generes/notifications-messagerie/model/sendMessageRequest';
import { Alerte } from '../../../../commun/components/alerte/alerte';
import { Avatar } from '../../../../commun/components/avatar/avatar';
import { Bouton } from '../../../../commun/components/bouton/bouton';
import { Modale } from '../../../../commun/components/modale/modale';
import { Spinner } from '../../../../commun/components/spinner/spinner';
import { VocalEnregistre } from '../../../../commun/components/enregistreur-vocal/enregistreur-vocal';
import { FichierChoisi, ZoneSaisieMessage } from '../../../../commun/components/zone-saisie-message/zone-saisie-message';
import { ErreurApi } from '../../../../commun/modeles/erreur-api.model';
import { ConfirmationService } from '../../../../commun/services/confirmation.service';
import { ToastService } from '../../../../commun/services/toast.service';
import { messageErreur } from '../../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { encoreModifiable, ERREURS_MODIFICATION } from '../../edition-message';
import { ContenuPiece } from '../../pieces-jointes/contenu-piece';
import { PieceAEnvoyer } from '../../pieces-jointes/piece-a-envoyer';
import { PieceEnPreparation, PiecesJointesService } from '../../pieces-jointes/pieces-jointes.service';
import { InfosGroupe } from '../composants/infos-groupe';
import { construireFil, couleurAuteur, fusionnerMessages, heure, libelleSourdine } from '../fil';
import { GroupesStore } from '../groupes.store';

export const TAILLE_PAGE = 30;
/** Pas de temps réel dans le contrat : le fil ouvert est relu à intervalle régulier. */
export const RAFRAICHISSEMENT_MS = 15_000;
/** Limite du contrat pour le contenu d'un message. */
export const MESSAGE_MAX = 4000;

type Etat = 'chargement' | 'pret' | 'interdit' | 'introuvable' | 'erreur';

const ERREURS_ENVOI: Record<number, string> = {
  403: "Vous ne pouvez pas écrire dans ce groupe (vous n'en faites plus partie, ou seuls les administrateurs peuvent écrire).",
  404: "Ce groupe n'existe plus.",
};

/** Fil d'un groupe (route `/groupes/:id`) : seuls les membres y ont accès, le back renvoie 403 aux autres. */
@Component({
  selector: 'app-fil-groupe',
  imports: [RouterLink, Alerte, Avatar, Bouton, ContenuPiece, InfosGroupe, Modale, PieceAEnvoyer, Spinner, ZoneSaisieMessage],
  templateUrl: './fil-groupe.html',
  styleUrl: './fil-groupe.scss',
  host: { '(document:click)': 'menuOuvert.set(false)', '(document:keydown.escape)': 'echap()' },
})
export class FilGroupe {
  private readonly api = inject(GroupMessagingService);
  private readonly store = inject(GroupesStore);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  protected readonly moiId = inject(AuthentificationService).utilisateur()?.id;
  protected readonly piecesJointes = inject(PiecesJointesService);

  private readonly defilement = viewChild<ElementRef<HTMLElement>>('defilement');
  private readonly saisie = viewChild(ZoneSaisieMessage);

  protected readonly heure = heure;
  protected readonly couleurAuteur = couleurAuteur;
  protected readonly libelleSourdine = libelleSourdine;
  protected readonly messageMax = MESSAGE_MAX;

  protected readonly id = signal('');
  protected readonly etat = signal<Etat>('chargement');
  protected readonly erreur = signal<string | null>(null);
  protected readonly groupe = signal<Group | null>(null);
  private readonly messages = signal<GroupMessage[]>([]);
  private readonly total = signal(0);
  private page = 0;
  protected readonly chargementAnciens = signal(false);
  protected readonly plusAnciens = computed(() => this.messages().length < this.total());
  protected readonly fil = computed(() => construireFil(this.messages(), this.moiId));

  protected readonly brouillon = signal('');
  protected readonly envoi = signal(false);
  protected readonly erreurEnvoi = signal<string | null>(null);
  protected readonly infosOuvertes = signal(false);
  protected readonly menuOuvert = signal(false);
  /** Message en cours de modification : la saisie le reprend, « Enregistrer » remplace « Envoyer ». */
  protected readonly edition = signal<GroupMessage | null>(null);
  private brouillonAvantEdition = '';
  /** Photo, document ou vocal en attente au-dessus de la saisie (ALUM-262), et progression de son envoi. */
  protected readonly piece = signal<PieceEnPreparation | null>(null);
  protected readonly progression = signal<number | null>(null);
  private envoiPiece?: Subscription;

  private readonly moiMembre = computed(() => this.groupe()?.members?.find((m) => m.userId === this.moiId));
  /** Propriétaire ou administrateur du groupe. */
  protected readonly estAdminGroupe = computed(() => ['OWNER', 'ADMIN'].includes(this.moiMembre()?.groupRole ?? ''));
  /** Réglage « seuls les administrateurs peuvent envoyer des messages ». */
  protected readonly ecritureFermee = computed(() => !!this.groupe()?.settings?.onlyAdminsCanSend && !this.estAdminGroupe());
  protected readonly preferences = computed(() => this.groupe()?.preferences);

  /** Sous-titre façon WhatsApp : les prénoms des participants, « Vous » compris. */
  protected readonly participants = computed(() =>
    (this.groupe()?.members ?? [])
      .map((m) => (m.userId === this.moiId ? 'Vous' : m.userName ?? 'Membre'))
      .sort((a, b) => Number(a === 'Vous') - Number(b === 'Vous') || a.localeCompare(b))
      .join(', '),
  );

  /** « Réessayer » relance le chargement dans le même flux (un changement de groupe l'annule). */
  private readonly relance = new Subject<void>();

  constructor() {
    this.piecesJointes.charger();
    inject(DestroyRef).onDestroy(() => this.retirerPiece());
    const ids = inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('id') ?? ''),
      distinctUntilChanged(),
    );
    merge(ids, this.relance.pipe(map(() => this.id())))
      .pipe(
        switchMap((id) => this.ouvrir(id)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  /** Charge le groupe et la dernière page de messages, puis relit le fil régulièrement. */
  private ouvrir(id: string): Observable<unknown> {
    this.id.set(id);
    this.etat.set('chargement');
    this.erreur.set(null);
    this.groupe.set(null);
    this.messages.set([]);
    this.total.set(0);
    this.page = 0;
    this.brouillon.set('');
    this.erreurEnvoi.set(null);
    this.infosOuvertes.set(false);
    this.menuOuvert.set(false);
    this.edition.set(null);
    this.retirerPiece();

    return forkJoin([this.api.getGroupById(id), this.api.getGroupMessages(id, 0, TAILLE_PAGE)]).pipe(
      tap(([groupe, page]) => {
        this.groupe.set(groupe);
        this.messages.set(fusionnerMessages([], page.content ?? []));
        this.total.set(page.totalElements ?? page.content?.length ?? 0);
        this.etat.set('pret');
        this.marquerLu(id);
        this.allerEnBas();
      }),
      switchMap(() =>
        interval(RAFRAICHISSEMENT_MS).pipe(
          exhaustMap(() => this.api.getGroupMessages(id, 0, TAILLE_PAGE).pipe(catchError(() => EMPTY))),
          tap((page) => this.integrer(page.content ?? [], page.totalElements)),
        ),
      ),
      catchError((e) => {
        const statut = e instanceof ErreurApi ? e.statut : 0;
        if (statut === 403) this.etat.set('interdit');
        else if (statut === 404) this.etat.set('introuvable');
        else {
          this.etat.set('erreur');
          this.erreur.set(messageErreur(e));
        }
        return EMPTY;
      }),
    );
  }

  protected recharger(): void {
    this.relance.next();
  }

  /**
   * Intègre la page relue : nouveaux messages, et messages modifiés ou supprimés entre-temps.
   * Un nouvel événement (ajout, réglage, rôle...) recharge aussi le groupe pour mettre à jour droits et participants.
   */
  private integrer(recus: GroupMessage[], total?: number): void {
    const actuels = new Map(this.messages().map((m) => [m.id, m]));
    const nouveaux = recus.filter((m) => !actuels.has(m.id));
    const changes = recus.some((m) => {
      const actuel = actuels.get(m.id);
      return !!actuel && (actuel.deleted !== m.deleted || actuel.editedAt !== m.editedAt);
    });
    if (!nouveaux.length && !changes) return;
    const etaitEnBas = this.estEnBas();
    const fusion = fusionnerMessages(this.messages(), recus);
    this.total.update((t) => Math.max(t + nouveaux.length, total ?? 0));
    this.messages.set(fusion);
    if (!nouveaux.length) return;
    const dernier = fusion[fusion.length - 1];
    this.store.maj(this.id(), {
      lastMessage: dernier.content, lastMessageTime: dernier.createdAt, lastMessageType: dernier.type,
      lastMessageAttachmentKind: dernier.attachment?.kind, lastMessageSenderName: dernier.senderName,
    });
    this.marquerLu(this.id());
    if (nouveaux.some((m) => m.type === 'SYSTEM')) this.relireGroupe();
    if (etaitEnBas) this.allerEnBas();
  }

  private relireGroupe(): void {
    const id = this.id();
    this.api.getGroupById(id).subscribe({
      next: (g) => { if (id === this.id()) this.groupeModifie(g); },
      error: (e) => {
        // Retiré du groupe entre-temps : le fil n'est plus accessible.
        if (e instanceof ErreurApi && (e.statut === 403 || e.statut === 404)) this.recharger();
      },
    });
  }

  protected chargerAnciens(): void {
    if (this.chargementAnciens()) return;
    const el = this.defilement()?.nativeElement;
    const hauteurAvant = el?.scrollHeight ?? 0;
    const id = this.id();
    this.chargementAnciens.set(true);
    this.api.getGroupMessages(id, this.page + 1, TAILLE_PAGE).subscribe({
      next: (page) => {
        if (id !== this.id()) return; // un autre groupe a été ouvert entre-temps
        this.page++;
        this.chargementAnciens.set(false);
        this.messages.update((l) => fusionnerMessages(page.content ?? [], l));
        if (page.totalElements !== undefined) this.total.set(page.totalElements);
        // Garde le message lu à la même place à l'écran.
        afterNextRender(() => { if (el) el.scrollTop += el.scrollHeight - hauteurAvant; }, { injector: this.injector });
      },
      error: (e) => {
        this.chargementAnciens.set(false);
        this.erreurEnvoi.set(messageErreur(e));
      },
    });
  }

  protected envoyer(): void {
    if (this.edition()) {
      this.enregistrerEdition();
      return;
    }
    const content = this.brouillon().trim();
    if (this.envoi() || content.length > MESSAGE_MAX) return;
    const piece = this.piece();
    if (piece) this.envoyerPiece(piece, content);
    else if (content) this.publier({ content }, () => this.brouillon.set(''));
  }

  protected envoyerSticker(sticker: string): void {
    if (!this.envoi()) this.publier({ sticker });
  }

  /** Photo ou document choisi : contrôlé tout de suite, puis affiché au-dessus de la saisie (la saisie devient sa légende). */
  protected choisirFichier({ fichier, kind }: FichierChoisi): void {
    this.erreurEnvoi.set(null);
    try {
      const piece = this.piecesJointes.preparer(fichier, kind);
      this.retirerPiece();
      this.piece.set(piece);
    } catch (e) {
      this.erreurEnvoi.set(messageErreur(e));
    }
  }

  /** Un vocal part dès la fin de l'enregistrement, comme sur WhatsApp. */
  protected envoyerVocal({ fichier, duree }: VocalEnregistre): void {
    if (this.envoi()) return;
    const piece: PieceEnPreparation = { fichier, kind: 'AUDIO', duree };
    this.retirerPiece();
    this.piece.set(piece);
    this.envoyerPiece(piece, '');
  }

  /** Retire la pièce en attente ; pendant l'envoi, l'annule. */
  protected retirerPiece(): void {
    if (this.envoiPiece) {
      this.envoiPiece.unsubscribe();
      this.envoiPiece = undefined;
      this.envoi.set(false);
    }
    this.progression.set(null);
    this.piecesJointes.liberer(this.piece());
    this.piece.set(null);
  }

  private envoyerPiece(piece: PieceEnPreparation, legende: string): void {
    const id = this.id();
    this.envoi.set(true);
    this.erreurEnvoi.set(null);
    this.progression.set(0);
    this.envoiPiece = this.piecesJointes
      .envoyer(piece, { groupId: id }, (attachment) => this.api.sendGroupMessage(id, { content: legende || undefined, attachment }))
      .subscribe({
        next: (a) => {
          if ('progression' in a) {
            this.progression.set(a.progression);
            return;
          }
          this.envoiPiece = undefined;
          this.messageEnvoye(id, a.resultat, () => {
            if (legende) this.brouillon.set('');
            this.retirerPiece();
          });
        },
        error: (e) => {
          this.envoiPiece = undefined;
          this.progression.set(null);
          this.echecEnvoi(e);
        },
      });
  }

  private publier(requete: SendMessageRequest, apresEnvoi?: () => void): void {
    const id = this.id();
    this.envoi.set(true);
    this.erreurEnvoi.set(null);
    this.api.sendGroupMessage(id, requete).subscribe({
      next: (message) => this.messageEnvoye(id, message, apresEnvoi),
      error: (e) => this.echecEnvoi(e),
    });
  }

  private messageEnvoye(id: string, message: GroupMessage, apresEnvoi?: () => void): void {
    this.envoi.set(false);
    this.store.maj(id, {
      lastMessage: message.content, lastMessageTime: message.createdAt, lastMessageType: message.type ?? 'TEXT',
      lastMessageAttachmentKind: message.attachment?.kind, lastMessageSenderName: message.senderName,
    });
    if (id !== this.id()) return; // un autre groupe a été ouvert entre-temps
    apresEnvoi?.();
    this.messages.update((l) => fusionnerMessages(l, [message]));
    this.total.update((t) => t + 1);
    this.allerEnBas();
    this.saisie()?.focus();
  }

  private echecEnvoi(e: unknown): void {
    this.envoi.set(false);
    this.erreurEnvoi.set(messageErreur(e, ERREURS_ENVOI));
    // Le réglage d'envoi a pu changer : on relit le groupe pour afficher le bon état de la saisie.
    if (e instanceof ErreurApi && e.statut === 403) this.relireGroupe();
  }

  /** L'auteur supprime son message ; le propriétaire et les administrateurs suppriment celui de n'importe qui. */
  protected peutSupprimer(m: GroupMessage): boolean {
    return m.type !== 'SYSTEM' && !m.deleted && (m.senderId === this.moiId || this.estAdminGroupe());
  }

  /**
   * Seul l'auteur modifie son message, pendant 15 minutes, et tant qu'il peut écrire dans le groupe.
   * Texte, ou légende d'une photo ou d'un document ; un sticker ou un vocal ne se modifie pas.
   */
  protected peutModifier(m: GroupMessage): boolean {
    return m.type !== 'SYSTEM' && m.type !== 'STICKER' && m.attachment?.kind !== 'AUDIO'
      && m.senderId === this.moiId && !this.ecritureFermee() && encoreModifiable(m);
  }

  protected commencerEdition(m: GroupMessage): void {
    if (!this.edition()) this.brouillonAvantEdition = this.brouillon();
    this.edition.set(m);
    this.erreurEnvoi.set(null);
    this.brouillon.set(m.content ?? '');
    this.saisie()?.focus();
  }

  protected annulerEdition(): void {
    if (!this.edition()) return;
    this.edition.set(null);
    this.brouillon.set(this.brouillonAvantEdition);
    this.brouillonAvantEdition = '';
  }

  private enregistrerEdition(): void {
    const m = this.edition();
    const content = this.brouillon().trim();
    if (!m?.id || !content || this.envoi() || content.length > MESSAGE_MAX) return;
    if (content === m.content) {
      this.annulerEdition();
      return;
    }
    const id = this.id();
    this.envoi.set(true);
    this.erreurEnvoi.set(null);
    this.api.editGroupMessage(id, m.id, { content }).subscribe({
      next: (modifie) => {
        this.envoi.set(false);
        if (id !== this.id()) return;
        const dernier = this.messages().at(-1);
        this.messages.update((l) => fusionnerMessages(l, [modifie]));
        if (dernier?.id === modifie.id) this.store.maj(id, { lastMessage: modifie.content });
        this.annulerEdition();
        this.saisie()?.focus();
      },
      error: (e) => {
        this.envoi.set(false);
        this.erreurEnvoi.set(messageErreur(e, ERREURS_MODIFICATION));
      },
    });
  }

  protected async supprimerMessage(m: GroupMessage): Promise<void> {
    const ok = await this.confirmation.demander({
      titre: 'Supprimer le message',
      message: 'Supprimer ce message pour tous les participants ? « Ce message a été supprimé » restera visible à sa place.',
      libelleConfirmer: 'Supprimer pour tous',
      danger: true,
    });
    if (!ok || !m.id) return;
    const id = this.id();
    this.api.deleteGroupMessage(id, m.id).subscribe({
      next: () => {
        if (id !== this.id()) return;
        this.messages.update((l) =>
          l.map((x) => (x.id === m.id ? { ...x, deleted: true, content: undefined, sticker: undefined, attachment: undefined } : x)));
        if (this.edition()?.id === m.id) this.annulerEdition();
      },
      error: (e) => this.toast.erreur(messageErreur(e, { 403: 'Vous ne pouvez supprimer que vos propres messages.' })),
    });
  }

  // --- Menu ⋮ : préférences personnelles rapides ---
  protected basculerMenu(e: Event): void {
    e.stopPropagation(); // sinon le clic sur le document referme aussitôt le menu
    this.menuOuvert.update((o) => !o);
  }

  protected echap(): void {
    this.menuOuvert.set(false);
    this.annulerEdition();
  }

  protected preference(changement: GroupPreferencesUpdateRequest, confirmationToast: string): void {
    this.menuOuvert.set(false);
    const id = this.id();
    this.api.updateGroupPreferences(id, changement).subscribe({
      next: (preferences) => {
        this.store.maj(id, { preferences });
        if (id === this.id()) this.groupe.update((g) => (g ? { ...g, preferences } : g));
        this.toast.succes(confirmationToast);
      },
      error: (e) => this.toast.erreur(messageErreur(e)),
    });
  }

  // --- Retours du panneau d'informations ---
  protected groupeModifie(g: Group): void {
    this.groupe.set(g);
    this.store.maj(this.id(), { name: g.name, memberCount: g.members?.length, preferences: g.preferences });
  }

  protected groupeQuitte(): void {
    this.infosOuvertes.set(false);
    this.store.retirer(this.id());
    this.router.navigate(['/groupes']);
  }

  private marquerLu(id: string): void {
    this.store.maj(id, { unreadCount: 0 });
    this.api.markGroupAsRead(id).subscribe({ error: () => undefined }); // sans conséquence pour la lecture du fil
  }

  private estEnBas(): boolean {
    const el = this.defilement()?.nativeElement;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  private allerEnBas(): void {
    afterNextRender(
      () => {
        const el = this.defilement()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      },
      { injector: this.injector },
    );
  }
}

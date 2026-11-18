import { Component, computed, ElementRef, inject, Injector, afterNextRender, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, EMPTY, exhaustMap, forkJoin, interval, map, merge, Observable, Subject, switchMap, tap } from 'rxjs';
import { GroupMessagingService } from '../../../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { Group } from '../../../../api/generes/notifications-messagerie/model/group';
import { GroupMessage } from '../../../../api/generes/notifications-messagerie/model/groupMessage';
import { Alerte } from '../../../../commun/components/alerte/alerte';
import { Avatar } from '../../../../commun/components/avatar/avatar';
import { Modale } from '../../../../commun/components/modale/modale';
import { Spinner } from '../../../../commun/components/spinner/spinner';
import { ErreurApi } from '../../../../commun/modeles/erreur-api.model';
import { messageErreur } from '../../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { InfosGroupe } from '../composants/infos-groupe';
import { construireFil, couleurAuteur, fusionnerMessages, heure } from '../fil';
import { GroupesStore } from '../groupes.store';

export const TAILLE_PAGE = 30;
/** Pas de temps réel dans le contrat : le fil ouvert est relu à intervalle régulier. */
export const RAFRAICHISSEMENT_MS = 15_000;

type Etat = 'chargement' | 'pret' | 'interdit' | 'introuvable' | 'erreur';

const ERREURS_ENVOI: Record<number, string> = {
  403: 'Vous ne faites plus partie de ce groupe.',
  404: "Ce groupe n'existe plus.",
};

/** Fil d'un groupe (route `/groupes/:id`) : seuls les membres y ont accès, le back renvoie 403 aux autres. */
@Component({
  selector: 'app-fil-groupe',
  imports: [RouterLink, Alerte, Avatar, InfosGroupe, Modale, Spinner],
  templateUrl: './fil-groupe.html',
  styleUrl: './fil-groupe.scss',
})
export class FilGroupe {
  private readonly api = inject(GroupMessagingService);
  private readonly store = inject(GroupesStore);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  protected readonly moiId = inject(AuthentificationService).utilisateur()?.id;

  private readonly defilement = viewChild<ElementRef<HTMLElement>>('defilement');
  private readonly saisie = viewChild<ElementRef<HTMLTextAreaElement>>('saisie');

  protected readonly heure = heure;
  protected readonly couleurAuteur = couleurAuteur;

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

  /** Ajoute les nouveaux messages reçus ; reste en bas du fil si on y était déjà. */
  private integrer(nouveaux: GroupMessage[], total?: number): void {
    const avant = this.messages().length;
    const fusion = fusionnerMessages(this.messages(), nouveaux);
    if (fusion.length === avant) return;
    const etaitEnBas = this.estEnBas();
    this.total.update((t) => Math.max(t + fusion.length - avant, total ?? 0));
    this.messages.set(fusion);
    const dernier = fusion[fusion.length - 1];
    this.store.maj(this.id(), { lastMessage: dernier.content, lastMessageTime: dernier.createdAt });
    this.marquerLu(this.id());
    if (etaitEnBas) this.allerEnBas();
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

  protected touche(e: KeyboardEvent): void {
    // Entrée envoie, Maj+Entrée passe à la ligne (comme WhatsApp Web).
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this.envoyer();
    }
  }

  protected envoyer(): void {
    const content = this.brouillon().trim();
    if (!content || this.envoi()) return;
    const id = this.id();
    this.envoi.set(true);
    this.erreurEnvoi.set(null);
    this.api.sendGroupMessage(id, { content }).subscribe({
      next: (message) => {
        this.envoi.set(false);
        this.store.maj(id, { lastMessage: message.content ?? content, lastMessageTime: message.createdAt });
        if (id !== this.id()) return; // un autre groupe a été ouvert entre-temps
        this.brouillon.set('');
        this.messages.update((l) => fusionnerMessages(l, [message]));
        this.total.update((t) => t + 1);
        this.allerEnBas();
        this.saisie()?.nativeElement.focus();
      },
      error: (e) => {
        this.envoi.set(false);
        this.erreurEnvoi.set(messageErreur(e, ERREURS_ENVOI));
      },
    });
  }

  // --- Retours du panneau d'informations ---
  protected groupeModifie(g: Group): void {
    this.groupe.set(g);
    this.store.maj(this.id(), { name: g.name, memberCount: g.members?.length });
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

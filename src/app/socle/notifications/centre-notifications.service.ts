import { inject, Injectable, signal } from '@angular/core';
import { EMPTY, exhaustMap, catchError, filter, fromEvent, merge, Subscription, timer } from 'rxjs';
import { NotificationsService } from '../../api/generes/notifications-messagerie/api/notifications.service';
import { Notification } from '../../api/generes/notifications-messagerie/model/notification';
import { messageErreur } from '../../commun/utilitaires/messages-erreur';

/** Délai entre deux interrogations du compteur de non-lus (ALUM-160 : polling, pas de websocket). */
export const INTERVALLE_POLLING_MS = 30_000;
/** Nombre de notifications affichées dans le panneau de la cloche. */
export const TAILLE_PANNEAU = 10;

const ERREURS_MARQUAGE: Record<number, string> = {
  404: "Cette notification n'existe plus.",
};

/**
 * État partagé de la cloche : compteur de non-lus, liste récente, marquage comme lu.
 * `demarrer()` lance le polling, `arreter()` l'interrompt et efface tout (changement d'utilisateur).
 */
@Injectable({ providedIn: 'root' })
export class CentreNotificationsService {
  private readonly api = inject(NotificationsService);
  private abonnement: Subscription | null = null;

  readonly nonLus = signal(0);
  readonly notifications = signal<Notification[]>([]);
  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);

  /** Interroge le compteur tout de suite, puis toutes les 30 s et au retour sur l'onglet. Sans effet s'il tourne déjà. */
  demarrer(): void {
    if (this.abonnement) return;
    this.abonnement = merge(timer(0, INTERVALLE_POLLING_MS), fromEvent(document, 'visibilitychange'))
      .pipe(
        filter(() => !document.hidden),
        // exhaustMap : pas de requête empilée si le back répond lentement ; l'erreur d'un tour n'arrête pas le suivant.
        exhaustMap(() => this.api.getUnreadNotificationCount().pipe(catchError(() => EMPTY))),
      )
      .subscribe((r) => this.nonLus.set(r.unreadCount ?? 0));
  }

  arreter(): void {
    this.abonnement?.unsubscribe();
    this.abonnement = null;
    this.nonLus.set(0);
    this.notifications.set([]);
    this.chargement.set(false);
    this.erreur.set(null);
  }

  /** Charge les notifications les plus récentes (lues et non lues). */
  charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.api.getUserNotifications(false, 0, TAILLE_PANNEAU).subscribe({
      next: (r) => {
        this.notifications.set(r.content ?? []);
        this.chargement.set(false);
      },
      error: (e: unknown) => {
        this.erreur.set(messageErreur(e));
        this.chargement.set(false);
      },
    });
  }

  marquerLue(notification: Notification): void {
    if (!notification.id || notification.isRead) return;
    const id = notification.id;
    this.api.markNotificationAsRead(id).subscribe({
      next: () => {
        this.notifications.update((l) => l.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        this.nonLus.update((n) => Math.max(0, n - 1));
      },
      error: (e: unknown) => this.erreur.set(messageErreur(e, ERREURS_MARQUAGE)),
    });
  }

  toutMarquerLu(): void {
    this.erreur.set(null);
    this.api.markAllNotificationsAsRead().subscribe({
      next: () => {
        this.notifications.update((l) => l.map((n) => ({ ...n, isRead: true })));
        this.nonLus.set(0);
      },
      error: (e: unknown) => this.erreur.set(messageErreur(e)),
    });
  }
}

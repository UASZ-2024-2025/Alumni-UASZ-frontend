import { DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Notification } from '../../api/generes/notifications-messagerie/model/notification';
import { Alerte } from '../../commun/components/alerte/alerte';
import { Bouton } from '../../commun/components/bouton/bouton';
import { EtatVide } from '../../commun/components/etat-vide/etat-vide';
import { Spinner } from '../../commun/components/spinner/spinner';
import { AuthentificationService } from '../authentification/services/authentification.service';
import { CentreNotificationsService } from './centre-notifications.service';
import { cheminNotification } from './liens-notifications';

/**
 * ALUM-160 : cloche de l'en-tête. Le compteur de non-lus se met à jour tout seul (polling) ;
 * un clic ouvre le panneau des notifications récentes.
 */
@Component({
  selector: 'app-cloche-notifications',
  imports: [DatePipe, Alerte, Bouton, EtatVide, Spinner],
  templateUrl: './cloche-notifications.html',
  styleUrl: './cloche-notifications.scss',
})
export class ClocheNotifications {
  private readonly centre = inject(CentreNotificationsService);
  private readonly auth = inject(AuthentificationService);
  private readonly router = inject(Router);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly ouvert = signal(false);
  protected readonly nonLus = this.centre.nonLus;
  protected readonly notifications = this.centre.notifications;
  protected readonly chargement = this.centre.chargement;
  protected readonly erreur = this.centre.erreur;

  /** « 99+ » au-delà de 99 pour que la pastille reste lisible. */
  protected readonly compteurAffiche = computed(() => (this.nonLus() > 99 ? '99+' : String(this.nonLus())));
  protected readonly libelleCloche = computed(() => {
    const n = this.nonLus();
    return n === 0 ? 'Notifications' : `Notifications, ${n} non lue${n > 1 ? 's' : ''}`;
  });

  constructor() {
    this.centre.demarrer();
    inject(DestroyRef).onDestroy(() => this.centre.arreter());

    // Un nouveau message arrive pendant que le panneau est ouvert : la liste suit le compteur.
    let precedent = this.nonLus();
    effect(() => {
      const actuel = this.nonLus();
      if (this.ouvert() && actuel > precedent) this.centre.charger();
      precedent = actuel;
    });
  }

  protected basculer(): void {
    const ouvrir = !this.ouvert();
    this.ouvert.set(ouvrir);
    if (ouvrir) this.centre.charger();
  }

  protected toutMarquerLu(): void {
    this.centre.toutMarquerLu();
  }

  protected ouvrirNotification(notification: Notification): void {
    this.centre.marquerLue(notification);
    this.ouvert.set(false);
    const chemin = cheminNotification(notification.type, this.auth.role());
    if (chemin) void this.router.navigateByUrl(chemin);
  }

  @HostListener('document:keydown.escape')
  protected fermerAuClavier(): void {
    this.ouvert.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected fermerSiClicExterieur(evenement: MouseEvent): void {
    if (this.ouvert() && !this.hote.nativeElement.contains(evenement.target as Node)) this.ouvert.set(false);
  }
}

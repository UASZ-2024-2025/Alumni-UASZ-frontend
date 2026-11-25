import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationsService } from '../../api/generes/notifications-messagerie/api/notifications.service';
import { Alerte } from '../../commun/components/alerte/alerte';
import { Bouton } from '../../commun/components/bouton/bouton';
import { Carte } from '../../commun/components/carte/carte';
import { CarteStat } from '../../commun/components/carte-stat/carte-stat';
import { Spinner } from '../../commun/components/spinner/spinner';
import { TableauDeBord } from '../../commun/components/tableau-de-bord/tableau-de-bord';
import { messageErreur } from '../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';

/** Page d'accueil de l'enseignant (ALUM-240) : salutation, notifications, raccourcis et statistiques. */
@Component({
  selector: 'app-accueil-enseignant',
  imports: [RouterLink, Alerte, Bouton, Carte, CarteStat, Spinner, TableauDeBord],
  template: `
    <p class="salutation">{{ salutation() }}</p>
    <p class="intro">Consultez l'annuaire et échangez avec les étudiants et les Alumni.</p>

    @if (chargement()) {
      <app-spinner libelle="Chargement de votre activité…" />
    } @else {
      @if (erreur(); as message) {
        <app-alerte>
          {{ message }}
          <app-bouton variante="secondaire" [petit]="true" (clic)="charger()">Réessayer</app-bouton>
        </app-alerte>
      } @else {
        <div class="chiffres">
          <app-carte-stat libelle="Notifications non lues" [valeur]="nonLues()" />
        </div>
      }

      <app-carte titre="Raccourcis">
        <ul class="raccourcis">
          <li><a routerLink="/annuaire">Consulter l’annuaire</a></li>
        </ul>
      </app-carte>

      <app-tableau-de-bord titre="Statistiques" [admin]="statistiquesOuvertes" />
    }
  `,
  styles: `
    .salutation { margin: 0; font: 700 1.625rem/1.2 var(--police-titre); }
    .intro { margin: .25rem 0 0; color: var(--mu); }
    .chiffres { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); gap: 10px; margin-bottom: 14px; }
    app-alerte, app-carte { display: block; margin-bottom: 14px; }
    .raccourcis { margin: 0; padding-left: 1.2rem; }
  `,
})
export class AccueilEnseignant implements OnInit {
  private readonly auth = inject(AuthentificationService);
  private readonly notifications = inject(NotificationsService);

  /** À passer à true quand ALUM-182 ouvre les API de statistiques aux enseignants. */
  protected readonly statistiquesOuvertes = false;

  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly nonLues = signal<number | undefined>(undefined);

  protected readonly salutation = computed(() => {
    const prenom = this.auth.utilisateur()?.firstName?.trim();
    return prenom ? `Bonjour ${prenom}` : 'Bonjour';
  });

  ngOnInit(): void {
    this.charger();
  }

  protected charger(): void {
    this.erreur.set(null);
    this.chargement.set(true);
    this.notifications.getUnreadNotificationCount().subscribe({
      next: (r) => {
        this.nonLues.set(r.unreadCount ?? 0);
        this.chargement.set(false);
      },
      error: (e) => {
        this.erreur.set(messageErreur(e));
        this.chargement.set(false);
      },
    });
  }
}

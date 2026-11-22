import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ApplicationsService } from '../../api/generes/offres-emploi/api/applications.service';
import { OffersService } from '../../api/generes/offres-emploi/api/offers.service';
import { OfferStatus } from '../../api/generes/offres-emploi/model/offerStatus';
import { NotificationsService } from '../../api/generes/notifications-messagerie/api/notifications.service';
import { Alerte } from '../../commun/components/alerte/alerte';
import { Bouton } from '../../commun/components/bouton/bouton';
import { EntetePage } from '../../commun/components/entete-page/entete-page';
import { Carte } from '../../commun/components/carte/carte';
import { CarteStat } from '../../commun/components/carte-stat/carte-stat';
import { EtatVide } from '../../commun/components/etat-vide/etat-vide';
import { messageErreur } from '../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';
import { MENUS } from '../../socle/mise-en-page/menus.config';

/** Phrase d'accueil propre à chaque rôle (ALUM-231 étudiant, ALUM-234 Alumni, ALUM-237 entreprise). */
const INTRO: Record<string, string> = {
  ETUDIANT: 'Complétez votre profil et votre CV, puis repérez les offres et suivez vos candidatures.',
  ALUMNI: 'Partagez votre parcours, publiez des propositions et restez en lien avec la communauté.',
  ENTREPRISE: 'Gérez votre fiche, publiez vos offres et suivez les candidatures reçues.',
  ENSEIGNANT: 'Consultez l’annuaire et échangez avec les étudiants et les Alumni.',
  ADMINISTRATEUR: 'Pilotez la plateforme : comptes, promotions, entreprises et statistiques.',
};

/** Page d'accueil : bonjour, notifications non lues, et raccourcis vers le menu du rôle. */
@Component({
  selector: 'app-accueil',
  imports: [Alerte, Bouton, Carte, CarteStat, EntetePage, EtatVide],
  template: `
    <app-entete-page [titre]="salutation()">
      <p class="intro">{{ intro() }}</p>
    </app-entete-page>

    @if (erreur(); as message) {
      <app-alerte>
        {{ message }}
        <app-bouton variante="secondaire" [petit]="true" (clic)="charger()">Réessayer</app-bouton>
      </app-alerte>
    }
    <div class="chiffres">
      <app-carte-stat libelle="Notifications non lues" [valeur]="nonLues()" />
      @for (c of chiffres(); track c.libelle) {
        <app-carte-stat [libelle]="c.libelle" [valeur]="c.valeur" />
      }
    </div>

    <app-carte titre="Accès rapides">
      @if (raccourcis().length === 0) {
        <app-etat-vide titre="Aucun raccourci disponible" />
      } @else {
        <ul class="raccourcis">
          @for (r of raccourcis(); track r.chemin) {
            <li><app-bouton variante="secondaire" [pleineLargeur]="true" [lien]="r.chemin">{{ r.libelle }}</app-bouton></li>
          }
        </ul>
      }
    </app-carte>
  `,
  styles: `
    .intro { margin: .25rem 0 0; color: var(--mu); }
    .chiffres { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); gap: 10px; margin-bottom: 14px; }
    app-carte, app-alerte { display: block; margin-bottom: 14px; }
    .raccourcis app-bouton { display: block; }
    .raccourcis { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
  `,
})
export class Accueil implements OnInit {
  protected readonly auth = inject(AuthentificationService);
  private readonly notifications = inject(NotificationsService);
  private readonly offres = inject(OffersService);
  private readonly candidatures = inject(ApplicationsService);

  protected readonly salutation = computed(() => {
    const prenom = this.auth.utilisateur()?.firstName?.trim();
    return prenom ? `Bonjour ${prenom}` : 'Bonjour';
  });
  protected readonly nonLues = signal<number | undefined>(undefined);
  protected readonly erreur = signal<string | null>(null);
  /** Chiffres propres au rôle ; un chiffre indisponible reste à « — » sans bloquer la page. */
  protected readonly chiffres = signal<{ libelle: string; valeur?: number }[]>([]);

  protected readonly intro = computed(() => INTRO[this.auth.role() ?? ''] ?? '');
  /** Les liens du menu du rôle, sans la messagerie ni les notifications (déjà dans la barre latérale). */
  protected readonly raccourcis = computed(() =>
    (MENUS[this.auth.role() ?? 'ETUDIANT'] ?? []).filter((m) => m.chemin !== '/notifications' && m.chemin !== '/messagerie'),
  );

  ngOnInit(): void {
    this.charger();
  }

  protected charger(): void {
    this.erreur.set(null);
    this.notifications.getUnreadNotificationCount().subscribe({
      next: (r) => this.nonLues.set(r.unreadCount ?? 0),
      error: (e) => this.erreur.set(messageErreur(e)),
    });
    this.chargerChiffres();
  }

  private chargerChiffres(): void {
    const role = this.auth.role();
    const companyId = this.auth.utilisateur()?.companyId;
    const ajouter = (libelle: string, total$: Observable<number | undefined>) => {
      const i = this.chiffres().length;
      this.chiffres.update((l) => [...l, { libelle }]);
      total$.subscribe({
        next: (valeur) => this.chiffres.update((l) => l.map((c, j) => (j === i ? { ...c, valeur } : c))),
        error: () => undefined,
      });
    };
    this.chiffres.set([]);
    if (role === 'ETUDIANT') {
      ajouter('Mes candidatures', this.candidatures.listMyApplications(undefined, undefined, 0, 1).pipe(map((r) => r.totalElements)));
    }
    if (role === 'ETUDIANT' || role === 'ALUMNI') {
      ajouter('Offres ouvertes', this.offres.searchOffers(undefined, undefined, undefined, undefined, undefined, OfferStatus.Open, 0, 1).pipe(map((r) => r.totalElements)));
    }
    if (role === 'ENTREPRISE' && companyId) {
      ajouter('Mes offres', this.offres.searchOffers(undefined, undefined, companyId, undefined, undefined, undefined, 0, 1).pipe(map((r) => r.totalElements)));
    }
  }
}

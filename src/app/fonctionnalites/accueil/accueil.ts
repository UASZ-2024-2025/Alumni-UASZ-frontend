import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ApplicationsService } from '../../api/generes/offres-emploi/api/applications.service';
import { OffersService } from '../../api/generes/offres-emploi/api/offers.service';
import { OfferStatus } from '../../api/generes/offres-emploi/model/offerStatus';
import { NotificationsService } from '../../api/generes/notifications-messagerie/api/notifications.service';
import { Alerte } from '../../commun/components/alerte/alerte';
import { Bouton } from '../../commun/components/bouton/bouton';
import { EntetePage } from '../../commun/components/entete-page/entete-page';
import { CarteStat } from '../../commun/components/carte-stat/carte-stat';
import { messageErreur } from '../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';
import { AccueilEnseignant } from './accueil-enseignant';

/** Phrase d'accueil propre à chaque rôle (ALUM-231 étudiant, ALUM-234 Alumni, ALUM-237 entreprise). */
const INTRO: Record<string, string> = {
  ETUDIANT: 'Complétez votre profil et votre CV, puis repérez les offres et suivez vos candidatures.',
  ALUMNI: 'Partagez votre parcours, publiez des propositions et restez en lien avec la communauté.',
  ENTREPRISE: 'Gérez votre fiche, publiez vos offres et suivez les candidatures reçues.',
  ENSEIGNANT: 'Consultez l’annuaire et échangez avec les étudiants et les Alumni.',
  ADMINISTRATEUR: 'Pilotez la plateforme : comptes, promotions, entreprises et statistiques.',
};

/** Page d'accueil : bonjour, notifications non lues et chiffres clés du rôle (la navigation est dans le menu). */
@Component({
  selector: 'app-accueil',
  imports: [AccueilEnseignant, Alerte, Bouton, CarteStat, EntetePage],
  template: `
    @if (auth.role() === 'ENSEIGNANT') {
      <app-accueil-enseignant />
    } @else {
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
    }
  `,
  styles: `
    .intro { margin: .25rem 0 0; color: var(--mu); }
    .chiffres { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); gap: 10px; margin-bottom: 14px; }
    app-alerte { display: block; margin-bottom: 14px; }
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
      // ponytail: le serveur n'a pas de total global, on additionne offre par offre (100 offres au plus) ; endpoint dédié si ça devient lourd
      ajouter(
        'Candidatures reçues',
        this.offres.searchOffers(undefined, undefined, companyId, undefined, undefined, undefined, 0, 100).pipe(
          switchMap((r) => {
            const ids = (r.content ?? []).map((o) => o.id).filter((id): id is string => !!id);
            return ids.length ? forkJoin(ids.map((id) => this.candidatures.getApplicationsForOffer(id))) : of([]);
          }),
          map((listes) => listes.reduce((t, l) => t + l.length, 0)),
        ),
      );
    }
  }
}
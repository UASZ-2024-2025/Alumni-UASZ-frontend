import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, timeout, TimeoutError } from 'rxjs';
import { JobOffer, OfferStatus, OfferType } from '../../../api/generes/offres-emploi';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Badge, TonBadge } from '../../../commun/components/badge/badge';
import { Carte } from '../../../commun/components/carte/carte';
import { Pagination } from '../../../commun/components/pagination/pagination';
import { ColonneTableau, Tableau } from '../../../commun/components/tableau/tableau';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { estCompteNonRattache } from '../services/offres-entreprise.service';
import { OffresEntrepriseService } from '../services/offres-entreprise.service';

const TAILLE_PAGE = 10;
/** Au-delà, on considère que le serveur ne répond pas (évite un chargement infini). */
const DELAI_MS = 20_000;

const MESSAGE_SERVEUR = "Le serveur a rencontré un problème. Réessayez dans un instant ou contactez l'équipe.";
const MESSAGES_LISTE: Record<number, string> = {
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: "Accès refusé : votre entreprise n'est pas encore validée.",
  404: 'Entreprise introuvable.',
  500: MESSAGE_SERVEUR,
  502: MESSAGE_SERVEUR,
  503: MESSAGE_SERVEUR,
  504: MESSAGE_SERVEUR,
};

@Component({
  selector: 'app-mes-offres',
  imports: [RouterLink, DatePipe, Alerte, Badge, Carte, Pagination, Tableau],
  template: `
    <app-carte titre="Mes offres">
      <p class="entete">
        <a class="btn btn--principal btn--auto" routerLink="/offres-emploi/publier">Publier une offre</a>
      </p>

      @if (erreur()) {
        <app-alerte>
          {{ erreur() }}
          @if (sansFiche()) { <a routerLink="/entreprise/ma-fiche">Ma fiche entreprise</a> }
        </app-alerte>
      }

      <app-tableau
        [colonnes]="colonnes"
        [lignes]="offres()"
        [chargement]="chargement()"
        legende="Liste de mes offres"
        messageVide="Vous n'avez publié aucune offre pour le moment."
      >
        <ng-template #cellule let-ligne let-cle="cle">
          @switch (cle) {
            @case ('type') { {{ ligne.type === typeStage ? 'Stage' : 'Emploi' }} }
            @case ('status') {
              <app-badge [ton]="ton(ligne.status)">{{ libelleStatut(ligne.status) }}</app-badge>
            }
            @case ('createdAt') { {{ ligne.createdAt | date: 'dd/MM/yyyy' }} }
            @case ('candidatures') {
              <a [routerLink]="['/offres-emploi', ligne.id, 'candidatures']">Voir</a>
            }
            @default { {{ ligne[cle] }} }
          }
        </ng-template>
      </app-tableau>

      @if (nbPages() > 1) {
        <app-pagination [page]="page()" [nbPages]="nbPages()" (changement)="charger($event)" />
      }
    </app-carte>
  `,
  styles: `
    .entete { display: flex; justify-content: flex-end; margin: 0 0 1rem; }
  `,
})
export class MesOffres implements OnInit {
  private readonly service = inject(OffresEntrepriseService);

  protected readonly typeStage = OfferType.Internship;
  protected readonly colonnes: ColonneTableau[] = [
    { cle: 'title', libelle: 'Intitulé' },
    { cle: 'type', libelle: 'Type' },
    { cle: 'location', libelle: 'Lieu' },
    { cle: 'status', libelle: 'Statut' },
    { cle: 'createdAt', libelle: 'Publiée le' },
    { cle: 'candidatures', libelle: 'Candidatures' },
  ];

  protected readonly offres = signal<JobOffer[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  /** Compte ENTREPRISE sans fiche : on propose de la créer (ALUM-224). */
  protected readonly sansFiche = signal(false);
  protected readonly page = signal(0);
  protected readonly nbPages = signal(1);

  ngOnInit(): void {
    this.charger(0);
  }

  protected charger(page: number): void {
    this.chargement.set(true);
    this.erreur.set(null);

    try {
      this.service
        .mesOffres(page, TAILLE_PAGE)
        .pipe(
          timeout(DELAI_MS),
          finalize(() => this.chargement.set(false)),
        )
        .subscribe({
          next: (reponse) => {
            this.offres.set(reponse.content ?? []);
            this.page.set(page);
            this.nbPages.set(Math.max(1, Math.ceil((reponse.totalElements ?? 0) / TAILLE_PAGE)));
          },
          error: (e: unknown) => {
            this.offres.set([]);
            this.sansFiche.set(estCompteNonRattache(e));
            this.erreur.set(
              e instanceof TimeoutError
                ? 'Le serveur met trop de temps à répondre. Réessayez dans un instant.'
                : messageErreur(e, MESSAGES_LISTE),
            );
          },
        });
    } catch {
      this.chargement.set(false);
      this.offres.set([]);
      this.erreur.set('Impossible de charger vos offres. Réessayez.');
    }
  }

  protected ton(statut?: OfferStatus): TonBadge {
    return statut === OfferStatus.Open ? 'ok' : statut === OfferStatus.Closed ? 'attention' : 'neutre';
  }

  protected libelleStatut(statut?: OfferStatus): string {
    return statut === OfferStatus.Closed ? 'Clôturée' : statut === OfferStatus.Archived ? 'Archivée' : 'Ouverte';
  }
}
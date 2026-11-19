import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobOffer, OfferStatus, OfferType } from '../../../api/generes/offres-emploi';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Badge, TonBadge } from '../../../commun/components/badge/badge';
import { Carte } from '../../../commun/components/carte/carte';
import { Pagination } from '../../../commun/components/pagination/pagination';
import { ColonneTableau, Tableau } from '../../../commun/components/tableau/tableau';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { OffresEntrepriseService } from '../services/offres-entreprise.service';

const TAILLE_PAGE = 10;

@Component({
  selector: 'app-mes-offres',
  imports: [RouterLink, DatePipe, Alerte, Badge, Carte, Pagination, Tableau],
  template: `
    <app-carte titre="Mes offres">
      <p class="entete">
        <a class="btn btn--principal btn--auto" routerLink="/offres-emploi/publier">Publier une offre</a>
      </p>

      @if (erreur()) { <app-alerte>{{ erreur() }}</app-alerte> }

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
  ];

  protected readonly offres = signal<JobOffer[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly nbPages = signal(1);

  ngOnInit(): void {
    this.charger(0);
  }

  protected charger(page: number): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.service.mesOffres(page, TAILLE_PAGE).subscribe({
      next: (reponse) => {
        this.offres.set(reponse.content ?? []);
        this.page.set(page);
        this.nbPages.set(Math.max(1, Math.ceil((reponse.totalElements ?? 0) / TAILLE_PAGE)));
        this.chargement.set(false);
      },
      error: (e) => {
        this.offres.set([]);
        this.chargement.set(false);
        this.erreur.set(
          messageErreur(e, {
            401: 'Votre session a expiré. Reconnectez-vous.',
            403: "Accès refusé : votre entreprise n'est pas encore validée.",
            404: 'Entreprise introuvable.',
          }),
        );
      },
    });
  }

  protected ton(statut?: OfferStatus): TonBadge {
    return statut === OfferStatus.Open ? 'ok' : statut === OfferStatus.Closed ? 'attention' : 'neutre';
  }

  protected libelleStatut(statut?: OfferStatus): string {
    return statut === OfferStatus.Closed ? 'Clôturée' : statut === OfferStatus.Archived ? 'Archivée' : 'Ouverte';
  }
}
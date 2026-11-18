import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OffersService } from '../../../api/generes/offres-emploi/api/offers.service';
import { JobOffer } from '../../../api/generes/offres-emploi/model/jobOffer';
import { OfferType } from '../../../api/generes/offres-emploi/model/offerType';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Badge, TonBadge } from '../../../commun/components/badge/badge';
import { BarreRecherche } from '../../../commun/components/barre-recherche/barre-recherche';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { Pagination } from '../../../commun/components/pagination/pagination';
import { ColonneTableau, Tableau } from '../../../commun/components/tableau/tableau';
import { creerListePaginee } from '../../../commun/utilitaires/liste-paginee';
import { MODES, STATUTS, TYPES } from '../offres-libelles';

/** Liste des offres d'emploi et de stage (ALUM-156) : recherche, filtre par type, pagination, lien vers le détail. */
@Component({
  selector: 'app-liste-offres',
  imports: [DatePipe, FormsModule, RouterLink, Alerte, Badge, BarreRecherche, Champ, Pagination, Tableau],
  templateUrl: './liste-offres.html',
  styles: `
    .identite-texte { display: flex; flex-direction: column; gap: 2px; }
    .identite-texte small { color: var(--mu); }
  `,
})
export class ListeOffres {
  private readonly api = inject(OffersService);

  private requete = '';
  protected type = '';

  protected readonly optionsType: OptionChamp[] = [
    { valeur: '', libelle: 'Tous les types' },
    { valeur: OfferType.Job, libelle: TYPES[OfferType.Job] },
    { valeur: OfferType.Internship, libelle: TYPES[OfferType.Internship] },
  ];
  protected readonly colonnes: ColonneTableau[] = [
    { cle: 'title', libelle: 'Offre' },
    { cle: 'type', libelle: 'Type' },
    { cle: 'location', libelle: 'Lieu' },
    { cle: 'deadline', libelle: 'Échéance' },
    { cle: 'status', libelle: 'Statut' },
  ];

  protected readonly liste = creerListePaginee<JobOffer>(
    (page, taille) =>
      this.api.searchOffers(
        this.requete || undefined,
        (this.type || undefined) as OfferType | undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        page,
        taille,
      ),
    10,
  );

  constructor() {
    this.liste.charger();
  }

  protected rechercher(texte: string): void {
    this.requete = texte;
    this.liste.recommencer();
  }

  protected changerType(valeur: string): void {
    this.type = valeur;
    this.liste.recommencer();
  }

  /** La barre a déjà vidé la recherche (et rechargé) : on ne recharge que si un type était choisi. */
  protected reinitialiser(): void {
    if (!this.type) return;
    this.type = '';
    this.liste.recommencer();
  }

  protected libelleType = (t?: string) => (t ? (TYPES[t] ?? t) : '—');
  protected libelleMode = (m?: string) => (m ? (MODES[m] ?? m) : '');
  protected libelleStatut = (s?: string) => (s ? (STATUTS[s] ?? s) : '—');
  protected tonStatut = (s?: string): TonBadge => (s === 'OPEN' ? 'ok' : 'neutre');
}
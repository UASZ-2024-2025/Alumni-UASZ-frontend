import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OffersService } from '../../../api/generes/offres-emploi/api/offers.service';
import { JobOffer } from '../../../api/generes/offres-emploi/model/jobOffer';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Badge, TonBadge } from '../../../commun/components/badge/badge';
import { Carte } from '../../../commun/components/carte/carte';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { MODES, STATUTS, TYPES } from '../offres-libelles';

/** Détail d'une offre (ALUM-156). Le bouton Postuler arrive au Sprint 3 avec ALUM-204. */
@Component({
  selector: 'app-detail-offre',
  imports: [DatePipe, RouterLink, Alerte, Badge, Carte, Spinner],
  templateUrl: './detail-offre.html',
  styles: `
    .retour { display: inline-block; margin-bottom: 12px; }
    .entreprise { color: var(--mu); margin: 0 0 16px; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; margin: 0; }
    dt { color: var(--mu); }
    dd { margin: 0; }
    .competences { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; margin: 0; list-style: none; }
  `,
})
export class DetailOffre {
  private readonly api = inject(OffersService);

  protected readonly offre = signal<JobOffer | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
    if (!id) {
      this.erreur.set('Cette offre est introuvable.');
      this.chargement.set(false);
      return;
    }
    this.api
      .getOfferById(id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (offre) => {
          this.offre.set(offre);
          this.chargement.set(false);
        },
        error: (e) => {
          this.erreur.set(messageErreur(e, { 404: 'Cette offre est introuvable.' }));
          this.chargement.set(false);
        },
      });
  }

  protected libelleType = (t?: string) => (t ? (TYPES[t] ?? t) : '—');
  protected libelleMode = (m?: string) => (m ? (MODES[m] ?? m) : '—');
  protected libelleStatut = (s?: string) => (s ? (STATUTS[s] ?? s) : '—');
  protected tonStatut = (s?: string): TonBadge => (s === 'OPEN' ? 'ok' : 'neutre');
}
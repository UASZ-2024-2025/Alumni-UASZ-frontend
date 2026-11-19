import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OffersService } from '../../../api/generes/offres-emploi/api/offers.service';
import { JobOffer } from '../../../api/generes/offres-emploi/model/jobOffer';
import { Application } from '../../../api/generes/offres-emploi/model/application';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Badge, TonBadge } from '../../../commun/components/badge/badge';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Carte } from '../../../commun/components/carte/carte';
import { Modale } from '../../../commun/components/modale/modale';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ToastService } from '../../../commun/services/toast.service';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { FormulaireCandidature, MESSAGE_DEJA_POSTULE } from '../composants/formulaire-candidature';
import { MODES, STATUTS, TYPES } from '../offres-libelles';

/** Détail d'une offre (ALUM-156) et candidature de l'étudiant connecté (ALUM-204). */
@Component({
  selector: 'app-detail-offre',
  imports: [DatePipe, RouterLink, Alerte, Badge, Bouton, Carte, FormulaireCandidature, Modale, Spinner],
  templateUrl: './detail-offre.html',
  styles: `
    .retour { display: inline-block; margin-bottom: 12px; }
    .entreprise { color: var(--mu); margin: 0 0 16px; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; margin: 0; }
    dt { color: var(--mu); }
    dd { margin: 0; }
    .competences { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; margin: 0; list-style: none; }
    .postuler { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 16px; }
    app-alerte { display: block; margin: 16px 0 0; }
  `,
})
export class DetailOffre {
  private readonly api = inject(OffersService);
  private readonly auth = inject(AuthentificationService);
  private readonly toast = inject(ToastService);

  protected readonly offre = signal<JobOffer | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  protected readonly etudiantId = computed(() =>
    this.auth.role() === 'ETUDIANT' ? (this.auth.utilisateur()?.id ?? null) : null,
  );
  /** Le bouton Postuler n'apparaît que pour un étudiant connecté, sur une offre ouverte. */
  protected readonly peutPostuler = computed(() => !!this.etudiantId() && this.offre()?.status === 'OPEN');
  protected readonly formulaireOuvert = signal(false);
  /** 'envoyee' après un 201, 'deja' après un 409 : le bouton Postuler disparaît. */
  protected readonly candidature = signal<'envoyee' | 'deja' | null>(null);
  protected readonly messageDejaPostule = MESSAGE_DEJA_POSTULE;

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

  protected candidatureEnvoyee(_: Application): void {
    this.formulaireOuvert.set(false);
    this.candidature.set('envoyee');
    this.toast.succes('Votre candidature a été envoyée.');
  }

  protected candidatureDejaFaite(): void {
    this.formulaireOuvert.set(false);
    this.candidature.set('deja');
  }

  protected libelleType = (t?: string) => (t ? (TYPES[t] ?? t) : '—');
  protected libelleMode = (m?: string) => (m ? (MODES[m] ?? m) : '—');
  protected libelleStatut = (s?: string) => (s ? (STATUTS[s] ?? s) : '—');
  protected tonStatut = (s?: string): TonBadge => (s === 'OPEN' ? 'ok' : 'neutre');
}
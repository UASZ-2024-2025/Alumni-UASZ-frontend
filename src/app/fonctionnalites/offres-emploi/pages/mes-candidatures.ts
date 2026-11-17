import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApplicationsService } from '../../../api/generes/offres-emploi/api/applications.service';
import { ProposalsService } from '../../../api/generes/offres-emploi/api/proposals.service';
import { ApplicationStatus } from '../../../api/generes/offres-emploi/model/applicationStatus';
import { Proposal } from '../../../api/generes/offres-emploi/model/proposal';
import { ProposalStatus } from '../../../api/generes/offres-emploi/model/proposalStatus';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Badge } from '../../../commun/components/badge/badge';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Carte } from '../../../commun/components/carte/carte';
import { Champ } from '../../../commun/components/champ/champ';
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { Onglet, Onglets } from '../../../commun/components/onglets/onglets';
import { Pagination } from '../../../commun/components/pagination/pagination';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ConfirmationService } from '../../../commun/services/confirmation.service';
import { ToastService } from '../../../commun/services/toast.service';
import { creerListePaginee } from '../../../commun/utilitaires/liste-paginee';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import {
  libelleCandidature,
  libelleProposition,
  OPTIONS_STATUT_CANDIDATURE,
  tonCandidature,
  tonProposition,
} from '../libelles';

const ERREURS_REPONSE: Record<number, string> = {
  403: "Cette proposition ne vous est pas adressée.",
  404: "Cette proposition n'existe plus.",
};

/** ALUM-175 : l'étudiant suit ses candidatures et répond aux propositions reçues. */
@Component({
  selector: 'app-mes-candidatures',
  imports: [DatePipe, FormsModule, Alerte, Badge, Bouton, Carte, Champ, EtatVide, Onglets, Pagination, Spinner],
  templateUrl: './mes-candidatures.html',
  styleUrl: '../offres-emploi.scss',
})
export class MesCandidatures {
  private readonly candidaturesApi = inject(ApplicationsService);
  private readonly propositionsApi = inject(ProposalsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly etudiantId = inject(AuthentificationService).utilisateur()?.id;

  protected readonly libelleCandidature = libelleCandidature;
  protected readonly tonCandidature = tonCandidature;
  protected readonly libelleProposition = libelleProposition;
  protected readonly tonProposition = tonProposition;
  protected readonly optionsStatut = OPTIONS_STATUT_CANDIDATURE;

  protected readonly onglet = signal('candidatures');

  // --- Candidatures ---
  protected choixStatut = '';
  private readonly statut = signal<ApplicationStatus | undefined>(undefined);
  protected readonly candidatures = creerListePaginee((page, taille) =>
    this.candidaturesApi.listMyApplications(this.etudiantId, this.statut(), page, taille),
  );

  // --- Propositions reçues ---
  protected readonly propositions = signal<Proposal[]>([]);
  protected readonly chargementPropositions = signal(false);
  protected readonly erreurPropositions = signal<string | null>(null);
  protected readonly enCours = signal<string | null>(null);
  /** Celles qui attendent une réponse d'abord, puis les plus récentes. */
  protected readonly propositionsTriees = computed(() =>
    [...this.propositions()].sort(
      (a, b) =>
        Number(b.status === 'PENDING') - Number(a.status === 'PENDING') ||
        (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
    ),
  );
  private readonly enAttente = computed(() => this.propositions().filter((p) => p.status === 'PENDING').length);

  protected readonly onglets = computed<Onglet[]>(() => [
    { cle: 'candidatures', libelle: 'Mes candidatures' },
    { cle: 'propositions', libelle: this.enAttente() ? `Propositions reçues (${this.enAttente()})` : 'Propositions reçues' },
  ]);

  constructor() {
    this.candidatures.charger();
    this.chargerPropositions();
  }

  protected filtrer(statut: string): void {
    this.statut.set((statut || undefined) as ApplicationStatus | undefined);
    this.candidatures.recommencer();
  }

  protected chargerPropositions(): void {
    this.chargementPropositions.set(true);
    this.erreurPropositions.set(null);
    this.propositionsApi.listProposals(this.etudiantId).subscribe({
      next: (liste) => {
        this.propositions.set(liste);
        this.chargementPropositions.set(false);
      },
      error: (e) => {
        this.erreurPropositions.set(messageErreur(e));
        this.chargementPropositions.set(false);
      },
    });
  }

  protected async repondre(p: Proposal, accepter: boolean): Promise<void> {
    if (!p.id) return;
    const offre = p.offerTitle ?? 'cette offre';
    const ok = await this.confirmation.demander(
      accepter
        ? {
            titre: 'Accepter la proposition',
            message: `Accepter la proposition « ${offre} » ? ${p.recruiterName ?? 'Le recruteur'} verra votre réponse.`,
            libelleConfirmer: 'Accepter',
          }
        : {
            titre: 'Refuser la proposition',
            message: `Refuser la proposition « ${offre} » ? Vous ne pourrez plus l'accepter ensuite.`,
            libelleConfirmer: 'Refuser',
            danger: true,
          },
    );
    if (!ok) return;

    const status: ProposalStatus = accepter ? 'ACCEPTED' : 'REJECTED';
    this.enCours.set(p.id);
    this.erreurPropositions.set(null);
    this.propositionsApi.updateProposalStatus(p.id, { status }).subscribe({
      next: (maj) => {
        this.enCours.set(null);
        this.propositions.update((l) => l.map((x) => (x.id === maj.id ? maj : x)));
        this.toast.succes(accepter ? `Proposition « ${offre} » acceptée.` : `Proposition « ${offre} » refusée.`);
      },
      error: (e) => {
        this.enCours.set(null);
        this.erreurPropositions.set(messageErreur(e, ERREURS_REPONSE));
      },
    });
  }
}

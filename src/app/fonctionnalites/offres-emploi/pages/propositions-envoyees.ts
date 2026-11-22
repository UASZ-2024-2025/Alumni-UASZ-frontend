import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProposalsService } from '../../../api/generes/offres-emploi/api/proposals.service';
import { Proposal } from '../../../api/generes/offres-emploi/model/proposal';
import { ProposalStatus } from '../../../api/generes/offres-emploi/model/proposalStatus';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Badge } from '../../../commun/components/badge/badge';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Carte } from '../../../commun/components/carte/carte';
import { Champ } from '../../../commun/components/champ/champ';
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ColonneTableau, Tableau } from '../../../commun/components/tableau/tableau';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { libelleProposition, OPTIONS_STATUT_PROPOSITION, tonProposition } from '../libelles';
import { EntetePage } from '../../../commun/components/entete-page/entete-page';

/** ALUM-175 : le recruteur (Alumni ou Entreprise) suit les propositions envoyées et la réponse des étudiants. */
@Component({
  selector: 'app-propositions-envoyees',
  imports: [DatePipe, FormsModule, Alerte, Badge, Bouton, Carte, Champ, EtatVide, Spinner, Tableau, EntetePage],
  templateUrl: './propositions-envoyees.html',
  styleUrl: '../offres-emploi.scss',
})
export class PropositionsEnvoyees {
  private readonly api = inject(ProposalsService);
  private readonly recruteurId = inject(AuthentificationService).utilisateur()?.id;

  protected readonly libelleProposition = libelleProposition;
  protected readonly tonProposition = tonProposition;
  protected readonly optionsStatut = OPTIONS_STATUT_PROPOSITION;
  protected readonly colonnes: ColonneTableau[] = [
    { cle: 'etudiant', libelle: 'Étudiant' },
    { cle: 'offre', libelle: 'Offre' },
    { cle: 'date', libelle: 'Envoyée le' },
    { cle: 'statut', libelle: 'Réponse' },
  ];

  protected choixStatut = '';
  private readonly statut = signal<ProposalStatus | undefined>(undefined);
  protected readonly propositions = signal<Proposal[]>([]);
  protected readonly chargement = signal(false);
  protected readonly erreur = signal<string | null>(null);

  constructor() {
    this.charger();
  }

  /** Appelé depuis (ngModelChange), qui part avant la mise à jour de `choixStatut` : on reçoit la valeur. */
  protected filtrer(statut: string): void {
    this.statut.set((statut || undefined) as ProposalStatus | undefined);
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.api.listProposals(undefined, this.recruteurId, this.statut()).subscribe({
      next: (liste) => {
        this.propositions.set(liste);
        this.chargement.set(false);
      },
      error: (e) => {
        this.erreur.set(messageErreur(e));
        this.chargement.set(false);
      },
    });
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatchingsService } from '../../../api/generes/analyses-correspondances/api/matchings.service';
import { CandidateMatchResult } from '../../../api/generes/analyses-correspondances/model/candidateMatchResult';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { BarreScore } from '../../../commun/components/barre-score/barre-score';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Carte } from '../../../commun/components/carte/carte';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { EntetePage } from '../../../commun/components/entete-page/entete-page';
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { PucesCompetences } from '../../../commun/components/puces-competences/puces-competences';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { OffresEntrepriseService } from '../services/offres-entreprise.service';

const ERREURS: Record<number, string> = {
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: "Accès refusé : seul l'auteur de l'offre peut voir les candidats suggérés.",
  404: "Cette offre n'existe pas ou n'existe plus.",
};

const SCORES_MINIMUM: OptionChamp[] = [
  { valeur: '0', libelle: 'Tous les scores' },
  { valeur: '60', libelle: '60 % et plus' },
  { valeur: '75', libelle: '75 % et plus' },
  { valeur: '90', libelle: '90 % et plus' },
];

/** ALUM-186 : « Candidats suggérés » pour une offre, avec le score et les compétences en commun. */
@Component({
  selector: 'app-candidats-suggeres',
  imports: [FormsModule, Alerte, BarreScore, Bouton, Carte, Champ, EntetePage, EtatVide, PucesCompetences, Spinner],
  templateUrl: './candidats-suggeres.html',
  styleUrl: '../offres-emploi.scss',
})
export class CandidatsSuggeres implements OnInit {
  private readonly api = inject(MatchingsService);
  private readonly offresService = inject(OffresEntrepriseService);
  private readonly offreId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly optionsScore = SCORES_MINIMUM;
  protected scoreMin = '60';
  protected readonly titreOffre = signal<string | null>(null);
  protected readonly candidats = signal<CandidateMatchResult[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  ngOnInit(): void {
    this.charger();
    this.offresService.offre(this.offreId).subscribe({
      next: (o) => this.titreOffre.set(o.title ?? null),
      error: () => undefined, // le titre est facultatif : l'erreur utile est montrée par la liste
    });
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.api.getMatchingCandidatesForOffer(this.offreId, Number(this.scoreMin)).subscribe({
      next: (liste) => {
        this.candidats.set([...(liste ?? [])].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)));
        this.chargement.set(false);
      },
      error: (e) => {
        this.candidats.set([]);
        this.chargement.set(false);
        this.erreur.set(messageErreur(e, ERREURS));
      },
    });
  }
}

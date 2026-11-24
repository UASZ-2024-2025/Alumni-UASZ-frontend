import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatchingsService } from '../../../api/generes/analyses-correspondances/api/matchings.service';
import { OfferMatchResult } from '../../../api/generes/analyses-correspondances/model/offerMatchResult';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { BarreScore } from '../../../commun/components/barre-score/barre-score';
import { Carte } from '../../../commun/components/carte/carte';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { EntetePage } from '../../../commun/components/entete-page/entete-page';
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { PucesCompetences } from '../../../commun/components/puces-competences/puces-competences';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';

const ERREURS: Record<number, string> = {
  401: 'Votre session a expiré. Reconnectez-vous.',
  404: "Votre profil étudiant est introuvable : complétez-le pour recevoir des recommandations.",
};

export const SCORES_MINIMUM: OptionChamp[] = [
  { valeur: '0', libelle: 'Tous les scores' },
  { valeur: '50', libelle: '50 % et plus' },
  { valeur: '70', libelle: '70 % et plus' },
  { valeur: '85', libelle: '85 % et plus' },
];

/** ALUM-186 : « Offres recommandées pour vous », avec le score et les compétences manquantes de chaque offre. */
@Component({
  selector: 'app-offres-recommandees',
  imports: [FormsModule, RouterLink, Alerte, BarreScore, Carte, Champ, EntetePage, EtatVide, PucesCompetences, Spinner],
  templateUrl: './offres-recommandees.html',
  styleUrl: '../offres-emploi.scss',
})
export class OffresRecommandees implements OnInit {
  private readonly api = inject(MatchingsService);
  private readonly etudiantId = inject(AuthentificationService).utilisateur()?.id ?? '';

  protected readonly optionsScore = SCORES_MINIMUM;
  protected scoreMin = '50';
  protected readonly offres = signal<OfferMatchResult[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.api.getMatchingOffersForStudent(this.etudiantId, Number(this.scoreMin)).subscribe({
      next: (liste) => {
        // Les offres les plus adaptées d'abord
        this.offres.set([...(liste ?? [])].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)));
        this.chargement.set(false);
      },
      error: (e) => {
        this.offres.set([]);
        this.chargement.set(false);
        this.erreur.set(messageErreur(e, ERREURS));
      },
    });
  }
}

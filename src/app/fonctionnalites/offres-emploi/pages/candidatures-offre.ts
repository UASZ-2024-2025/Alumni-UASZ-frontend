import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Application } from '../../../api/generes/offres-emploi/model/application';
import { ApplicationStatus } from '../../../api/generes/offres-emploi/model/applicationStatus';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Badge } from '../../../commun/components/badge/badge';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Carte } from '../../../commun/components/carte/carte';
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { Modale } from '../../../commun/components/modale/modale';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ColonneTableau, Tableau } from '../../../commun/components/tableau/tableau';
import { ConfirmationService } from '../../../commun/services/confirmation.service';
import { ToastService } from '../../../commun/services/toast.service';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import {
  libelleCandidature,
  tonCandidature,
  TRANSITIONS_CANDIDATURE,
} from '../libelles';
import { OffresEntrepriseService } from '../services/offres-entreprise.service';
import { EntetePage } from '../../../commun/components/entete-page/entete-page';
import { DossierCandidature } from '../composants/dossier-candidature';

const ERREURS_LISTE: Record<number, string> = {
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: "Accès refusé : seul l'auteur de l'offre peut consulter ses candidatures.",
  404: "Cette offre n'existe pas ou n'existe plus.",
};

const ERREURS_STATUT: Record<number, string> = {
  400: "Ce changement de statut n'est pas autorisé depuis le statut actuel.",
  403: "Accès refusé : seul l'auteur de l'offre peut traiter ses candidatures.",
  404: "Cette candidature n'existe plus.",
};

/**
 * ALUM-208 : le recruteur voit les candidatures reçues sur une de ses offres et en change le statut.
 * L'étudiant retrouve le nouveau statut dans « Mes candidatures » (ALUM-175).
 * ALUM-259 : « Voir le dossier » ouvre la lettre de motivation et l'aperçu du CV du candidat.
 */
@Component({
  selector: 'app-candidatures-offre',
  imports: [DatePipe, FormsModule, Alerte, Badge, Bouton, Carte, Champ, DossierCandidature, EtatVide, Modale, Spinner, Tableau, EntetePage],
  templateUrl: './candidatures-offre.html',
  styleUrl: '../offres-emploi.scss',
})
export class CandidaturesOffre implements OnInit {
  private readonly service = inject(OffresEntrepriseService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly offreId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly libelleCandidature = libelleCandidature;
  protected readonly tonCandidature = tonCandidature;

  protected readonly colonnes: ColonneTableau[] = [
    { cle: 'etudiant', libelle: 'Étudiant' },
    { cle: 'date', libelle: 'Reçue le' },
    { cle: 'dossier', libelle: 'Dossier' },
    { cle: 'statut', libelle: 'Statut' },
    { cle: 'action', libelle: 'Changer le statut' },
  ];
  /** Statut choisi dans la liste de chaque ligne, par id de candidature. */
  protected readonly choix = signal<Partial<Record<string, string>>>({});

  protected readonly titreOffre = signal<string | null>(null);
  protected readonly candidatures = signal<Application[]>([]);
  protected readonly chargement = signal(true);
  /** Erreur de chargement (dont le refus 403) : aucune candidature n'est alors affichée. */
  protected readonly erreur = signal<string | null>(null);
  /** Erreur d'un changement de statut : la liste reste affichée. */
  protected readonly erreurStatut = signal<string | null>(null);
  protected readonly enCours = signal<string | null>(null);
  /** Candidature dont le dossier (lettre et CV) est ouvert. */
  protected readonly dossier = signal<Application | null>(null);

  ngOnInit(): void {
    this.charger();
    this.service.offre(this.offreId).subscribe({
      next: (o) => this.titreOffre.set(o.title ?? null),
      error: () => undefined, // le titre est facultatif : le refus ou l'erreur est déjà montré par la liste
    });
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.service.candidaturesRecues(this.offreId).subscribe({
      next: (liste) => {
        this.candidatures.set(liste ?? []);
        this.chargement.set(false);
        this.titreOffre.update((t) => t ?? liste?.[0]?.offerTitle ?? null);
      },
      error: (e) => {
        this.candidatures.set([]);
        this.chargement.set(false);
        this.erreur.set(messageErreur(e, ERREURS_LISTE));
      },
    });
  }

  /** Statuts proposés au recruteur depuis le statut actuel (aucun si la décision est finale). */
  protected suivants(c: Application): ApplicationStatus[] {
    return c.status ? TRANSITIONS_CANDIDATURE[c.status] : [];
  }

  protected optionsSuivants(c: Application): OptionChamp[] {
    return [{ valeur: '', libelle: 'Choisir…' }, ...this.suivants(c).map((s) => ({ valeur: s, libelle: libelleCandidature(s) }))];
  }

  protected choisir(id: string | undefined, valeur: string): void {
    if (id) this.choix.update((c) => ({ ...c, [id]: valeur }));
  }

  protected async changer(c: Application, valeur: string): Promise<void> {
    const status = this.suivants(c).find((s) => s === valeur);
    if (!c.id || !status) return;

    const etudiant = c.studentName ?? 'cet étudiant';
    if (status === 'REJECTED') {
      const ok = await this.confirmation.demander({
        titre: 'Refuser la candidature',
        message: `Refuser la candidature de ${etudiant} ? Il en sera informé et vous ne pourrez plus changer ce statut.`,
        libelleConfirmer: 'Refuser',
        danger: true,
      });
      if (!ok) return;
    }

    this.enCours.set(c.id);
    this.erreurStatut.set(null);
    this.service.changerStatut(c.id, status).subscribe({
      next: (maj) => {
        this.enCours.set(null);
        this.candidatures.update((l) => l.map((x) => (x.id === maj.id ? maj : x)));
        if (this.dossier()?.id === maj.id) this.dossier.set(maj);
        this.toast.succes(`Candidature de ${etudiant} : ${libelleCandidature(maj.status).toLowerCase()}.`);
      },
      error: (e) => {
        this.enCours.set(null);
        this.erreurStatut.set(messageErreur(e, ERREURS_STATUT));
      },
    });
  }
}

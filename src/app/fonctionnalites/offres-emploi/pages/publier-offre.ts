import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout, TimeoutError } from 'rxjs';
import { OfferType, RemoteType } from '../../../api/generes/offres-emploi';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Carte } from '../../../commun/components/carte/carte';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { PucesCompetences } from '../../../commun/components/puces-competences/puces-competences';
import { ToastService } from '../../../commun/services/toast.service';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { NouvelleOffre, OffresEntrepriseService } from '../services/offres-entreprise.service';

/** Au-delà, on considère que le serveur ne répond pas (évite un bouton bloqué indéfiniment). */
const DELAI_MS = 20_000;

const MESSAGE_SERVEUR = "Le serveur a rencontré un problème. Réessayez dans un instant ou contactez l'équipe.";
const MESSAGES_PUBLICATION: Record<number, string> = {
  400: 'Certaines informations sont invalides. Vérifiez les champs.',
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: "Votre entreprise n'est pas encore validée : vous ne pouvez pas publier d'offre.",
  404: 'Entreprise introuvable.',
  500: MESSAGE_SERVEUR,
  502: MESSAGE_SERVEUR,
  503: MESSAGE_SERVEUR,
  504: MESSAGE_SERVEUR,
};

/** Libellés affichés pour lister les champs à corriger. */
const LIBELLES_CHAMPS: Record<string, string> = {
  title: 'Intitulé du poste',
  type: "Type d'offre",
  location: 'Lieu',
  description: 'Description',
  requiredSkills: 'Compétences requises',
  durationMonths: 'Durée (en mois)',
};

@Component({
  selector: 'app-publier-offre',
  imports: [ReactiveFormsModule, RouterLink, Alerte, Bouton, Carte, Champ, PucesCompetences],
  template: `
    <app-carte titre="Publier une offre">
      <form [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
        @if (erreur()) { <app-alerte>{{ erreur() }}</app-alerte> }

        <app-champ libelle="Intitulé du poste" [requis]="true" formControlName="title"
          [erreur]="erreurDe(formulaire.controls.title, 'L\\'intitulé est obligatoire.')" />

        <div class="deux-colonnes">
          <app-champ libelle="Type d'offre" type="select" [options]="types" formControlName="type" />
          <app-champ libelle="Mode de travail" type="select" [options]="modes" formControlName="remoteType" />
        </div>

        <app-champ libelle="Lieu" [requis]="true" placeholder="Ex. Ziguinchor, Dakar, Remote" formControlName="location"
          [erreur]="erreurDe(formulaire.controls.location, 'Le lieu est obligatoire.')" />

        <app-champ libelle="Description" type="textarea" [lignes]="6" [requis]="true" formControlName="description"
          [erreur]="erreurDe(formulaire.controls.description, 'La description est obligatoire.')" />

        <app-puces-competences libelle="Compétences requises" formControlName="requiredSkills"
          (focusout)="ajouterSaisieEnCours()" />
        <small class="aide">Tapez une compétence : elle est ajoutée dès que vous passez au champ suivant (ou avec Entrée).</small>
        @if (formulaire.controls.requiredSkills.touched && formulaire.controls.requiredSkills.invalid) {
          <small class="invalide">Ajoutez au moins une compétence.</small>
        }

        <div class="deux-colonnes">
          @if (estStage()) {
            <app-champ libelle="Durée (en mois)" type="number" formControlName="durationMonths"
              [erreur]="erreurDe(formulaire.controls.durationMonths, 'Saisissez un nombre de mois valide.')" />
          }
          <app-champ libelle="Fourchette salariale" placeholder="Ex. 150 000 – 200 000 FCFA" formControlName="salaryRange" />
          <app-champ libelle="Date limite de candidature" type="date" formControlName="deadline" />
        </div>

        <div class="actions">
          <app-bouton type="submit" [chargement]="chargement()">Publier l'offre</app-bouton>
          <a class="btn btn--secondaire btn--auto" routerLink="/offres-emploi/mes-offres">Annuler</a>
        </div>
      </form>
    </app-carte>
  `,
  styles: `
    form { display: grid; gap: 1rem; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .aide { color: var(--g8, #555); }
  `,
})
export class PublierOffre {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly offres = inject(OffresEntrepriseService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly puces = viewChild(PucesCompetences, { read: ElementRef });

  protected readonly types: OptionChamp[] = [
    { valeur: OfferType.Job, libelle: 'Emploi' },
    { valeur: OfferType.Internship, libelle: 'Stage' },
  ];
  protected readonly modes: OptionChamp[] = [
    { valeur: '', libelle: 'Non précisé' },
    { valeur: RemoteType.OnSite, libelle: 'Sur site' },
    { valeur: RemoteType.Hybrid, libelle: 'Hybride' },
    { valeur: RemoteType.Remote, libelle: 'À distance' },
  ];

  protected readonly formulaire = this.fb.group({
    title: ['', Validators.required],
    type: [OfferType.Job as string, Validators.required],
    remoteType: [''],
    location: ['', Validators.required],
    description: ['', Validators.required],
    requiredSkills: [[] as string[], Validators.required],
    durationMonths: ['', Validators.pattern(/^[1-9]\d*$/)],
    salaryRange: [''],
    deadline: [''],
  });
  protected readonly erreur = signal<string | null>(null);
  protected readonly chargement = signal(false);

  constructor() {
    // La durée n'existe que pour un stage. Désactivée sinon : un champ caché ne doit jamais bloquer l'envoi.
    const duree = this.formulaire.controls.durationMonths;
    duree.disable();
    this.formulaire.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      if (type === OfferType.Internship) {
        duree.enable();
      } else {
        duree.reset('');
        duree.disable();
      }
    });
  }

  protected estStage(): boolean {
    return this.formulaire.controls.type.value === OfferType.Internship;
  }

  protected erreurDe(controle: AbstractControl, message: string): string | null {
    return controle.touched && controle.invalid ? message : null;
  }

  /**
   * Sur mobile, la touche Entrée n'est pas fiable : une compétence tapée mais non validée
   * est ajoutée dès qu'on quitte le champ (et juste avant l'envoi).
   */
  protected ajouterSaisieEnCours(): void {
    const champ = this.puces()?.nativeElement.querySelector('input') as HTMLInputElement | null;
    const texte = champ?.value.trim();
    if (!champ || !texte) return;

    const controle = this.formulaire.controls.requiredSkills;
    const dejaPresente = controle.value.some((c) => c.toLowerCase() === texte.toLowerCase());
    if (!dejaPresente) controle.setValue([...controle.value, texte]);
    controle.markAsTouched();

    champ.value = '';
    champ.dispatchEvent(new Event('input'));
  }

  protected soumettre(): void {
    if (this.chargement()) return;
    this.ajouterSaisieEnCours();

    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      this.erreur.set(`Le formulaire est incomplet. À corriger : ${this.champsInvalides().join(', ')}.`);
      return;
    }

    this.erreur.set(null);
    this.chargement.set(true);

    try {
      const v = this.formulaire.getRawValue();
      const offre: NouvelleOffre = {
        title: v.title.trim(),
        type: v.type as OfferType,
        description: v.description.trim(),
        location: v.location.trim(),
        requiredSkills: v.requiredSkills,
        remoteType: (v.remoteType || undefined) as RemoteType | undefined,
        durationMonths: this.estStage() && v.durationMonths ? Number(v.durationMonths) : undefined,
        salaryRange: v.salaryRange.trim() || undefined,
        deadline: v.deadline || undefined,
      };

      this.offres
        .publier(offre)
        .pipe(
          timeout(DELAI_MS),
          finalize(() => this.chargement.set(false)),
        )
        .subscribe({
          next: () => {
            this.toasts.succes('Votre offre a bien été publiée.');
            this.router.navigate(['/offres-emploi/mes-offres']);
          },
          error: (e: unknown) =>
            this.erreur.set(
              e instanceof TimeoutError
                ? 'Le serveur met trop de temps à répondre. Réessayez dans un instant.'
                : messageErreur(e, MESSAGES_PUBLICATION),
            ),
        });
    } catch {
      this.chargement.set(false);
      this.erreur.set("Impossible d'envoyer l'offre. Réessayez.");
    }
  }

  private champsInvalides(): string[] {
    return Object.entries(this.formulaire.controls)
      .filter(([, controle]) => controle.invalid)
      .map(([nom]) => LIBELLES_CHAMPS[nom] ?? nom);
  }
}